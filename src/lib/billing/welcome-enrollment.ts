import "server-only";
import { prisma } from "@/lib/prisma";
import { isListedBetaTester, isWelcomeOfferOpen, WELCOME_OFFER_LIMIT } from "./welcome-offer";

/** Enrol at profile creation, never when a public offer link is opened. */
export async function createWelcomeProfile(user: { id: string; email: string; name: string | null }) {
  return prisma.$transaction(async (tx) => {
    await tx.betaProgram.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
    // Serialise registrations so simultaneous signups cannot claim a 16th place.
    await tx.$queryRaw`SELECT id FROM beta_program WHERE id = 'global' FOR UPDATE`;
    const existing = await tx.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (existing) return tx.user.update({ where: { id: user.id }, data: { email: user.email } });
    const program = await tx.betaProgram.findUniqueOrThrow({ where: { id: "global" } });
    const beta = program.phase !== "ENDED" || isListedBetaTester(user.email);
    const admin = (process.env.ADMIN_EMAILS ?? "").split(",")
      .some((value) => value.trim().toLowerCase() === user.email.trim().toLowerCase());
    const position = !beta && !admin && isWelcomeOfferOpen() && program.earlyWelcomeCount < WELCOME_OFFER_LIMIT
      ? program.earlyWelcomeCount + 1 : null;
    const profile = await tx.user.create({ data: {
      ...user, plan: program.phase !== "ENDED" ? "BETA_TESTER" : "FREE",
      referralCode: user.id.replaceAll("-", "").toUpperCase(),
      betaWelcomeEligible: beta, earlyWelcomePosition: position,
    } });
    if (position !== null) await tx.betaProgram.update({ where: { id: "global" }, data: { earlyWelcomeCount: position } });
    return profile;
  }, { maxWait: 10_000, timeout: 10_000 });
}
