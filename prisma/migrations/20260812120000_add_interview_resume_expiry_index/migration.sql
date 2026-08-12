CREATE INDEX "InterviewSession_resume_expiry_idx"
ON "InterviewSession"("status", "createdAt");
