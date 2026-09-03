import { useCallback, useEffect, useRef, useState } from "react";

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
  mountVideoNode: (node: HTMLVideoElement | null) => void;
  requestPermissions: () => Promise<void>;
  stopStream: () => void;
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  selectedVideoInputId: string;
  selectAudioInput: (deviceId: string) => void;
  selectAudioOutput: (deviceId: string) => void;
  selectVideoInput: (deviceId: string) => void;
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
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState("");
  const [selectedVideoInputId, setSelectedVideoInputId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setStreamSafe = (s: MediaStream | null) => {
    setStream(s);
    streamRef.current = s;
  };

  const stopTracks = (targetStream: MediaStream | null) => {
    if (!targetStream) return;
    targetStream.getTracks().forEach((track) => {
      track.stop();
      track.enabled = false;
    });
  };

  const buildConstraints = (withVideo: boolean, withAudio: boolean): MediaStreamConstraints => ({
    audio: withAudio
      ? (selectedAudioInputId
        ? { deviceId: { exact: selectedAudioInputId } }
        : true)
      : false,
    video: withVideo
      ? (selectedVideoInputId
        ? { deviceId: { exact: selectedVideoInputId } }
        : { facingMode: "user" })
      : false,
  });

  const attachStreamToVideo = (mediaStream: MediaStream | null) => {
    if (!videoRef.current) return;
    if (!mediaStream) videoRef.current.pause();
    videoRef.current.srcObject = mediaStream;
    videoRef.current.style.opacity = isCameraEnabled ? "1" : "0";
  };

  const replaceStream = (nextStream: MediaStream | null) => {
    const previousStream = streamRef.current;
    setStreamSafe(nextStream);
    attachStreamToVideo(nextStream);
    stopTracks(previousStream);
  };

  const applyAudioOutputToVideoElement = useCallback(async (deviceId: string) => {
    if (!videoRef.current || !deviceId) return;
    const elementWithSink = videoRef.current as HTMLVideoElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };

    if (typeof elementWithSink.setSinkId !== "function") return;

    try {
      await elementWithSink.setSinkId(deviceId);
    } catch {
      // Ignore if browser does not allow sink switching in this context.
    }
  }, []);

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const nextAudioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as MediaDeviceInfo["kind"],
        }));
      const nextAudioOutputs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as MediaDeviceInfo["kind"],
        }));
      const nextVideoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as MediaDeviceInfo["kind"],
        }));

      setAudioInputs(nextAudioInputs);
      setAudioOutputs(nextAudioOutputs);
      setVideoInputs(nextVideoInputs);

      if (!selectedAudioInputId && nextAudioInputs[0]?.deviceId) {
        setSelectedAudioInputId(nextAudioInputs[0].deviceId);
      }
      if (!selectedAudioOutputId && nextAudioOutputs[0]?.deviceId) {
        setSelectedAudioOutputId(nextAudioOutputs[0].deviceId);
      }
      if (!selectedVideoInputId && nextVideoInputs[0]?.deviceId) {
        setSelectedVideoInputId(nextVideoInputs[0].deviceId);
      }
    } catch {
      // ignore
    }
  };

  const requestMediaStream = async ({ withVideo, withAudio }: { withVideo: boolean; withAudio: boolean }) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia(buildConstraints(withVideo, withAudio));
    replaceStream(mediaStream);

    if (withAudio) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = isMicEnabled;
      });
    }
    setIsCameraEnabled(withVideo);
    await refreshDevices();
    await applyAudioOutputToVideoElement(selectedAudioOutputId);
    return mediaStream;
  };

  const requestPermissions = async () => {
    if (isLoading) return;

    // Must run in secure context (HTTPS or localhost) for getUserMedia to show prompts
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Microphone access requires a secure connection. Please open this site over HTTPS or from localhost."
      );
      setHasPermission(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support microphone access.");
      setHasPermission(false);
      return;
    }

    // Mic is required; camera stays optional and is enabled later via toggle.
    // Start getUserMedia in the same synchronous turn as the user click so Chrome shows the prompt.
    const mediaPromise = navigator.mediaDevices.getUserMedia(buildConstraints(false, true));

    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await mediaPromise;
      setHasPermission(true);
      replaceStream(mediaStream);
      setIsMicEnabled(true);
      setIsCameraEnabled(false);
      await refreshDevices();
      await applyAudioOutputToVideoElement(selectedAudioOutputId);
    } catch (err: unknown) {
      setHasPermission(false);
      const isNotAllowed =
        err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setError(
        isNotAllowed
          ? "Microphone permission is necessary. Please refresh the page and allow access."
          : err instanceof DOMException
            ? err.message
            : "Failed to get microphone access."
      );
      console.error("Media permission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = () => {
    const activeStream = streamRef.current;
    stopTracks(activeStream);
    setStreamSafe(null);

    if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.srcObject) {
        const mediaStream = videoRef.current.srcObject as MediaStream;
        stopTracks(mediaStream);
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
    const previousState = isCameraEnabled;
    const newState = !isCameraEnabled;
    setIsCameraEnabled(newState);
    setError(null);

    requestMediaStream({ withVideo: newState, withAudio: true }).catch((err) => {
      setIsCameraEnabled(previousState);
      setError(newState ? "Failed to re-enable camera. Reverting to microphone only." : "Failed to switch to microphone-only mode.");
      console.error("Camera toggle error:", err);
    });
  };

  const selectAudioInput = (deviceId: string) => {
    const previousId = selectedAudioInputId;
    setSelectedAudioInputId(deviceId);
    if (!streamRef.current) return;

    setError(null);
    navigator.mediaDevices
      .getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: isCameraEnabled
          ? (selectedVideoInputId
            ? { deviceId: { exact: selectedVideoInputId } }
            : { facingMode: "user" })
          : false,
      })
      .then((mediaStream) => {
        replaceStream(mediaStream);
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = isMicEnabled;
        });
      })
      .catch((err) => {
        setSelectedAudioInputId(previousId);
        setError("Failed to switch microphone. Reverting to previous device.");
        console.error("Audio input switch error:", err);
      });
  };

  const selectAudioOutput = (deviceId: string) => {
    setSelectedAudioOutputId(deviceId);
    void applyAudioOutputToVideoElement(deviceId);
  };

  const selectVideoInput = (deviceId: string) => {
    const previousId = selectedVideoInputId;
    setSelectedVideoInputId(deviceId);
    if (!streamRef.current || !isCameraEnabled) return;

    setError(null);
    navigator.mediaDevices
      .getUserMedia({
        audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId } } : true,
        video: { deviceId: { exact: deviceId } },
      })
      .then((mediaStream) => {
        replaceStream(mediaStream);
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = isMicEnabled;
        });
      })
      .catch((err) => {
        setSelectedVideoInputId(previousId);
        setError("Failed to switch camera. Reverting to previous device.");
        console.error("Video input switch error:", err);
      });
  };

  // Sync video element opacity with camera state
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.style.opacity = isCameraEnabled ? "1" : "0";
    }
  }, [isCameraEnabled, stream]);

  useEffect(() => {
    if (!selectedAudioOutputId) return;
    void applyAudioOutputToVideoElement(selectedAudioOutputId);
  }, [applyAudioOutputToVideoElement, selectedAudioOutputId]);

  const mountVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
    }
  }, []);

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
    mountVideoNode,
    requestPermissions,
    stopStream,
    audioInputs,
    audioOutputs,
    videoInputs,
    isMicEnabled,
    isCameraEnabled,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
    toggleMic,
    toggleCamera,
  };
}
