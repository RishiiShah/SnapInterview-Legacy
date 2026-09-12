CREATE TABLE "VoiceAnalysis" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COLLECTING',
    "analyzerVersion" TEXT NOT NULL DEFAULT 'browser-v1',
    "audioQualityScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "aggregateMetrics" JSONB,
    "coachingSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "VoiceAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceTurnAnalysis" (
    "id" TEXT NOT NULL,
    "voiceAnalysisId" TEXT NOT NULL,
    "transcriptOrder" INTEGER NOT NULL,
    "responseLatencyMs" INTEGER,
    "speakingDurationMs" INTEGER,
    "wordsPerMinute" DOUBLE PRECISION,
    "pauseRatio" DOUBLE PRECISION,
    "energyVariation" DOUBLE PRECISION,
    "fillerWordCount" INTEGER NOT NULL DEFAULT 0,
    "audioQualityScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceTurnAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VoiceAnalysis_interviewSessionId_key" ON "VoiceAnalysis"("interviewSessionId");
CREATE INDEX "VoiceAnalysis_status_createdAt_idx" ON "VoiceAnalysis"("status", "createdAt");
CREATE UNIQUE INDEX "VoiceTurnAnalysis_voiceAnalysisId_transcriptOrder_key" ON "VoiceTurnAnalysis"("voiceAnalysisId", "transcriptOrder");
CREATE INDEX "VoiceTurnAnalysis_voiceAnalysisId_idx" ON "VoiceTurnAnalysis"("voiceAnalysisId");

ALTER TABLE "VoiceAnalysis" ADD CONSTRAINT "VoiceAnalysis_interviewSessionId_fkey"
FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoiceTurnAnalysis" ADD CONSTRAINT "VoiceTurnAnalysis_voiceAnalysisId_fkey"
FOREIGN KEY ("voiceAnalysisId") REFERENCES "VoiceAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
