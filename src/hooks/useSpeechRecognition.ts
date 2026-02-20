"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeechRecognition() {
    const [isRecording, setIsRecording] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [volatileTranscript, setVolatileTranscript] = useState("");
    const [finalTranscriptBlock, setFinalTranscriptBlock] = useState("");

    const recognitionRef = useRef<any>(null);
    const fullTranscriptRef = useRef<string>("");
    const isIntentionalRecordingRef = useRef<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (event: any) => {
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

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsRecording(false);
                    isIntentionalRecordingRef.current = false;
                };

                recognition.onend = () => {
                    if (!isIntentionalRecordingRef.current) return;
                    isIntentionalRecordingRef.current = false;
                    setIsRecording(false);

                    const finalStr = fullTranscriptRef.current.trim();
                    if (finalStr) {
                        setFinalTranscriptBlock(finalStr);
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
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startRecording = useCallback(() => {
        if (!recognitionRef.current) return;
        setFinalTranscriptBlock(""); // Clear the last finalized block on new start
        setInterimTranscript("");
        setVolatileTranscript("");
        fullTranscriptRef.current = "";
        isIntentionalRecordingRef.current = true;
        setIsRecording(true);

        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error("Failed to start recognition", e);
            setIsRecording(false);
            isIntentionalRecordingRef.current = false;
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (!recognitionRef.current) return;
        if (isIntentionalRecordingRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error("Failed to stop recognition", e);
            }
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
        startRecording,
        stopRecording,
        toggleRecording,
        hasSupport: typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
}
