import type { ClaimErrorCode } from "./claims-types";

export class ClaimError extends Error {
  constructor(public readonly code: ClaimErrorCode) { super(code); }
}

function text(value: unknown, min: number, max: number): string {
  if (typeof value !== "string") throw new ClaimError("invalidForm");
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(trimmed)) throw new ClaimError("invalidForm");
  return trimmed;
}

export function parseClaimSubmission(form: FormData, now = new Date()) {
  const partnerId = text(form.get("partnerId"), 1, 100);
  const claimId = form.get("claimId") ? text(form.get("claimId"), 1, 100) : undefined;
  const bookmakerUsername = text(form.get("bookmakerUsername"), 2, 80);
  const registration = text(form.get("registrationDate"), 10, 10);
  const registrationDate = new Date(`${registration}T00:00:00.000Z`);
  const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Paris" }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(registration) || !Number.isFinite(registrationDate.getTime()) || registrationDate.toISOString().slice(0, 10) !== registration || registration > today) throw new ClaimError("invalidForm");
  if (form.get("confirmed") !== "on") throw new ClaimError("invalidForm");
  const memberNote = text(form.get("memberNote") ?? "", 0, 500) || null;
  const revision = claimId ? Number(form.get("revision")) : undefined;
  if (claimId && (!Number.isSafeInteger(revision) || revision! < 1)) throw new ClaimError("invalidForm");
  return { partnerId, claimId, bookmakerUsername, registrationDate, memberNote, revision };
}

export function parseClaimReview(form: FormData) {
  const claimId = text(form.get("claimId"), 1, 100);
  const revision = Number(form.get("revision"));
  const decision = form.get("decision");
  if (!Number.isSafeInteger(revision) || revision < 1 || !["APPROVED", "NEEDS_INFO", "REJECTED"].includes(String(decision))) throw new ClaimError("invalidForm");
  const reviewMessage = text(form.get("reviewMessage") ?? "", decision === "APPROVED" ? 0 : 3, 1000) || null;
  return { claimId, revision, decision: decision as "APPROVED" | "NEEDS_INFO" | "REJECTED", reviewMessage };
}
