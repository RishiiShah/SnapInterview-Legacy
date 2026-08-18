export const MAX_RESUME_PDF_BYTES = 4 * 1024 * 1024;
export const MAX_RESUME_PDF_LABEL = "4 MB";

const FILE_TOO_LARGE_ERROR = `File too large. Choose a PDF smaller than ${MAX_RESUME_PDF_LABEL}.`;
const GENERIC_RESUME_ERROR = "Failed to process resume. Please try again.";

type ResumeUploadPayload = {
  error?: unknown;
  resumeText?: unknown;
};

export function validateResumeFile(file: File): string | null {
  return file.size > MAX_RESUME_PDF_BYTES ? FILE_TOO_LARGE_ERROR : null;
}

async function readResumeUploadPayload(response: Response): Promise<ResumeUploadPayload> {
  const body = await response.text();
  if (!body) return {};

  try {
    const payload: unknown = JSON.parse(body);
    return payload && typeof payload === "object" ? (payload as ResumeUploadPayload) : {};
  } catch {
    return {};
  }
}

export async function getResumeUploadError(response: Response): Promise<string> {
  if (response.status === 413) return FILE_TOO_LARGE_ERROR;

  const payload = await readResumeUploadPayload(response);
  return typeof payload.error === "string" ? payload.error : GENERIC_RESUME_ERROR;
}

export async function parseResumeUploadResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new Error(await getResumeUploadError(response));
  }

  const payload = await readResumeUploadPayload(response);
  if (typeof payload.resumeText !== "string") {
    throw new Error(GENERIC_RESUME_ERROR);
  }

  return payload.resumeText;
}

export async function uploadResumeFile(file: File): Promise<string> {
  const validationError = validateResumeFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch("/api/resume/parse", {
    method: "POST",
    body: formData,
  });
  return parseResumeUploadResponse(response);
}
