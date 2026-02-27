import { useRef, useState, useCallback } from "react";

type UseVideoRecordingOptions = {
    onScreenShareEnded?: () => void;
};

export function useVideoRecording(options?: UseVideoRecordingOptions) {
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobChunk[]>([]);

    // Use a type alias just in case BlobPart isn't exactly mapping cleanly for folks
    type BlobChunk = Blob;

    const startScreenRecording = useCallback(async (micStream?: MediaStream) => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false, // Don't capture system audio, we will use the mic
            });

            const combinedStream = new MediaStream();

            // Add the video tracks from the screen capture
            screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

            // Add the audio tracks from the user's microphone
            if (micStream) {
                micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
            }

            screenStreamRef.current = screenStream;
            chunksRef.current = [];

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: "video/webm;codecs=vp8,opus",
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Handle user clicking "Stop sharing" from browser UI natively
            const screenVideoTrack = screenStream.getVideoTracks()[0];
            screenVideoTrack.onended = () => {
                setIsRecordingVideo(false);
                options?.onScreenShareEnded?.();

                if (mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                }
            };

            mediaRecorder.start(1000); // collect data every second
            mediaRecorderRef.current = mediaRecorder;
            setIsRecordingVideo(true);

            return true;
        } catch (err) {
            console.error("Failed to start screen recording:", err);
            return false;
        }
    }, [options]);

    const stopVideoRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                setIsRecordingVideo(false);
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

            // Also stop all screen tracks to close the "Sharing your screen" indicator
            if (screenStreamRef.current) {
                screenStreamRef.current.getVideoTracks().forEach(track => {
                    track.onended = null;
                });
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }
        });
    }, []);

    return {
        isRecordingVideo,
        startScreenRecording,
        stopVideoRecording,
    };
}
