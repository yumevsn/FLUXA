import { useEffect, useMemo, useRef, useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { play, stopwatchOutline } from 'ionicons/icons';
import {
  formatTime,
  getYouTubeEndTime,
  getYouTubeId,
  getYouTubeStartTime,
  parseTime,
  withYouTubeTimes,
} from '../utils/youtube';

interface Props {
  url: string;
  /** Called with the link rewritten to include the new start/end times */
  onChange: (url: string) => void;
}

/**
 * Plays the video inline so the learner can pause at the right moment and
 * capture the exact start (and optional end) time into the link.
 *
 * Talks to the embedded player over its postMessage channel (what YouTube's
 * iframe_api script does internally) instead of loading that script: no extra
 * download, and it keeps working where www.youtube.com redirects to a cookie
 * consent page (e.g. the desktop app's fresh web view).
 * Typing the times still works if the player can't load (e.g. offline).
 */
const YoutubeClipEditor = ({ url, onChange }: Props) => {
  const id = getYouTubeId(url);
  const start = getYouTubeStartTime(url);
  const end = getYouTubeEndTime(url);

  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [now, setNow] = useState(0);
  const nowRef = useRef(0);
  const stopAt = useRef(0);
  const [startText, setStartText] = useState(start ? formatTime(start) : '');
  const [endText, setEndText] = useState(end ? formatTime(end) : '');
  const [error, setError] = useState<string | null>(null);

  // Keep the text fields in step when the link changes from outside
  useEffect(() => setStartText(start ? formatTime(start) : ''), [start]);
  useEffect(() => setEndText(end ? formatTime(end) : ''), [end]);

  // The player is built once per video. Changing the times must not reload it,
  // so the start time is only read when the video itself changes.
  const src = useMemo(() => {
    if (!id) return '';
    const params = new URLSearchParams({
      enablejsapi: '1',
      origin: window.location.origin,
      start: String(start),
      playsinline: '1',
      rel: '0',
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  }, [id]);

  const post = (message: object) =>
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ ...message, id: 1, channel: 'widget' }),
      '*'
    );
  const command = (func: string, args: unknown[] = []) => post({ event: 'command', func, args });

  // Listen for the player's state updates (current time, ready)
  useEffect(() => {
    readyRef.current = false;
    setReady(false);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      let data: { event?: string; info?: { currentTime?: number } | null };
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!readyRef.current && (data.event === 'onReady' || data.event === 'initialDelivery' || data.info)) {
        readyRef.current = true;
        setReady(true);
      }
      const t = data.info?.currentTime;
      if (typeof t === 'number') {
        nowRef.current = t;
        setNow(t);
        if (stopAt.current && t >= stopAt.current) {
          command('pauseVideo');
          stopAt.current = 0;
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id]);

  // Once the embed has loaded, ask it to start sending updates
  const handleLoad = () => {
    let tries = 0;
    const timer = window.setInterval(() => {
      if (readyRef.current || tries++ > 40) {
        window.clearInterval(timer);
        return;
      }
      post({ event: 'listening' });
    }, 250);
  };

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
    const t = Math.floor(nowRef.current);
    if (which === 'start') apply(t, end && end <= t ? 0 : end);
    else apply(start, t);
  };

  const playClip = () => {
    command('seekTo', [start, true]);
    command('playVideo');
    stopAt.current = end;
  };

  return (
    <div className="clip-editor">
      <div className="youtube-embed">
        <iframe
          ref={frame}
          src={src}
          title="YouTube video"
          onLoad={handleLoad}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="clip-now">
        {ready ? (
          <>
            Video is at <strong>{formatTime(now)}</strong>. Pause where the question starts, then tap{' '}
            <em>Use current time</em>.
          </>
        ) : navigator.onLine ? (
          'Loading player…'
        ) : (
          'You are offline, so the video can’t play. You can still type the times.'
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
