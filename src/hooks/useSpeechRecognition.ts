"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type RecognitionAlternative = {
    transcript: string;
};

type RecognitionResult = {
    isFinal: boolean;
    [index: number]: RecognitionAlternative;
};

type RecognitionResultList = {
    length: number;
    [index: number]: RecognitionResult;
};

type RecognitionEvent = {
    resultIndex: number;
    results: RecognitionResultList;
};

type RecognitionErrorEvent = {
    error?: string;
};

type RecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: RecognitionEvent) => void) | null;
    onerror: ((event: RecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionConstructor = new () => RecognitionLike;

type SpeechWindow = Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type SpeechRecognitionErrorCode =
    | "aborted"
    | "audio-capture"
    | "bad-grammar"
    | "language-not-supported"
    | "network"
    | "no-speech"
    | "not-allowed"
    | "service-not-allowed";

function getSpeechErrorMessage(errorCode?: string): string {
    switch (errorCode as SpeechRecognitionErrorCode | undefined) {
        case "network":
            return "Speech recognition network error. In Brave, disable Shields for this site and allow microphone access, then retry.";
        case "not-allowed":
        case "service-not-allowed":
            return "Microphone or speech service permission was denied. Please allow access and try again.";
        case "audio-capture":
            return "No microphone input detected. Check your selected microphone and browser permissions.";
        case "no-speech":
            return "No speech was detected. Please speak clearly and try again.";
        case "language-not-supported":
            return "Selected speech language is not supported in this browser.";
        default:
            return "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers.";
    }
}

export function useSpeechRecognition() {
    const [hasSupport] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        const speechWindow = window as SpeechWindow;
        return Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
    });

    const [isRecording, setIsRecording] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [volatileTranscript, setVolatileTranscript] = useState("");
    const [finalTranscriptBlock, setFinalTranscriptBlock] = useState("");
    const [speechError, setSpeechError] = useState<string | null>(
        hasSupport
            ? null
            : "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers."
    );

    const recognitionRef = useRef<RecognitionLike | null>(null);
    const fullTranscriptRef = useRef<string>("");
    const isIntentionalRecordingRef = useRef<boolean>(false);
    const recognitionActiveRef = useRef<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const speechWindow = window as SpeechWindow;
            const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onresult = (event: RecognitionEvent) => {
                    setSpeechError(null);
                    let currentInterim = '';
                    let currentFinal = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            currentFinal += event.results[i][0].transcript;
                        } else {
                            currentInterim += event.results[i][0].transcript;
                        }
                    }

                    if (currentFinal) {
                        const currentObj = fullTranscriptRef.current;
                        fullTranscriptRef.current = currentObj + (currentObj.endsWith(' ') || currentFinal.startsWith(' ') || currentObj === '' ? '' : ' ') + currentFinal;
                        setInterimTranscript(fullTranscriptRef.current);
                    }
                    setVolatileTranscript(currentInterim);
                };

                recognition.onerror = (event: RecognitionErrorEvent) => {
                    const errorCode = event?.error;
                    console.error("Speech recognition error", errorCode);
                    
                    // "no-speech" often happens if the user pauses.
                    // We don't want to stop the UI recording state for this if it's intentional.
                    if (errorCode === "no-speech") {
                      return;
                    }

                    setSpeechError(getSpeechErrorMessage(errorCode));
                    setIsRecording(false);
                    isIntentionalRecordingRef.current = false;
                    recognitionActiveRef.current = false;
                };

                recognition.onend = () => {
                    // If the user didn't stop it intentionally, and it's not a hard error,
                    // we try to restart it (e.g., after "no-speech" or transient network dip).
                    if (isIntentionalRecordingRef.current && recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                        recognitionActiveRef.current = true;
                        return;
                      } catch (err) {
                        console.error("Auto-restart failed:", err);
                      }
                    }

                    const shouldPublishTranscript = isIntentionalRecordingRef.current;
                    isIntentionalRecordingRef.current = false;
                    recognitionActiveRef.current = false;
                    setIsRecording(false);

                    if (shouldPublishTranscript) {
                        const finalStr = fullTranscriptRef.current.trim();
                        if (finalStr) {
                            setFinalTranscriptBlock(finalStr);
                        }
                    }

                    fullTranscriptRef.current = "";
                    setInterimTranscript("");
                    setVolatileTranscript("");
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try {
                    recognitionRef.current.stop();
                } catch {
                    // Ignore stop errors during teardown when recognition is already inactive.
                }
            }
        };
    }, []);

    const startRecording = useCallback(() => {
        if (!recognitionRef.current) {
            setSpeechError("Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers.");
            return;
        }
        if (recognitionActiveRef.current || isRecording) {
            return;
        }
        setFinalTranscriptBlock(""); // Clear the last finalized block on new start
        setInterimTranscript("");
        setVolatileTranscript("");
        fullTranscriptRef.current = "";
        isIntentionalRecordingRef.current = true;
        setIsRecording(true);
        setSpeechError(null);

        try {
            recognitionRef.current.start();
            recognitionActiveRef.current = true;
        } catch (e) {
            console.error("Failed to start recognition", e);
            setSpeechError("Unable to start speech recognition. Please retry or switch to Chrome/Edge.");
            setIsRecording(false);
            isIntentionalRecordingRef.current = false;
            recognitionActiveRef.current = false;
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (!recognitionRef.current || !recognitionActiveRef.current) return;
        isIntentionalRecordingRef.current = false;

        try {
            recognitionRef.current.stop();
        } catch (e) {
            console.error("Failed to stop recognition", e);
            setIsRecording(false);
            recognitionActiveRef.current = false;
        }
    }, []);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    return {
        isRecording,
        interimTranscript,
        volatileTranscript,
        finalTranscriptBlock,
        speechError,
        hasSupport,
        startRecording,
        stopRecording,
        toggleRecording,
    };
}
