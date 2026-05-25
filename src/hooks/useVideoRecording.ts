import { useRef, useState, useCallback, useEffect } from "react";

type UseVideoRecordingOptions = {
    interviewId: string;
    onScreenShareEnded?: () => void;
};

export function useVideoRecording({ interviewId, onScreenShareEnded }: UseVideoRecordingOptions) {
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    // Multipart upload state
    const multipartStateRef = useRef<{
        uploadId: string | null;
        key: string | null;
        partNumber: number;
        parts: { PartNumber: number; ETag: string }[];
        buffer: Blob[];
        bufferSize: number;
        uploadQueue: Promise<void>;
        isAborted: boolean;
        isCompleting: boolean;
    }>({
        uploadId: null,
        key: null,
        partNumber: 1,
        parts: [],
        buffer: [],
        bufferSize: 0,
        uploadQueue: Promise.resolve(),
        isAborted: false,
        isCompleting: false,
    });

    // Cleanup aborts upload if component unmounts prematurely
    useEffect(() => {
        const state = multipartStateRef.current;
        return () => {
            if (state.uploadId && state.key && !state.isCompleting) {
                state.isAborted = true;
                fetch("/api/s3/multipart/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: state.key, uploadId: state.uploadId, parts: [], action: "abort" }),
                    keepalive: true,
                }).catch(() => {});
            }
        };
    }, []);

    const flushBuffer = async (blobData: Blob) => {
        const state = multipartStateRef.current;
        if (state.isAborted || !state.uploadId || !state.key) return;

        const currentPartNumber = state.partNumber++;
        const presignRes = await fetch("/api/s3/multipart/sign-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: state.key, uploadId: state.uploadId, partNumber: currentPartNumber }),
        });
        
        if (!presignRes.ok) throw new Error("Failed to sign part");
        const { url } = await presignRes.json();

        const uploadRes = await fetch(url, {
            method: "PUT",
            body: blobData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload part to S3");
        
        const eTag = uploadRes.headers.get("ETag");
        if (!eTag) throw new Error("AWS did not return an ETag");

        state.parts.push({ PartNumber: currentPartNumber, ETag: eTag.replace(/"/g, "") });
    };

    const handleDataAvailable = useCallback((event: BlobEvent) => {
        if (!event.data || event.data.size === 0) return;
        const state = multipartStateRef.current;
        if (state.isAborted) return;

        state.buffer.push(event.data);
        state.bufferSize += event.data.size;

        // AWS requires parts to be at least 5MB
        if (state.bufferSize >= 5 * 1024 * 1024) {
            const chunk = new Blob(state.buffer, { type: "video/webm" });
            state.buffer = [];
            state.bufferSize = 0;

            // Queue upload to ensure sequential order
            state.uploadQueue = state.uploadQueue.then(() => flushBuffer(chunk)).catch(err => {
                console.error("Multipart upload part failed:", err);
            });
        }
    }, []);

    const startScreenRecording = useCallback(async (micStream?: MediaStream) => {
        try {
            // Initialize multipart upload first
            const initRes = await fetch("/api/s3/multipart/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interviewId }),
            });

            if (!initRes.ok) {
                console.error("Failed to initialize multipart upload");
                return false;
            }

            const { uploadId, key } = await initRes.json();
            multipartStateRef.current.uploadId = uploadId;
            multipartStateRef.current.key = key;
            multipartStateRef.current.partNumber = 1;
            multipartStateRef.current.parts = [];
            multipartStateRef.current.buffer = [];
            multipartStateRef.current.bufferSize = 0;
            multipartStateRef.current.isAborted = false;
            multipartStateRef.current.isCompleting = false;
            multipartStateRef.current.uploadQueue = Promise.resolve();

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "monitor",
                    frameRate: { ideal: 15, max: 30 },
                },
                audio: false,
                // @ts-expect-error - Chrome-specific options
                selfBrowserSurface: "include",
                surfaceSwitching: "include",
            });

            const combinedStream = new MediaStream();
            screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
            if (micStream) {
                micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
            }

            screenStreamRef.current = screenStream;

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: "video/webm;codecs=vp8,opus",
            });

            mediaRecorder.ondataavailable = handleDataAvailable;

            const screenVideoTrack = screenStream.getVideoTracks()[0];
            screenVideoTrack.onended = () => {
                setIsRecordingVideo(false);
                onScreenShareEnded?.();
                if (mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                }
            };

            mediaRecorder.start(1000); // 1-second chunks
            mediaRecorderRef.current = mediaRecorder;
            setIsRecordingVideo(true);

            return true;
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                console.warn("Screen recording was cancelled by the user.");
            } else {
                console.error("Failed to start screen recording:", err);
            }
            return false;
        }
    }, [interviewId, onScreenShareEnded, handleDataAvailable]);

    const stopVideoRecording = useCallback((): Promise<{ videoKey: string } | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            const state = multipartStateRef.current;

            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                setIsRecordingVideo(false);
                resolve(null);
                return;
            }

            mediaRecorder.onstop = () => {
                setIsRecordingVideo(false);
                state.isCompleting = true; // Prevent unmount abort

                // Stop tracks
                if (screenStreamRef.current) {
                    screenStreamRef.current.getVideoTracks().forEach(track => { track.onended = null; });
                    screenStreamRef.current.getTracks().forEach(track => track.stop());
                    screenStreamRef.current = null;
                }

                // Process final buffer
                const finalBlob = state.buffer.length > 0 ? new Blob(state.buffer, { type: "video/webm" }) : null;
                
                state.uploadQueue = state.uploadQueue.then(async () => {
                    if (finalBlob && finalBlob.size > 0 && state.uploadId && state.key) {
                        await flushBuffer(finalBlob);
                    }
                    
                    if (state.uploadId && state.key && state.parts.length > 0) {
                        const compRes = await fetch("/api/s3/multipart/complete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ key: state.key, uploadId: state.uploadId, parts: state.parts }),
                        });
                        if (compRes.ok) {
                            resolve({ videoKey: state.key });
                            return;
                        }
                    }
                    resolve(null);
                }).catch((err) => {
                    console.error("Failed to finish multipart upload", err);
                    resolve(null);
                });
            };

            mediaRecorder.stop();
        });
    }, []);

    return {
        isRecordingVideo,
        startScreenRecording,
        stopVideoRecording,
    };
}

