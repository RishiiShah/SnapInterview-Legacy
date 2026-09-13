ALTER TABLE "InterviewPlan"
ADD COLUMN "targetCompany" TEXT,
ADD COLUMN "targetCompanyKey" TEXT,
ADD COLUMN "targetRole" TEXT,
ADD COLUMN "targetRoleSlug" TEXT,
ADD COLUMN "targetRoleFamily" TEXT,
ADD COLUMN "targetLevel" TEXT,
ADD COLUMN "interviewDate" TIMESTAMP(3),
ADD COLUMN "jobDescription" TEXT,
ADD COLUMN "blueprintKey" TEXT,
ADD COLUMN "blueprintVersion" INTEGER,
ADD COLUMN "blueprintReviewedAt" TIMESTAMP(3),
ADD COLUMN "blueprintResolution" TEXT,
ADD COLUMN "customizedFromBlueprint" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InterviewPlan"
ADD CONSTRAINT "InterviewPlan_targetLevel_valid"
CHECK ("targetLevel" IS NULL OR "targetLevel" IN ('entry-level', 'mid-level', 'senior', 'staff-plus')),
ADD CONSTRAINT "InterviewPlan_blueprintVersion_valid"
CHECK ("blueprintVersion" IS NULL OR "blueprintVersion" > 0),
ADD CONSTRAINT "InterviewPlan_blueprintResolution_valid"
CHECK ("blueprintResolution" IS NULL OR "blueprintResolution" IN ('exact', 'company_role_family', 'role_family', 'general'));

CREATE INDEX "InterviewPlan_ownerUserId_targetCompanyKey_targetRoleSlug_updatedAt_idx"
ON "InterviewPlan"("ownerUserId", "targetCompanyKey", "targetRoleSlug", "updatedAt" DESC);
