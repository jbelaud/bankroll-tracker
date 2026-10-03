export type ClaimStatus = "PENDING" | "NEEDS_INFO" | "APPROVED" | "REJECTED";
export type RewardEmailStatus = "PENDING" | "SENT" | "FAILED" | "NEEDS_REVIEW";

export type MemberPartnerClaim = {
  id: string;
  partnerId: string;
  partnerName: string;
  status: ClaimStatus;
  revision: number;
  bookmakerUsername: string;
  registrationDate: string;
  memberNote: string | null;
  reviewMessage: string | null;
  rewardQuantity: number;
  createdAt: string;
};

export type AdminPartnerClaim = MemberPartnerClaim & {
  memberEmail: string;
  memberName: string | null;
  reviewedAt: string | null;
  emailStatus: RewardEmailStatus | null;
  events: { id: string; status: ClaimStatus; message: string | null; createdAt: string }[];
};

export type ClaimErrorCode = "invalidForm" | "offerUnavailable" | "alreadySubmitted" | "alreadyRewarded" | "staleRequest" | "notFound" | "actionFailed";
export type ClaimActionResult = { ok: true } | { ok: false; error: ClaimErrorCode };
