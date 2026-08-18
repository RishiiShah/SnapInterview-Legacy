export type InterviewChatRole = "user" | "assistant";

export type WhiteboardScene = {
  version: 1;
  revision: number;
  contentHash: string;
  nodes: Array<{ id: string; kind: string; label: string; x?: number; y?: number }>;
  edges: Array<{ id: string; from: string; to: string; label?: string }>;
};

export type InterviewBoardAttachment = {
  scene: WhiteboardScene;
  imageBase64?: string;
  mimeType: "image/jpeg" | "image/png";
  visionStatus?: "vision_available" | "vision_unavailable";
};

export type InterviewChatMessage = {
  role: InterviewChatRole;
  content: string;
  board?: InterviewBoardAttachment;
};

export const MAX_MESSAGE_LENGTH = 10_000;
export const MAX_MESSAGES = 200;
export const MAX_IMAGE_BASE64_LENGTH = 800_000; // ~600KB binary

type VisionStatus = NonNullable<InterviewBoardAttachment["visionStatus"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseVisionStatus(value: unknown, imageBase64: string | undefined): VisionStatus {
  if (value === "vision_available" || value === "vision_unavailable") {
    return value;
  }
  return imageBase64 ? "vision_available" : "vision_unavailable";
}

export function sanitizeChatMessages(rawMessages: unknown): InterviewChatMessage[] {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  const sanitized: InterviewChatMessage[] = [];

  for (let idx = 0; idx < rawMessages.length; idx++) {
    const entry = rawMessages[idx];
    if (!isRecord(entry)) continue;

    const role = entry.role;
    const content = entry.content;

    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      continue;
    }

    const trimmed = content.trim();
    if (!trimmed) continue;

    let board: InterviewBoardAttachment | undefined = undefined;

    // Only parse board on the very latest user message in the list
    if (role === "user" && idx === rawMessages.length - 1 && isRecord(entry.board)) {
      const b = entry.board;
      if (isRecord(b.scene) && (b.mimeType === "image/jpeg" || b.mimeType === "image/png")) {
        const scene = b.scene as unknown as WhiteboardScene;
        const imageBase64 = typeof b.imageBase64 === "string" && b.imageBase64.length <= MAX_IMAGE_BASE64_LENGTH
          ? b.imageBase64
          : undefined;

        board = {
          scene,
          imageBase64,
          mimeType: b.mimeType as "image/jpeg" | "image/png",
          visionStatus: parseVisionStatus(b.visionStatus, imageBase64),
        };
      }
    }

    sanitized.push({
      role,
      content: trimmed.slice(0, MAX_MESSAGE_LENGTH),
      board,
    });

    if (sanitized.length >= MAX_MESSAGES) {
      break;
    }
  }

  return sanitized;
}

export function extractLatestAnsweredPair(messages: InterviewChatMessage[]): { question: string; answer: string } | null {
  if (messages.length < 2) {
    return null;
  }

  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];

  if (lastMessage.role !== "user") {
    return null;
  }

  for (let index = lastIndex - 1; index >= 0; index--) {
    const candidate = messages[index];
    if (candidate.role === "assistant") {
      return {
        question: candidate.content,
        answer: lastMessage.content,
      };
    }
  }

  return null;
}
