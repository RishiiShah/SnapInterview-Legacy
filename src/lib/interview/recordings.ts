const INTERVIEW_KEY_PATTERN = /\/interview-([a-f0-9-]{36})\.webm$/i;

export function extractInterviewIdFromVideoKey(key: string): string | null {
  const match = key.match(INTERVIEW_KEY_PATTERN);
  return match ? match[1] : null;
}

export function filterSessionsWithListedRecordingObjects<T extends { videoKey: string | null }>(
  sessions: T[],
  recordings: Array<{ key: string }>,
): T[] {
  const listedKeys = new Set(recordings.map((recording) => recording.key));
  return sessions.filter((session) => Boolean(session.videoKey && listedKeys.has(session.videoKey)));
}
