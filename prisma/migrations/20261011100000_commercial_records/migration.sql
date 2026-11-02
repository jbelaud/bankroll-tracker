-- Existing profiles receive a full inactivity grace period from this migration.
ALTER TABLE users ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN "inactivityNoticeAt" TIMESTAMP(3);
ALTER TABLE feedbacks ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE feedbacks ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false;
UPDATE feedbacks SET "closedAt" = CURRENT_TIMESTAMP WHERE status = 'CLOSED';

-- These archives deliberately do not cascade from the personal profile.
CREATE TABLE billing_contracts (
  id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "customerId" TEXT NOT NULL,
  email TEXT NOT NULL, name TEXT NOT NULL, locale TEXT NOT NULL,
  "billingInterval" TEXT NOT NULL, "termsVersion" TEXT NOT NULL, "termsText" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL, "paidAt" TIMESTAMP(3) NOT NULL,
  "withdrawalDeadline" TIMESTAMP(3) NOT NULL, "firstInvoiceId" TEXT NOT NULL,
  "firstAmountPaid" INTEGER NOT NULL, currency TEXT NOT NULL, "periodEnd" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3), "cancellationFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_contracts_user_idx ON billing_contracts("userId");
CREATE TABLE billing_invoices (
  id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL, "retainUntil" TIMESTAMP(3) NOT NULL, snapshot JSONB NOT NULL,
  "pdfContent" BYTEA, "creditNotePdfContent" BYTEA
);
CREATE INDEX billing_invoices_retention_idx ON billing_invoices("retainUntil");
CREATE TABLE withdrawal_requests (
  id TEXT PRIMARY KEY, "subscriptionId" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL,
  name TEXT NOT NULL, email TEXT NOT NULL, declaration TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eligible BOOLEAN NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
  "refundId" TEXT, "creditNoteId" TEXT, "refundAmount" INTEGER, "processedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3), "lockToken" TEXT
);
CREATE INDEX withdrawal_requests_retry_idx ON withdrawal_requests(status, "nextAttemptAt");
CREATE TABLE transactional_emails (
  id TEXT PRIMARY KEY, "dedupeKey" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL,
  kind TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, text TEXT NOT NULL, html TEXT,
  attachments JSONB, status TEXT NOT NULL DEFAULT 'PENDING', sender TEXT,
  "providerId" TEXT, "firstAttemptAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3), "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT, "lockedUntil" TIMESTAMP(3), "lockToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX transactional_emails_retry_idx ON transactional_emails(status, "nextAttemptAt");

-- Service connections only: no private archive is exposed through a public Data API.
ALTER TABLE billing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactional_emails ENABLE ROW LEVEL SECURITY;
