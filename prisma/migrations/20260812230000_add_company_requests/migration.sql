CREATE TYPE "CompanyRequestStatus" AS ENUM ('PENDING');

CREATE TABLE "CompanyRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "status" "CompanyRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompanyRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyRequest_normalizedName_key" ON "CompanyRequest"("normalizedName");
CREATE INDEX "CompanyRequest_status_createdAt_idx" ON "CompanyRequest"("status", "createdAt");
CREATE INDEX "CompanyRequest_userId_createdAt_idx" ON "CompanyRequest"("userId", "createdAt");

ALTER TABLE "CompanyRequest"
  ADD CONSTRAINT "CompanyRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
