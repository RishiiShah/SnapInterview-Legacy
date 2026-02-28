export type InterviewChatRole = "user" | "assistant";

export type InterviewChatMessage = {
  role: InterviewChatRole;
  content: string;
};

export const MAX_MESSAGE_LENGTH = 10_000;
export const MAX_MESSAGES = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeChatMessages(rawMessages: unknown): InterviewChatMessage[] {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  const sanitized: InterviewChatMessage[] = [];

  for (const entry of rawMessages) {
    if (!isRecord(entry)) continue;

    const role = entry.role;
    const content = entry.content;

    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      continue;
    }

    const trimmed = content.trim();
    if (!trimmed) continue;

    sanitized.push({
      role,
      content: trimmed.slice(0, MAX_MESSAGE_LENGTH),
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
