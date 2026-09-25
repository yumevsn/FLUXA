import { useEffect, useRef, useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { pause, play } from 'ionicons/icons';

interface Props {
  src?: string | null;
  autoPlay?: boolean;
  size?: 'default' | 'large';
}

const AudioPlayer = ({ src, autoPlay = false, size = 'default' }: Props) => {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audio.current;
    if (!el || !src) return;
    setPlaying(false);
    if (autoPlay) el.play().catch(() => undefined); // may be blocked without a gesture
    return () => el.pause();
  }, [src, autoPlay]);

  if (src === null) return <p className="muted">Audio file missing.</p>;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't flip the card in review
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.currentTime = el.ended ? 0 : el.currentTime;
      el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  };

  return (
    <div className={`audio-player ${size}`}>
      <IonButton
        shape="round"
        size={size === 'large' ? 'large' : 'default'}
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? 'Pause' : 'Play recording'}
      >
        <IonIcon slot="icon-only" icon={playing ? pause : play} />
      </IonButton>
      <audio
        ref={audio}
        src={src ?? undefined}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
};

export default AudioPlayer;
