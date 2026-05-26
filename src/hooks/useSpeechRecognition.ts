"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { downsampleTo16kHz } from "@/lib/audio/downsample";
import type { SttWorkerRequest, SttWorkerResponse } from "@/workers/stt-messages";

type SttEngine = "native" | "whisper";

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; [index: number]: RecognitionAlternative };
type RecognitionResultList = { length: number; [index: number]: RecognitionResult };
type RecognitionEvent = { resultIndex: number; results: RecognitionResultList };
type RecognitionErrorEvent = { error?: string };
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

type UseSpeechRecognitionOptions = {
    sharedAudioStream?: MediaStream | null;
};

function getPreferredSttEngine(): SttEngine {
    if (typeof window === "undefined") return "whisper";
    const speechWindow = window as SpeechWindow;
    if (speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition) {
        return "native";
    }
    return "whisper";
}

function hasWhisperSupport(): boolean {
    if (typeof window === "undefined") return false;
    return (
        typeof Worker !== "undefined" &&
        typeof AudioContext !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia)
    );
}

function hasAnySttSupport(engine: SttEngine): boolean {
    return engine === "native" || hasWhisperSupport();
}

function getNativeSpeechErrorMessage(errorCode?: string): string {
    switch (errorCode) {
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

function getMicrophoneErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
        switch (error.name) {
            case "NotAllowedError":
            case "SecurityError":
                return "Microphone permission was denied. Please allow access and try again.";
            case "NotFoundError":
                return "No microphone input detected. Check your selected microphone and browser permissions.";
            case "NotReadableError":
                return "Microphone is in use by another application. Close other apps and try again.";
            default:
                break;
        }
    }
    return "Unable to access the microphone. Check browser permissions and try again.";
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
    const engine = useMemo(() => getPreferredSttEngine(), []);
    const [hasSupport] = useState(() => hasAnySttSupport(engine));

    const [isRecording, setIsRecording] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [volatileTranscript, setVolatileTranscript] = useState("");
    const [finalTranscriptBlock, setFinalTranscriptBlock] = useState("");
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(
        hasSupport
            ? null
            : engine === "native"
                ? "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers."
                : "Speech recognition is unavailable in this browser. Use a modern browser with microphone support."
    );

    // --- Native (Web Speech API) refs ---
    const recognitionRef = useRef<RecognitionLike | null>(null);
    const fullTranscriptRef = useRef("");
    const userStoppedRef = useRef(false);
    const recognitionActiveRef = useRef(false);

    // --- Whisper refs ---
    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const committedTranscriptRef = useRef("");
    const isIntentionalRecordingRef = useRef(false);
    const isStoppingRef = useRef(false);
    const workerReadyRef = useRef(false);
    const ownsMediaStreamRef = useRef(false);
    const sharedAudioStreamRef = useRef(options.sharedAudioStream ?? null);

    useEffect(() => {
        sharedAudioStreamRef.current = options.sharedAudioStream ?? null;
    }, [options.sharedAudioStream]);

    // ---------- Native Web Speech API setup ----------
    useEffect(() => {
        if (engine !== "native" || typeof window === "undefined") return;

        const speechWindow = window as SpeechWindow;
        const SpeechRecognition =
            speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: RecognitionEvent) => {
            setSpeechError(null);
            let currentInterim = "";
            let currentFinal = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentFinal += event.results[i][0].transcript;
                } else {
                    currentInterim += event.results[i][0].transcript;
                }
            }

            if (currentFinal) {
                const currentObj = fullTranscriptRef.current;
                fullTranscriptRef.current =
                    currentObj +
                    (currentObj.endsWith(" ") || currentFinal.startsWith(" ") || currentObj === ""
                        ? ""
                        : " ") +
                    currentFinal;
                setInterimTranscript(fullTranscriptRef.current);
            }
            setVolatileTranscript(currentInterim);
        };

        recognition.onerror = (event: RecognitionErrorEvent) => {
            const errorCode = event?.error;
            console.error("Speech recognition error", errorCode);
            if (errorCode === "no-speech") return;

            setSpeechError(getNativeSpeechErrorMessage(errorCode));
            setIsRecording(false);
            isIntentionalRecordingRef.current = false;
            recognitionActiveRef.current = false;
        };

        recognition.onend = () => {
            if (
                isIntentionalRecordingRef.current &&
                !userStoppedRef.current &&
                recognitionRef.current
            ) {
                try {
                    recognitionRef.current.start();
                    recognitionActiveRef.current = true;
                    return;
                } catch (err) {
                    console.error("Auto-restart failed:", err);
                }
            }

            const shouldPublish =
                userStoppedRef.current || isIntentionalRecordingRef.current;
            isIntentionalRecordingRef.current = false;
            userStoppedRef.current = false;
            recognitionActiveRef.current = false;
            setIsRecording(false);

            if (shouldPublish) {
                const finalStr = fullTranscriptRef.current.trim();
                if (finalStr) setFinalTranscriptBlock(finalStr);
            }

            fullTranscriptRef.current = "";
            setInterimTranscript("");
            setVolatileTranscript("");
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try {
                    recognitionRef.current.stop();
                } catch {
                    // ignore
                }
            }
        };
    }, [engine]);

    // ---------- Whisper worker ----------
    const teardownAudioGraph = useCallback(() => {
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        processorRef.current = null;
        sourceRef.current = null;

        if (mediaStreamRef.current && ownsMediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        mediaStreamRef.current = null;
        ownsMediaStreamRef.current = false;

        if (audioContextRef.current) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }
    }, []);

    const handleWorkerMessage = useCallback(
        (event: MessageEvent<SttWorkerResponse>) => {
            const message = event.data;
            switch (message.type) {
                case "loading":
                    setIsModelLoading(true);
                    break;
                case "ready":
                    workerReadyRef.current = true;
                    setIsModelLoading(false);
                    break;
                case "partial":
                    setInterimTranscript(message.text);
                    setVolatileTranscript("");
                    break;
                case "flushed": {
                    const text = message.text.trim();
                    committedTranscriptRef.current = "";
                    setInterimTranscript("");
                    setVolatileTranscript("");
                    setIsRecording(false);
                    isIntentionalRecordingRef.current = false;
                    isStoppingRef.current = false;
                    setIsModelLoading(false);
                    if (text) setFinalTranscriptBlock(text);
                    break;
                }
                case "error":
                    setSpeechError(message.message);
                    setIsModelLoading(false);
                    setIsRecording(false);
                    isIntentionalRecordingRef.current = false;
                    isStoppingRef.current = false;
                    teardownAudioGraph();
                    break;
                default:
                    break;
            }
        },
        [teardownAudioGraph]
    );

    const ensureWorker = useCallback(() => {
        if (workerRef.current) return workerRef.current;
        const worker = new Worker(new URL("../workers/stt-worker.ts", import.meta.url), {
            type: "module",
        });
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (event) => {
            console.error("STT worker error", event.message);
            setSpeechError("Speech recognition failed to initialize. Please refresh and try again.");
        };
        workerRef.current = worker;
        return worker;
    }, [handleWorkerMessage]);

    const startWhisperCapture = useCallback(async () => {
        const sharedStream = sharedAudioStreamRef.current;
        const hasLiveSharedAudio = Boolean(
            sharedStream?.getAudioTracks().some((track) => track.readyState === "live")
        );

        const stream = hasLiveSharedAudio
            ? sharedStream!
            : await navigator.mediaDevices.getUserMedia({
                  audio: {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                  },
                  video: false,
              });

        ownsMediaStreamRef.current = !hasLiveSharedAudio;
        mediaStreamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
            if (!isIntentionalRecordingRef.current || isStoppingRef.current) return;
            const channelData = event.inputBuffer.getChannelData(0);
            const downsampled = downsampleTo16kHz(channelData, audioContext.sampleRate);
            if (downsampled.length === 0) return;
            workerRef.current?.postMessage(
                { type: "audio", samples: downsampled } satisfies SttWorkerRequest,
                [downsampled.buffer]
            );
        };

        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);
    }, []);

    useEffect(() => {
        if (engine !== "whisper") return;
        return () => {
            teardownAudioGraph();
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [engine, teardownAudioGraph]);

    const startRecording = useCallback(async () => {
        if (!hasSupport) return;
        if (isRecording) return;

        setFinalTranscriptBlock("");
        setInterimTranscript("");
        setVolatileTranscript("");
        setSpeechError(null);
        isIntentionalRecordingRef.current = true;
        setIsRecording(true);

        if (engine === "native") {
            if (!recognitionRef.current) {
                setSpeechError(
                    "Speech recognition is unavailable in this browser. Use Chrome or Edge for voice answers."
                );
                setIsRecording(false);
                return;
            }
            fullTranscriptRef.current = "";
            userStoppedRef.current = false;
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
            return;
        }

        // Whisper fallback (Firefox, etc.)
        committedTranscriptRef.current = "";
        isStoppingRef.current = false;
        setIsModelLoading(true);
        try {
            const worker = ensureWorker();
            worker.postMessage({ type: "reset" } satisfies SttWorkerRequest);
            if (!workerReadyRef.current) {
                worker.postMessage({ type: "init" } satisfies SttWorkerRequest);
            }
            await startWhisperCapture();
        } catch (error) {
            console.error("Failed to start speech recognition", error);
            setSpeechError(getMicrophoneErrorMessage(error));
            setIsModelLoading(false);
            setIsRecording(false);
            isIntentionalRecordingRef.current = false;
            teardownAudioGraph();
        }
    }, [
        hasSupport,
        isRecording,
        engine,
        ensureWorker,
        startWhisperCapture,
        teardownAudioGraph,
    ]);

    const stopRecording = useCallback(() => {
        if (!isRecording && !isIntentionalRecordingRef.current) return;

        if (engine === "native") {
            if (!recognitionRef.current || !recognitionActiveRef.current) return;
            userStoppedRef.current = true;
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error("Failed to stop recognition", e);
                const finalStr = fullTranscriptRef.current.trim();
                if (finalStr) setFinalTranscriptBlock(finalStr);
                fullTranscriptRef.current = "";
                setInterimTranscript("");
                setVolatileTranscript("");
                setIsRecording(false);
                isIntentionalRecordingRef.current = false;
                recognitionActiveRef.current = false;
            }
            return;
        }

        isStoppingRef.current = true;
        isIntentionalRecordingRef.current = false;
        setIsRecording(false);
        teardownAudioGraph();
        workerRef.current?.postMessage({ type: "flush" } satisfies SttWorkerRequest);
    }, [isRecording, engine, teardownAudioGraph]);

    const toggleRecording = useCallback(() => {
        if (isRecording) stopRecording();
        else void startRecording();
    }, [isRecording, startRecording, stopRecording]);

    return {
        isRecording,
        interimTranscript,
        volatileTranscript,
        finalTranscriptBlock,
        speechError,
        isModelLoading: engine === "whisper" ? isModelLoading : false,
        hasSupport,
        startRecording,
        stopRecording,
        toggleRecording,
    };
}
