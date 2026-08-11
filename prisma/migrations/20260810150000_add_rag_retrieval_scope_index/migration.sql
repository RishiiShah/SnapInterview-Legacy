-- RAG excludes questions already injected for the same user's matching role.
-- This is the parent side of the RetrievedQuestion -> InterviewSession join;
-- the existing RetrievedQuestion_interviewSessionId_idx then finds that
-- session's corpus IDs without scanning other users' interview histories.
CREATE INDEX IF NOT EXISTS "InterviewSession_rag_retrieval_scope_idx"
  ON "InterviewSession" ("userId", "role", "deletedAt", "id");
