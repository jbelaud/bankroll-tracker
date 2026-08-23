import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { Prisma, ReferralRewardType } from "@prisma/client";
import {
  BETA_REFERRAL_CONFIG,
  REFERRAL_CONTEXT_COOKIE,
  REFERRAL_CONTEXT_MAX_AGE_SECONDS,
} from "./config";
import { prisma } from "@/lib/prisma";

type ReferralContext = {
  code: string;
  startedAt: number;
};

type RewardGrant = {
  beneficiaryId: string;
  amount: number;
  type: ReferralRewardType;
};

function referralContextSecret(): string {
  const secret =
    process.env.REFERRAL_CONTEXT_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.DATABASE_URL;
  if (!secret) throw new Error("Une clé serveur est requise pour sécuriser le parrainage.");
  return secret;
}

function signContext(encodedPayload: string): string {
  return createHmac("sha256", referralContextSecret()).update(encodedPayload).digest("base64url");
}

export function normalizeReferralCode(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9]{16,64}$/.test(code) ? code : null;
}

export async function storeReferralContext(codeInput: string | null | undefined): Promise<void> {
  const code = normalizeReferralCode(codeInput);
  const cookieStore = await cookies();
  if (!code || !BETA_REFERRAL_CONFIG.enabled) {
    cookieStore.delete(REFERRAL_CONTEXT_COOKIE);
    return;
  }

  const payload = Buffer.from(JSON.stringify({ code, startedAt: Date.now() })).toString("base64url");
  const value = `${payload}.${signContext(payload)}`;
  cookieStore.set(REFERRAL_CONTEXT_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_CONTEXT_MAX_AGE_SECONDS,
  });
}

async function readReferralContext(): Promise<ReferralContext | null> {
  const raw = (await cookies()).get(REFERRAL_CONTEXT_COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = signContext(payload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ReferralContext;
    const code = normalizeReferralCode(value.code);
    const age = Date.now() - value.startedAt;
    if (!code || !Number.isFinite(value.startedAt) || age < 0 || age > REFERRAL_CONTEXT_MAX_AGE_SECONDS * 1000) {
      return null;
    }
    return { code, startedAt: value.startedAt };
  } catch {
    return null;
  }
}

async function clearReferralContext(): Promise<void> {
  (await cookies()).delete(REFERRAL_CONTEXT_COOKIE);
}

/**
 * Attache le parrainage uniquement au compte venant d'être créé dans le même
 * parcours d'inscription. Le bornage temporel signé interdit toute attribution
 * rétroactive depuis une session ou une URL manipulée.
 */
export async function attachStoredReferralToNewUser(userId: string): Promise<boolean> {
  const context = await readReferralContext();
  await clearReferralContext();
  if (!context || !BETA_REFERRAL_CONFIG.enabled) return false;

  const startedAt = new Date(context.startedAt - 1_000);
  return prisma.$transaction(async (tx) => {
    const referredUser = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, createdAt: true },
    });
    // Le profil doit avoir été créé après le début signé de l'inscription.
    if (!referredUser || referredUser.createdAt < startedAt) return false;

    const referrer = await tx.user.findFirst({
      where: { referralCode: context.code, id: { not: userId } },
      select: { id: true },
    });
    if (!referrer) return false;

    try {
      await tx.referral.create({
        data: { referrerId: referrer.id, referredUserId: userId },
      });
      return true;
    } catch (error) {
      // La contrainte unique referredUserId garantit un seul parrain, même si
      // le callback est rejoué par le fournisseur d'identité.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  });
}

async function grantReward(
  tx: Prisma.TransactionClient,
  referralId: string,
  beneficiaryId: string,
  amount: number,
  type: ReferralRewardType
): Promise<RewardGrant> {
  await tx.referralReward.create({
    data: {
      referralId,
      beneficiaryId,
      amount,
      type,
      triggerKey: `${referralId}:${type}`,
    },
  });
  await tx.user.update({
    where: { id: beneficiaryId },
    data: { referralScanCredits: { increment: amount } },
  });
  return { beneficiaryId, amount, type };
}

/** Processes exactly one successful OCR scan. Replaying the same scan is a no-op. */
export async function processValidReferralScan(userId: string, scanUsageId: string): Promise<{
  earnedReferralScans: number;
  grants: RewardGrant[];
}> {
  if (!BETA_REFERRAL_CONFIG.enabled) return { earnedReferralScans: 0, grants: [] };

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.scanUsage.updateMany({
      where: {
        id: scanUsageId,
        userId,
        referralEligible: true,
        referralProcessedAt: null,
      },
      data: { referralProcessedAt: now },
    });
    if (claimed.count !== 1) return { earnedReferralScans: 0, grants: [] };

    const referral = await tx.referral.findUnique({
      where: { referredUserId: userId },
      select: {
        id: true,
        referrerId: true,
        validScanCount: true,
        suspiciousAt: true,
      },
    });
    if (!referral || referral.suspiciousAt) return { earnedReferralScans: 0, grants: [] };

    const updated = await tx.referral.update({
      where: { id: referral.id },
      data: {
        validScanCount: { increment: 1 },
        ...(referral.validScanCount === 0 ? { firstValidScanAt: now } : {}),
        ...(referral.validScanCount + 1 === BETA_REFERRAL_CONFIG.secondRewardRequiredValidScans
          ? { fifthValidScanAt: now }
          : {}),
      },
      select: { validScanCount: true },
    });

    const grants: RewardGrant[] = [];
    if (updated.validScanCount === 1) {
      grants.push(
        await grantReward(
          tx,
          referral.id,
          userId,
          BETA_REFERRAL_CONFIG.referredUserFirstValidScanReward,
          "REFEREE_FIRST_VALID_SCAN"
        ),
        await grantReward(
          tx,
          referral.id,
          referral.referrerId,
          BETA_REFERRAL_CONFIG.referrerFirstValidScanReward,
          "REFERRER_FIRST_VALID_SCAN"
        )
      );
    }
    if (updated.validScanCount === BETA_REFERRAL_CONFIG.secondRewardRequiredValidScans) {
      grants.push(
        await grantReward(
          tx,
          referral.id,
          referral.referrerId,
          BETA_REFERRAL_CONFIG.referrerFifthValidScanReward,
          "REFERRER_FIFTH_VALID_SCAN"
        )
      );
    }

    return {
      earnedReferralScans: grants
        .filter((grant) => grant.beneficiaryId === userId)
        .reduce((sum, grant) => sum + grant.amount, 0),
      grants,
    };
  });
}
