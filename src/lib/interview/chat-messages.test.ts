import { describe, expect, it } from "vitest";
import { sanitizeChatMessages } from "./chat-messages";

const validScene = {
  version: 1 as const,
  revision: 1,
  contentHash: "abc",
  nodes: [{ id: "n1", kind: "service", label: "API" }],
  edges: [],
};

function userMessageWithBoard(visionStatus: unknown, imageBase64?: string) {
  return {
    role: "user",
    content: "Here is the design",
    board: {
      scene: validScene,
      mimeType: "image/jpeg",
      ...(imageBase64 ? { imageBase64 } : {}),
      visionStatus,
    },
  };
}

describe("sanitizeChatMessages", () => {
  it("keeps a valid visionStatus on the latest user board", () => {
    const [message] = sanitizeChatMessages([
      userMessageWithBoard("vision_unavailable"),
    ]);

    expect(message?.board?.visionStatus).toBe("vision_unavailable");
  });

  it("rejects an arbitrary visionStatus string and infers from the image", () => {
    const [withImage] = sanitizeChatMessages([
      userMessageWithBoard("hacked", "a".repeat(16)),
    ]);
    const [withoutImage] = sanitizeChatMessages([
      userMessageWithBoard("hacked"),
    ]);

    expect(withImage?.board?.visionStatus).toBe("vision_available");
    expect(withoutImage?.board?.visionStatus).toBe("vision_unavailable");
  });
});
