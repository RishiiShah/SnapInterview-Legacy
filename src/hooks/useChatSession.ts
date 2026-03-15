import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatSessionMessage, InterviewType, Difficulty } from "@/data/types";
import { INTERVIEW_DONE_MESSAGE } from "@/data/constants";

interface UseChatSessionOptions {
  interviewId: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  interviewStarted: boolean;
}

export function shouldProcessFinalTranscriptBlock(options: {
  finalTranscriptBlock: string;
  interviewDone: boolean;
  processedTranscriptBlock: string;
}): boolean {
  if (!options.finalTranscriptBlock.trim()) return false;
  if (options.interviewDone) return false;
  if (options.finalTranscriptBlock === options.processedTranscriptBlock) return false;
  return true;
}

export function useChatSession({
  interviewId,
  interviewStarted,
}: UseChatSessionOptions) {
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [currentStreamedText, setCurrentStreamedText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatSessionMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const askGroq = useCallback(
    async (chatHistory: ChatSessionMessage[]) => {
      if (interviewDone) return;

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

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
          signal,
        });

        if (!response.ok) {
          if (signal.aborted) throw new Error("AbortError");
          let errorMessage = `Chat request failed (${response.status})`;
          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const errorPayload = await response.json();
            errorMessage = errorPayload?.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const contentType = response.headers.get("content-type") || "";
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
          throw new Error(payload?.error || "Unexpected JSON response");
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let aiResponseText = "";

        while (true) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone || signal.aborted) {
            if (signal.aborted) try { await reader.cancel(); } catch (e) {}
            break;
          }

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            aiResponseText += chunk;
            setCurrentStreamedText(aiResponseText);
          }
        }

        if (signal.aborted) throw new Error("AbortError");

        setMessages((previous) => [...previous, { role: "ai", text: aiResponseText }]);
        setCurrentStreamedText("");
      } catch (error: any) {
        if (error.name === "AbortError" || error.message === "AbortError") {
          return;
        }
        console.error("AI Chat Error:", error);
        setMessages((previous) => [
          ...previous,
          { role: "ai", text: "Sorry, I encountered an error. Please try again.", isSystem: true },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [interviewId, interviewDone]
  );

  useEffect(() => {
    if (!interviewStarted || interviewDone || messagesRef.current.length !== 0) {
      return;
    }

    void askGroq([]);
  }, [interviewStarted, interviewDone, askGroq]);

  const sendMessage = useCallback(
    async (text: string) => {
      const newUserMessage: ChatSessionMessage = { role: "user", text };
      const updatedHistory = [...messagesRef.current, newUserMessage];
      setMessages(updatedHistory);
      await askGroq(updatedHistory);
    },
    [askGroq]
  );

  return {
    messages,
    currentStreamedText,
    isThinking,
    sendMessage,
    interviewDone,
  };
}
