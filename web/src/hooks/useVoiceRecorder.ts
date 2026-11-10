"use client";

import { useEffect, useRef, useState } from "react";

/** Records with MediaRecorder and hands the finished clip to `onRecorded`. */
export function useVoiceRecorder(onRecorded: (file: File) => void) {
  const [recordingSeconds, setRecordingSeconds] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const isRecording = recordingSeconds !== null;

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordingSeconds((s) => (s ?? 0) + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => () => recorderRef.current?.stop(), []);

  const toggleRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        setRecordingSeconds(null);
        if (!chunks.length) return;
        const type = recorder.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onRecorded(new File(chunks, `voice-message.${ext}`, { type }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
    } catch {
      alert("Microphone access is needed to record a voice message.");
    }
  };

  return { recordingSeconds, isRecording, toggleRecording };
}
