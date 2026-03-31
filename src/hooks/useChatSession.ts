import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatSessionMessage {
  role: "user" | "ai";
  text: string;
  isSystem?: boolean;
}

interface UseChatSessionOptions {
  interviewId: string;
  interviewStarted: boolean;
  interviewDone: boolean;
  finalTranscriptBlock: string;
  setInterviewDone: (done: boolean) => void;
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
  interviewDone: externalInterviewDone,
  finalTranscriptBlock,
  setInterviewDone: externalSetInterviewDone,
}: UseChatSessionOptions) {
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [currentStreamedText, setCurrentStreamedText] = useState("");
  const [lastCompletedAiText, setLastCompletedAiText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [internalInterviewDone, setInternalInterviewDone] = useState(false);

  const interviewDone = externalInterviewDone || internalInterviewDone;

  const setInterviewDone = useCallback((done: boolean) => {
    setInternalInterviewDone(done);
    externalSetInterviewDone(done);
  }, [externalSetInterviewDone]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatSessionMessage[]>([]);
  const processedTranscriptRef = useRef<string>("");
  const activeRequestRef = useRef(false);
  const queuedTranscriptRef = useRef<string | null>(null);

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
      if (interviewDone || activeRequestRef.current) {
        return;
      }

      activeRequestRef.current = true;
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
      const expectedCurrentQuestion = formattedMessages.filter((message) => message.role === "assistant").length;

      try {
        let response = await fetch("/api/interview/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: formattedMessages,
            interviewId,
            expectedCurrentQuestion,
          }),
          signal,
        });

        // Handle 409 conflict: server's currentQuestion is ahead of client's.
        // Retry once with the server-provided currentQuestion.
        if (response.status === 409) {
          const conflictPayload = await response.json().catch(() => null);
          const serverCurrentQuestion = conflictPayload?.currentQuestion;
          if (typeof serverCurrentQuestion === "number") {
            response = await fetch("/api/interview/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: formattedMessages,
                interviewId,
                expectedCurrentQuestion: serverCurrentQuestion,
              }),
              signal,
            });
          }
        }

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
              const doneMsg = payload.doneMessage.trim();
              setMessages((previous) => [
                ...previous,
                { role: "ai", text: doneMsg, isSystem: true },
              ]);
              setLastCompletedAiText(doneMsg);
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
            if (signal.aborted) try { await reader.cancel(); } catch {}
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
        setLastCompletedAiText(aiResponseText);
      } catch (error: unknown) {
        if (error instanceof Error && (error.name === "AbortError" || error.message === "AbortError")) {
          return;
        }
        console.error("AI Chat Error:", error);
        setMessages((previous) => [
          ...previous,
          { role: "ai", text: "Sorry, I encountered an error. Please try again.", isSystem: true },
        ]);
      } finally {
        activeRequestRef.current = false;
        setIsThinking(false);
      }
    },
    [interviewId, interviewDone, setInterviewDone]
  );

  useEffect(() => {
    if (!interviewStarted || interviewDone || messagesRef.current.length !== 0) {
      return;
    }

    void askGroq([]);
  }, [interviewStarted, interviewDone, askGroq]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText || interviewDone) {
        return;
      }

      if (activeRequestRef.current) {
        queuedTranscriptRef.current = trimmedText;
        return;
      }

      const newUserMessage: ChatSessionMessage = { role: "user", text: trimmedText };
      const updatedHistory = [...messagesRef.current, newUserMessage];
      setMessages(updatedHistory);
      await askGroq(updatedHistory);
    },
    [askGroq, interviewDone]
  );

  useEffect(() => {
    if (interviewDone || isThinking || activeRequestRef.current) {
      return;
    }

    const queuedTranscript = queuedTranscriptRef.current;
    if (!queuedTranscript) {
      return;
    }

    queuedTranscriptRef.current = null;
    void sendMessage(queuedTranscript);
  }, [interviewDone, isThinking, sendMessage]);

  useEffect(() => {
    if (
      !shouldProcessFinalTranscriptBlock({
        finalTranscriptBlock,
        interviewDone,
        processedTranscriptBlock: processedTranscriptRef.current,
      })
    ) {
      return;
    }

    processedTranscriptRef.current = finalTranscriptBlock;
    void sendMessage(finalTranscriptBlock);
  }, [finalTranscriptBlock, interviewDone, sendMessage]);

  return {
    messages,
    currentStreamedText,
    lastCompletedAiText,
    isThinking,
    sendMessage,
    interviewDone,
  };
}
