import { useRef, useState, useCallback } from "react";

export function useVideoRecording() {
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobChunk[]>([]);

    // Use a type alias just in case BlobPart isn't exactly mapping cleanly for folks
    type BlobChunk = Blob;

    const startVideoRecording = useCallback((stream: MediaStream) => {
        if (!stream) return;

        try {
            chunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp8,opus",
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(1000); // collect data every second
            mediaRecorderRef.current = mediaRecorder;
            setIsRecordingVideo(true);
        } catch (err) {
            console.error("Failed to start video recording:", err);
        }
    }, []);

    const stopVideoRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                resolve(null);
                return;
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                setIsRecordingVideo(false);
                chunksRef.current = [];
                resolve(blob);
            };

            mediaRecorder.stop();
        });
    }, []);

    return {
        isRecordingVideo,
        startVideoRecording,
        stopVideoRecording,
    };
}
