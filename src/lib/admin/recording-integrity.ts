import { isAwsS3Configured } from "@/lib/env";
import { batchS3ObjectExists } from "@/lib/s3/videos";

export type RecordingIntegrityStatus =
  | "no_recording"
  | "ready"
  | "missing_object"
  | "url_without_key"
  | "unverified";

export type RecordingIntegrityView = {
  status: RecordingIntegrityStatus;
  label: string;
  description: string;
  tone: "neutral" | "success" | "warning" | "danger";
  s3Checked: boolean;
  s3Exists: boolean | null;
};

export function classifyRecordingIntegrity(params: {
  videoKey: string | null;
  videoUrl: string | null;
  s3Exists: boolean | null;
}): RecordingIntegrityStatus {
  const { videoKey, videoUrl, s3Exists } = params;

  if (!videoKey && !videoUrl) {
    return "no_recording";
  }

  if (!videoKey && videoUrl) {
    return "url_without_key";
  }

  if (videoKey && s3Exists === null) {
    return "unverified";
  }

  if (videoKey && s3Exists === false) {
    return "missing_object";
  }

  return "ready";
}

export function recordingIntegrityHasIssue(status: RecordingIntegrityStatus): boolean {
  return status === "missing_object" || status === "url_without_key";
}

export function describeRecordingIntegrity(status: RecordingIntegrityStatus): Omit<
  RecordingIntegrityView,
  "status" | "s3Checked" | "s3Exists"
> {
  switch (status) {
    case "no_recording":
      return {
        label: "No recording",
        description: "No video key or URL is stored for this session.",
        tone: "neutral",
      };
    case "ready":
      return {
        label: "Recording OK",
        description: "Database references a video object that exists in storage.",
        tone: "success",
      };
    case "missing_object":
      return {
        label: "Missing in storage",
        description: "A video key is stored but the object was not found in S3.",
        tone: "danger",
      };
    case "url_without_key":
      return {
        label: "URL without key",
        description: "A playback URL exists without a linked storage key — may need backfill.",
        tone: "warning",
      };
    case "unverified":
      return {
        label: "Unverified",
        description: "S3 is not configured or the object could not be checked.",
        tone: "neutral",
      };
  }
}

function buildRecordingIntegrityView(params: {
  videoKey: string | null;
  videoUrl: string | null;
  s3Exists: boolean | null;
}): RecordingIntegrityView {
  const s3Checked = Boolean(params.videoKey) && isAwsS3Configured();
  const status = classifyRecordingIntegrity({ ...params, s3Exists: params.s3Exists });
  const description = describeRecordingIntegrity(status);

  return {
    status,
    ...description,
    s3Checked,
    s3Exists: params.s3Exists,
  };
}

export async function resolveRecordingIntegrity(params: {
  videoKey: string | null;
  videoUrl: string | null;
}): Promise<RecordingIntegrityView> {
  let s3Exists: boolean | null = null;
  const s3Checked = Boolean(params.videoKey) && isAwsS3Configured();

  if (s3Checked && params.videoKey) {
    const existence = await batchS3ObjectExists([params.videoKey]);
    s3Exists = existence.get(params.videoKey) ?? false;
  }

  return buildRecordingIntegrityView({ ...params, s3Exists });
}

export function batchResolveRecordingIntegrityFromDb(
  sessions: Array<{ id: string; videoKey: string | null; videoUrl: string | null }>,
): Map<string, RecordingIntegrityView> {
  const results = new Map<string, RecordingIntegrityView>();

  for (const session of sessions) {
    results.set(
      session.id,
      buildRecordingIntegrityView({
        videoKey: session.videoKey,
        videoUrl: session.videoUrl,
        s3Exists: null,
      }),
    );
  }

  return results;
}

export async function batchResolveRecordingIntegrity(
  sessions: Array<{ id: string; videoKey: string | null; videoUrl: string | null }>,
  options?: { verifyS3?: boolean },
): Promise<Map<string, RecordingIntegrityView>> {
  if (options?.verifyS3 === false) {
    return batchResolveRecordingIntegrityFromDb(sessions);
  }

  const results = new Map<string, RecordingIntegrityView>();
  const keys = sessions.map((session) => session.videoKey).filter((key): key is string => Boolean(key));
  const s3ExistsByKey =
    keys.length > 0 && isAwsS3Configured() ? await batchS3ObjectExists(keys) : new Map<string, boolean>();

  for (const session of sessions) {
    const s3Exists =
      session.videoKey && isAwsS3Configured()
        ? (s3ExistsByKey.get(session.videoKey) ?? false)
        : null;

    results.set(
      session.id,
      buildRecordingIntegrityView({
        videoKey: session.videoKey,
        videoUrl: session.videoUrl,
        s3Exists,
      }),
    );
  }

  return results;
}
