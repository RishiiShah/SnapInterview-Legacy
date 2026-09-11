CREATE TABLE "InterviewPlan" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'custom',
    "templateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InterviewPlan_title_valid" CHECK (char_length("title") BETWEEN 1 AND 120),
    CONSTRAINT "InterviewPlan_status_valid" CHECK ("status" IN ('draft', 'active', 'archived')),
    CONSTRAINT "InterviewPlan_source_valid" CHECK ("source" IN ('template', 'custom')),
    CONSTRAINT "InterviewPlan_templateKey_valid" CHECK ("templateKey" IS NULL OR char_length("templateKey") <= 64)
);

CREATE TABLE "InterviewPlanNode" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "planId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "resultInterviewId" TEXT,
    "resultScore" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewPlanNode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InterviewPlanNode_type_valid" CHECK ("nodeType" IN ('interview', 'question_set')),
    CONSTRAINT "InterviewPlanNode_title_valid" CHECK (char_length("title") BETWEEN 1 AND 120),
    CONSTRAINT "InterviewPlanNode_status_valid" CHECK ("status" IN ('locked', 'available', 'in_progress', 'completed', 'skipped')),
    CONSTRAINT "InterviewPlanNode_score_valid" CHECK ("resultScore" IS NULL OR ("resultScore" BETWEEN 0 AND 100))
);

CREATE TABLE "InterviewPlanEdge" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "planId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    CONSTRAINT "InterviewPlanEdge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InterviewPlanEdge_no_self_loop" CHECK ("sourceNodeId" <> "targetNodeId")
);

CREATE INDEX "InterviewPlan_ownerUserId_updatedAt_id_idx" ON "InterviewPlan"("ownerUserId", "updatedAt" DESC, "id");
CREATE INDEX "InterviewPlanNode_planId_idx" ON "InterviewPlanNode"("planId");
CREATE INDEX "InterviewPlanNode_resultInterviewId_idx" ON "InterviewPlanNode"("resultInterviewId");
CREATE INDEX "InterviewPlanEdge_planId_idx" ON "InterviewPlanEdge"("planId");
CREATE INDEX "InterviewPlanEdge_sourceNodeId_idx" ON "InterviewPlanEdge"("sourceNodeId");
CREATE INDEX "InterviewPlanEdge_targetNodeId_idx" ON "InterviewPlanEdge"("targetNodeId");
CREATE UNIQUE INDEX "InterviewPlanEdge_planId_sourceNodeId_targetNodeId_key" ON "InterviewPlanEdge"("planId", "sourceNodeId", "targetNodeId");

ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewPlanNode" ADD CONSTRAINT "InterviewPlanNode_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewPlanNode" ADD CONSTRAINT "InterviewPlanNode_resultInterviewId_fkey" FOREIGN KEY ("resultInterviewId") REFERENCES "InterviewSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewPlanEdge" ADD CONSTRAINT "InterviewPlanEdge_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewPlanEdge" ADD CONSTRAINT "InterviewPlanEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "InterviewPlanNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewPlanEdge" ADD CONSTRAINT "InterviewPlanEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "InterviewPlanNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
