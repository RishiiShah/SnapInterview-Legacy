const INTERVIEW_KEY_PATTERN = /\/interview-([a-f0-9-]{36})\.webm$/i;

export function extractInterviewIdFromVideoKey(key: string): string | null {
  const match = key.match(INTERVIEW_KEY_PATTERN);
  return match ? match[1] : null;
}
