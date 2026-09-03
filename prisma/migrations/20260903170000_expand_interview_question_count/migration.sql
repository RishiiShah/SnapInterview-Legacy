ALTER TABLE "InterviewSession" DROP CONSTRAINT IF EXISTS "InterviewSession_questionCount_valid";

ALTER TABLE "InterviewSession"
ADD CONSTRAINT "InterviewSession_questionCount_valid"
CHECK ("questionCount" IN (5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18));
