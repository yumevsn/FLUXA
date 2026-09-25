import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { extFromMime } from '../utils/media-storage';

export interface Recording {
  base64: string;
  mimeType: string;
  ext: string;
  durationMs: number;
}

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const { value: canRecord } = await VoiceRecorder.canDeviceVoiceRecord();
      if (!canRecord) {
        setError('This device cannot record audio.');
        return false;
      }
      const { value: hasPermission } = await VoiceRecorder.hasAudioRecordingPermission();
      if (!hasPermission) {
        const { value: granted } = await VoiceRecorder.requestAudioRecordingPermission();
        if (!granted) {
          setError('Microphone permission is needed to record.');
          return false;
        }
      }
      await VoiceRecorder.startRecording();
      setRecording(true);
      setElapsed(0);
      const started = Date.now();
      timer.current = window.setInterval(() => setElapsed(Date.now() - started), 250);
      return true;
    } catch {
      setError('Could not start recording. Check microphone permission.');
      return false;
    }
  }, []);

  const stop = useCallback(async (): Promise<Recording | null> => {
    window.clearInterval(timer.current);
    setRecording(false);
    try {
      const { value } = await VoiceRecorder.stopRecording();
      const mimeType = value.mimeType || 'audio/aac';
      return {
        base64: value.recordDataBase64,
        mimeType,
        ext: extFromMime(mimeType, 'm4a'),
        durationMs: value.msDuration,
      };
    } catch {
      setError('Recording failed. Please try again.');
      return null;
    }
  }, []);

  // Make sure the microphone is released if the screen unmounts mid-recording
  useEffect(
    () => () => {
      VoiceRecorder.getCurrentStatus()
        .then(({ status }) => {
          if (status !== 'NONE') return VoiceRecorder.stopRecording();
        })
        .catch(() => undefined);
    },
    []
  );

  return { recording, elapsed, error, start, stop };
};
