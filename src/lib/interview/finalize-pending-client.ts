const STORAGE_KEY = "pending_interview_finalize_v1";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  if (ids.length === 0) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function addPendingInterviewFinalize(interviewId: string) {
  const ids = new Set(readIds());
  ids.add(interviewId);
  writeIds([...ids]);
}

export function clearPendingInterviewFinalize(interviewId: string) {
  const ids = readIds().filter((id) => id !== interviewId);
  writeIds(ids);
}

export function getPendingInterviewFinalizeIds(): string[] {
  return readIds();
}

export function hasPendingInterviewFinalize(): boolean {
  return readIds().length > 0;
}
