import { useEffect, useRef, useState } from "react";

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

interface UseMediaPermissionsReturn {
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  requestPermissions: () => Promise<void>;
  stopStream: () => void;
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
}

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`, kind: d.kind as MediaDeviceInfo["kind"] })));
      setAudioOutputs(devices.filter((d) => d.kind === "audiooutput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 8)}`, kind: d.kind as MediaDeviceInfo["kind"] })));
      setVideoInputs(devices.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 8)}`, kind: d.kind as MediaDeviceInfo["kind"] })));
    } catch {
      // ignore
    }
  };

  const requestPermissions = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support camera or microphone access.");
      setHasPermission(false);
      return;
    }

    // Critical for Chrome: start getUserMedia in the same synchronous turn as the user click.
    // If we setState or await first, the "user gesture" expires and Chrome won't show the prompt.
    const mediaPromise = navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });

    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await mediaPromise;
      setHasPermission(true);
      setStream(mediaStream);
      setIsMicEnabled(true);
      setIsCameraEnabled(true);
      await refreshDevices();

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      setHasPermission(false);
      const isNotAllowed =
        err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      const errorMessage = isNotAllowed
        ? "Browser didn't show the permission prompt. If you previously blocked this site, click the lock or info icon in the address bar → set Camera and Microphone to Allow → refresh and try again. Or try in a private/incognito window."
        : err instanceof DOMException
          ? err.message
          : "Failed to get camera or microphone access.";
      setError(errorMessage);
      console.error("Media permission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const toggleMic = () => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      const newState = !isMicEnabled;
      audioTracks.forEach((track) => {
        track.enabled = newState;
      });
      setIsMicEnabled(newState);
    }
  };

  const toggleCamera = () => {
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const newState = !isCameraEnabled;
      videoTracks.forEach((track) => {
        track.enabled = newState;
      });
      setIsCameraEnabled(newState);
    }
  };

  // Sync video element opacity with camera state
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.style.opacity = isCameraEnabled ? "1" : "0";
    }
  }, [isCameraEnabled, stream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    hasPermission,
    isLoading,
    error,
    stream,
    videoRef,
    requestPermissions,
    stopStream,
    audioInputs,
    audioOutputs,
    videoInputs,
    isMicEnabled,
    isCameraEnabled,
    toggleMic,
    toggleCamera,
  };
}
