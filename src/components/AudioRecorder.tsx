import { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { mic, stop } from 'ionicons/icons';
import { Recording, useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioPlayer from './AudioPlayer';

interface Props {
  onRecorded: (recording: Recording | null) => void;
}

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const AudioRecorder = ({ onRecorded }: Props) => {
  const { recording, elapsed, error, start, stop: stopRecording } = useAudioRecorder();
  const [preview, setPreview] = useState<string | null>(null);

  const toggle = async () => {
    if (recording) {
      const result = await stopRecording();
      if (result) {
        setPreview(`data:${result.mimeType};base64,${result.base64}`);
        onRecorded(result);
      }
    } else {
      if (await start()) {
        setPreview(null);
        onRecorded(null);
      }
    }
  };

  return (
    <div className="recorder">
      <div className="recorder-row">
        <IonButton
          color={recording ? 'danger' : 'primary'}
          onClick={toggle}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          <IonIcon slot="start" icon={recording ? stop : mic} />
          {recording ? 'Stop' : preview ? 'Record again' : 'Record'}
        </IonButton>
        {recording && <span className="recorder-time">● {formatTime(elapsed)}</span>}
        {!recording && preview && <AudioPlayer src={preview} />}
      </div>
      {error && <p className="error-text">{error}</p>}
      {!recording && !preview && !error && (
        <p className="muted small">Tap record to start, tap again to stop.</p>
      )}
    </div>
  );
};

export default AudioRecorder;
