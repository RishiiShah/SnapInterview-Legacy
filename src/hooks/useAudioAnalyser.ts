"use client";

import { useState, useEffect } from "react";

export function useAudioAnalyser(stream: MediaStream | null, isEnabled: boolean) {
    const [audioLevels, setAudioLevels] = useState<[number, number, number]>([0, 0, 0]);

    useEffect(() => {
        if (!stream || !isEnabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAudioLevels([0, 0, 0]);
            return;
        }

        let animationId = 0;
        let source: MediaStreamAudioSourceNode | null = null;
        let analyser: AnalyserNode | null = null;
        let audioContext: AudioContext | null = null;

        try {
            const LegacyWindow = window as unknown as Window & {
                webkitAudioContext?: typeof AudioContext;
            };
            const AudioContextCtor = window.AudioContext ?? LegacyWindow.webkitAudioContext;
            if (!AudioContextCtor) {
                return;
            }

            audioContext = new AudioContextCtor();
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                if (!analyser) return;
                analyser.getByteFrequencyData(dataArray);

                // Split frequencies into 3 buckets (low, mid, high)
                const bucketSize = Math.floor(dataArray.length / 3);
                let low = 0, mid = 0, high = 0;

                for (let i = 0; i < bucketSize; i++) low += dataArray[i];
                for (let i = bucketSize; i < bucketSize * 2; i++) mid += dataArray[i];
                for (let i = bucketSize * 2; i < dataArray.length; i++) high += dataArray[i];

                low = low / bucketSize;
                mid = mid / bucketSize;
                high = high / (dataArray.length - bucketSize * 2);

                // Scale to 0-100, emphasizing whispers and snaps a bit more for responsiveness
                setAudioLevels([
                    Math.min(100, (low / 255) * 180),
                    Math.min(100, (mid / 255) * 200),
                    Math.min(100, (high / 255) * 220)
                ]);
                animationId = requestAnimationFrame(updateLevel);
            };

            updateLevel();

            return () => {
                cancelAnimationFrame(animationId);
                source?.disconnect();
                analyser?.disconnect();
                void audioContext?.close();
            };

        } catch (err) {
            console.error("Failed to set up audio analyser:", err);
            return () => {
                cancelAnimationFrame(animationId);
                source?.disconnect();
                analyser?.disconnect();
                void audioContext?.close();
            };
        }
    }, [stream, isEnabled]);

    return audioLevels;
}
