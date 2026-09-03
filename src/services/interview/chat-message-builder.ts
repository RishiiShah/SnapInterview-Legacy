import type { InterviewChatMessage, WhiteboardScene } from "@/lib/interview/chat-messages";

export type InterviewProviderMessage =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | {
            type: "image_url";
            image_url: { url: string };
          }
      >;
    };

export function formatSceneGraph(scene: WhiteboardScene): string {
  const nodes = scene.nodes.map((n) => `${n.label} (${n.kind})`).join(", ");
  const connections = scene.edges.map((e) => `${e.from} -> ${e.to}${e.label ? ` [${e.label}]` : ""}`).join("; ") || "None";
  return `\n[Candidate's Current Architecture Whiteboard Diagram]:\nNodes: ${nodes}\nConnections: ${connections}\n`;
}

export function buildProviderMessages(params: {
  systemInstruction: string;
  messages: InterviewChatMessage[];
  isSystemDesignRound: boolean;
}): InterviewProviderMessage[] {
  const { systemInstruction, messages, isSystemDesignRound } = params;
  const mapped: InterviewProviderMessage[] = messages.map((message, idx) => {
      if (
        isSystemDesignRound &&
        idx === messages.length - 1 &&
        message.role === "user" &&
        message.board?.imageBase64
      ) {
        const sceneGraphText = formatSceneGraph(message.board.scene);

        return {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `${message.content}${sceneGraphText}`,
            },
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${message.board.mimeType};base64,${message.board.imageBase64}`,
              },
            },
          ],
        };
      }

      if (
        isSystemDesignRound &&
        idx === messages.length - 1 &&
        message.role === "user" &&
        message.board?.scene
      ) {
        const sceneGraphText = formatSceneGraph(message.board.scene);
        return {
          role: message.role,
          content: `${message.content}${sceneGraphText}`,
        };
      }

      return { role: message.role, content: message.content };
    });

  // ponytail: qwen models require at least one user message; inject a greeting trigger on the initial turn
  if (!mapped.some((m) => m.role === "user")) {
    mapped.push({ role: "user", content: "Begin the interview." });
  }

  return [{ role: "system" as const, content: systemInstruction }, ...mapped];
}

