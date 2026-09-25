import { useEffect, useRef, useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { play, stopwatchOutline } from 'ionicons/icons';
import {
  formatTime,
  getYouTubeEndTime,
  getYouTubeId,
  getYouTubeStartTime,
  getYouTubeThumbnail,
  parseTime,
  withYouTubeTimes,
} from '../utils/youtube';

// Minimal typing for the parts of the YouTube IFrame Player API we use
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void };
    }
  ) => YTPlayer;
}
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let apiLoading: Promise<YTNamespace> | null = null;

const loadYouTubeApi = (): Promise<YTNamespace> => {
  apiLoading ??= new Promise<YTNamespace>((resolve, reject) => {
    const w = window as YTWindow;
    if (w.YT?.Player) return resolve(w.YT);
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(w.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      apiLoading = null;
      reject(new Error('YouTube player unavailable'));
    };
    document.head.appendChild(script);
  });
  return apiLoading;
};

interface Props {
  url: string;
  /** Called with the link rewritten to include the new start/end times */
  onChange: (url: string) => void;
}

/**
 * Plays the video inline so the learner can pause at the right moment and
 * capture the exact start (and optional end) time into the link.
 * Falls back to typing times when the player can't load (e.g. offline).
 */
const YoutubeClipEditor = ({ url, onChange }: Props) => {
  const id = getYouTubeId(url);
  const start = getYouTubeStartTime(url);
  const end = getYouTubeEndTime(url);

  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  const [startText, setStartText] = useState(start ? formatTime(start) : '');
  const [endText, setEndText] = useState(end ? formatTime(end) : '');
  const [error, setError] = useState<string | null>(null);
  const stopAt = useRef<number>(0);

  // Keep the text fields in step when the link changes from outside
  useEffect(() => setStartText(start ? formatTime(start) : ''), [start]);
  useEffect(() => setEndText(end ? formatTime(end) : ''), [end]);

  // Create the player once per video
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setReady(false);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const target = document.createElement('div');
        host.current.replaceChildren(target);
        player.current = new YT.Player(target, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { start, playsinline: 1, rel: 0, modestbranding: 1 },
          events: { onReady: () => !cancelled && setReady(true) },
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
    // Only re-create when the video itself changes, not when times change
  }, [id]);

  // Live position readout, and stop at the end time when previewing the clip
  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const t = player.current?.getCurrentTime() ?? 0;
      setNow(t);
      if (stopAt.current && t >= stopAt.current) {
        player.current?.pauseVideo();
        stopAt.current = 0;
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [ready]);

  if (!id) return null;

  const apply = (nextStart: number, nextEnd: number) => {
    if (nextEnd && nextEnd <= nextStart) {
      setError('The end time must be after the start time.');
      return;
    }
    setError(null);
    onChange(withYouTubeTimes(url, nextStart, nextEnd));
  };

  const commitText = (which: 'start' | 'end', text: string) => {
    const value = text.trim() ? parseTime(text) : 0;
    if (value === null) {
      setError('Use a time like 1:24 or 84.');
      return;
    }
    if (which === 'start') apply(value, end);
    else apply(start, value);
  };

  const captureCurrent = (which: 'start' | 'end') => {
    const t = Math.floor(player.current?.getCurrentTime() ?? 0);
    if (which === 'start') apply(t, end && end <= t ? 0 : end);
    else apply(start, t);
  };

  const playClip = () => {
    player.current?.seekTo(start, true);
    player.current?.playVideo();
    stopAt.current = end;
  };

  return (
    <div className="clip-editor">
      {failed ? (
        <img className="image-preview" src={getYouTubeThumbnail(id)} alt="Video thumbnail" />
      ) : (
        <div className="youtube-embed">
          <div ref={host} className="clip-player" />
        </div>
      )}

      <div className="clip-now">
        {ready ? (
          <>
            Video is at <strong>{formatTime(now)}</strong>. Pause where the question starts, then tap{' '}
            <em>Use current time</em>.
          </>
        ) : failed ? (
          'The player could not load (are you offline?). You can still type the times.'
        ) : (
          'Loading player…'
        )}
      </div>

      <div className="clip-fields">
        <label className="clip-field">
          <span>Start</span>
          <input
            inputMode="numeric"
            placeholder="0:00"
            value={startText}
            onChange={(e) => setStartText(e.target.value)}
            onBlur={(e) => commitText('start', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitText('start', e.currentTarget.value)}
          />
          <IonButton size="small" fill="outline" disabled={!ready} onClick={() => captureCurrent('start')}>
            <IonIcon slot="start" icon={stopwatchOutline} />
            Use current time
          </IonButton>
        </label>
        <label className="clip-field">
          <span>End (optional)</span>
          <input
            inputMode="numeric"
            placeholder="none"
            value={endText}
            onChange={(e) => setEndText(e.target.value)}
            onBlur={(e) => commitText('end', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitText('end', e.currentTarget.value)}
          />
          <IonButton size="small" fill="outline" disabled={!ready} onClick={() => captureCurrent('end')}>
            <IonIcon slot="start" icon={stopwatchOutline} />
            Use current time
          </IonButton>
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <IonButton size="small" fill="clear" disabled={!ready} onClick={playClip}>
        <IonIcon slot="start" icon={play} />
        {end ? `Play clip ${formatTime(start)} – ${formatTime(end)}` : `Play from ${formatTime(start)}`}
      </IonButton>
    </div>
  );
};

export default YoutubeClipEditor;
