import { useRef, useState, useCallback, useEffect } from "react";

type UseVideoRecordingOptions = {
    interviewId: string;
    onRecordingEnded?: () => void;
};

/** S3 multipart parts (except the last) must be ≥ 5 MiB. */
const MIN_PART_BYTES = 5 * 1024 * 1024;
/** Target recording bitrate (lower = smaller uploads, still readable for review). */
const VIDEO_BITS_PER_SECOND = 1_250_000;
const AUDIO_BITS_PER_SECOND = 96_000;

export function useVideoRecording({ interviewId, onRecordingEnded }: UseVideoRecordingOptions) {
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingStreamRef = useRef<MediaStream | null>(null);

    // Multipart upload state
    const multipartStateRef = useRef<{
        uploadId: string | null;
        key: string | null;
        uploadToken: string | null;
        videoCompletionToken: string | null;
        partNumber: number;
        parts: { PartNumber: number; ETag: string }[];
        buffer: Blob[];
        bufferSize: number;
        partUploadPromises: Promise<void>[];
        uploadQueue: Promise<void>;
        isAborted: boolean;
        isCompleting: boolean;
        hasPartFailure: boolean;
    }>({
        uploadId: null,
        key: null,
        uploadToken: null,
        videoCompletionToken: null,
        partNumber: 1,
        parts: [],
        buffer: [],
        bufferSize: 0,
        partUploadPromises: [],
        uploadQueue: Promise.resolve(),
        isAborted: false,
        isCompleting: false,
        hasPartFailure: false,
    });

    // Cleanup aborts upload if component unmounts prematurely
    useEffect(() => {
        const state = multipartStateRef.current;
        return () => {
            if (state.uploadId && state.key && !state.isCompleting) {
                state.isAborted = true;
                console.warn("Component unmounted during active upload; aborting multipart upload", { interviewId });
                fetch("/api/s3/multipart/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        interviewId,
                        key: state.key,
                        uploadId: state.uploadId,
                        uploadToken: state.uploadToken,
                        action: "abort",
                    }),
                    keepalive: true,
                }).catch((err) => {
                    console.warn("Failed to abort multipart upload on unmount:", err);
                });
            }
        };
    }, [interviewId]);

    const flushBuffer = useCallback(async (blobData: Blob, partNumber: number) => {
        const state = multipartStateRef.current;
        if (state.isAborted || !state.uploadId || !state.key || !state.uploadToken) return;

        const presignRes = await fetch("/api/s3/multipart/sign-part", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                interviewId,
                key: state.key,
                uploadId: state.uploadId,
                uploadToken: state.uploadToken,
                partNumber,
            }),
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

        state.parts.push({ PartNumber: partNumber, ETag: eTag.replace(/"/g, "") });
    }, [interviewId]);

    const schedulePartUpload = useCallback((blobData: Blob) => {
        const state = multipartStateRef.current;
        if (state.isAborted) return;

        const partNumber = state.partNumber++;
        const uploadPromise = flushBuffer(blobData, partNumber).catch((err) => {
            console.error("Multipart upload part failed:", err);
            state.hasPartFailure = true;
        });
        state.partUploadPromises.push(uploadPromise);
        state.uploadQueue = Promise.all(state.partUploadPromises).then(() => undefined);
    }, [flushBuffer]);

    const handleDataAvailable = useCallback((event: BlobEvent) => {
        if (!event.data || event.data.size === 0) return;
        const state = multipartStateRef.current;
        if (state.isAborted) return;

        state.buffer.push(event.data);
        state.bufferSize += event.data.size;

        if (state.bufferSize >= MIN_PART_BYTES) {
            const chunk = new Blob(state.buffer, { type: "video/webm" });
            state.buffer = [];
            state.bufferSize = 0;
            schedulePartUpload(chunk);
        }
    }, [schedulePartUpload]);

    const startRecording = useCallback(async (cameraStream: MediaStream) => {
        try {
            const initRes = await fetch("/api/s3/multipart/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interviewId }),
            });

            if (!initRes.ok) {
                console.error("Failed to initialize multipart upload");
                return false;
            }

            const { uploadId, key, uploadToken } = await initRes.json();
            multipartStateRef.current.uploadId = uploadId;
            multipartStateRef.current.key = key;
            multipartStateRef.current.uploadToken = uploadToken;
            multipartStateRef.current.videoCompletionToken = null;
            multipartStateRef.current.partNumber = 1;
            multipartStateRef.current.parts = [];
            multipartStateRef.current.buffer = [];
            multipartStateRef.current.bufferSize = 0;
            multipartStateRef.current.partUploadPromises = [];
            multipartStateRef.current.isAborted = false;
            multipartStateRef.current.isCompleting = false;
            multipartStateRef.current.hasPartFailure = false;
            multipartStateRef.current.uploadQueue = Promise.resolve();

            recordingStreamRef.current = cameraStream;

            let mimeType = "video/webm;codecs=vp8,opus";
            if (typeof MediaRecorder.isTypeSupported === "function" && !MediaRecorder.isTypeSupported(mimeType)) {
                if (MediaRecorder.isTypeSupported("video/webm")) {
                    mimeType = "video/webm";
                } else if (MediaRecorder.isTypeSupported("video/mp4")) {
                    mimeType = "video/mp4";
                } else {
                    mimeType = "";
                }
            }

            const recorderOptions: MediaRecorderOptions = {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
                audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
            };

            const mediaRecorder = new MediaRecorder(cameraStream, recorderOptions);
            mediaRecorder.ondataavailable = handleDataAvailable;

            const videoTrack = cameraStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    setIsRecordingVideo(false);
                    onRecordingEnded?.();
                    if (mediaRecorder.state !== "inactive") {
                        mediaRecorder.stop();
                    }
                };
            }

            mediaRecorder.start(1000);
            mediaRecorderRef.current = mediaRecorder;
            setIsRecordingVideo(true);

            return true;
        } catch (err: unknown) {
            console.error("Failed to start recording:", err);
            return false;
        }
    }, [interviewId, onRecordingEnded, handleDataAvailable]);

    const stopVideoRecording = useCallback((): Promise<{ videoKey: string; videoCompletionToken: string } | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            const state = multipartStateRef.current;

            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                setIsRecordingVideo(false);
                resolve(null);
                return;
            }

            // Mark completing before onstop so a route change/unmount does not abort S3 upload.
            state.isCompleting = true;

            mediaRecorder.onstop = () => {
                setIsRecordingVideo(false);

                // Clean up track listeners (don't stop tracks — they belong to the media hook)
                if (recordingStreamRef.current) {
                    recordingStreamRef.current.getVideoTracks().forEach(track => { track.onended = null; });
                    recordingStreamRef.current = null;
                }

                const finalBlob = state.buffer.length > 0 ? new Blob(state.buffer, { type: "video/webm" }) : null;
                state.buffer = [];
                state.bufferSize = 0;

                const finalize = async () => {
                    await Promise.all(state.partUploadPromises);

                    if (finalBlob && finalBlob.size > 0 && state.uploadId && state.key && state.uploadToken && !state.hasPartFailure) {
                        try {
                            await flushBuffer(finalBlob, state.partNumber++);
                        } catch (err) {
                            console.error("Multipart upload final part failed:", err);
                            state.hasPartFailure = true;
                        }
                    }

                    if (state.hasPartFailure) {
                        console.warn("One or more multipart upload parts failed; aborting upload", { interviewId });
                        if (state.uploadId && state.key && state.uploadToken) {
                            state.isAborted = true;
                            await fetch("/api/s3/multipart/complete", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    interviewId,
                                    key: state.key,
                                    uploadId: state.uploadId,
                                    uploadToken: state.uploadToken,
                                    action: "abort",
                                }),
                            }).catch((abortErr) => {
                                console.error("Failed to abort multipart upload after part failure:", abortErr);
                            });
                        }
                        resolve(null);
                        return;
                    }

                    state.parts.sort((a, b) => a.PartNumber - b.PartNumber);

                    if (state.uploadId && state.key && state.uploadToken && state.parts.length > 0) {
                        const compRes = await fetch("/api/s3/multipart/complete", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                interviewId,
                                key: state.key,
                                uploadId: state.uploadId,
                                uploadToken: state.uploadToken,
                                parts: state.parts,
                            }),
                        });
                        if (compRes.ok) {
                            const { videoCompletionToken } = await compRes.json();
                            if (!videoCompletionToken) {
                                throw new Error("Backend did not return a video completion token");
                            }
                            state.videoCompletionToken = videoCompletionToken;
                            resolve({ videoKey: state.key, videoCompletionToken });
                            return;
                        }
                    }
                    resolve(null);
                };

                void finalize().catch((err) => {
                    console.error("Failed to finish multipart upload", err);
                    resolve(null);
                });
            };

            mediaRecorder.stop();
        });
    }, [flushBuffer, interviewId]);

    return {
        isRecordingVideo,
        startRecording,
        stopVideoRecording,
    };
}
