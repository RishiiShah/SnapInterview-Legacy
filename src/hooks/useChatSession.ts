import { useCallback, useEffect, useRef, useState } from "react";

export type ChatSessionMessage = {
  role: "ai" | "user";
  text: string;
  isSystem?: boolean;
};

type UseChatSessionOptions = {
  interviewId: string;
  interviewStarted: boolean;
  interviewDone: boolean;
  finalTranscriptBlock: string;
  setInterviewDone: (value: boolean) => void;
};

export function useChatSession({
  interviewId,
  interviewStarted,
  interviewDone,
  finalTranscriptBlock,
  setInterviewDone,
}: UseChatSessionOptions) {
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [currentStreamedText, setCurrentStreamedText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesRef = useRef<ChatSessionMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const askGroq = useCallback(
    async (chatHistory: ChatSessionMessage[]) => {
      if (interviewDone) return;

      setIsThinking(true);
      setCurrentStreamedText("");

      const formattedMessages = chatHistory
        .filter((message) => !message.isSystem)
        .map((message) => ({
          role: message.role === "ai" ? "assistant" : "user",
          content: message.text,
        }));

      try {
        const response = await fetch("/api/interview/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: formattedMessages,
            interviewId,
          }),
        });

        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          let errorMessage = `Chat request failed (${response.status})`;

          if (contentType.includes("application/json")) {
            const errorPayload = await response.json();
            if (errorPayload?.error) {
              errorMessage = errorPayload.error;
            }
          } else {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          }

          throw new Error(errorMessage);
        }

        if (contentType.includes("application/json")) {
          const payload = await response.json();

          if (payload?.done) {
            setInterviewDone(true);
            if (typeof payload.doneMessage === "string" && payload.doneMessage.trim()) {
              setMessages((previous) => [
                ...previous,
                { role: "ai", text: payload.doneMessage.trim(), isSystem: true },
              ]);
            }
            return;
          }

          throw new Error(payload?.error || "Unexpected JSON response from interview chat API.");
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let aiResponseText = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            aiResponseText += chunk;
            setCurrentStreamedText((previous) => previous + chunk);
          }
        }

        setMessages((previous) => [...previous, { role: "ai", text: aiResponseText }]);
        setCurrentStreamedText("");
      } catch (error) {
        console.error("AI Chat Error:", error);
        setMessages((previous) => [
          ...previous,
          { role: "ai", text: "I'm having trouble connecting right now. Let's pause for a moment." },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [interviewDone, interviewId, setInterviewDone]
  );

  useEffect(() => {
    if (!interviewStarted || interviewDone || messagesRef.current.length !== 0) {
      return;
    }

    void askGroq([]);
  }, [interviewStarted, interviewDone, askGroq]);

  useEffect(() => {
    if (!finalTranscriptBlock) return;

    const newMessages: ChatSessionMessage[] = [
      ...messagesRef.current,
      { role: "user", text: finalTranscriptBlock },
    ];

    setMessages(newMessages);
    void askGroq(newMessages);
  }, [finalTranscriptBlock, askGroq]);

  return {
    messages,
    currentStreamedText,
    isThinking,
    askGroq,
    setMessages,
  };
}
