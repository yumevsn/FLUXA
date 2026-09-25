import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { refresh, timeOutline } from 'ionicons/icons';
import {
  describeClip,
  getYouTubeEndTime,
  getYouTubeId,
  getYouTubeStartTime,
} from '../utils/youtube';

/**
 * YouTube player for a card. Starts (and optionally stops) at the times saved
 * in the link, shows that clip range, and can replay it from the start time.
 */
const YoutubeEmbed = ({ url }: { url: string }) => {
  const [plays, setPlays] = useState(0);
  const id = getYouTubeId(url);
  if (!id) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open video ↗
      </a>
    );
  }
  const start = getYouTubeStartTime(url);
  const end = getYouTubeEndTime(url);
  const clip = describeClip(url);
  const params = new URLSearchParams({ start: String(start), rel: '0', playsinline: '1' });
  if (end > start) params.set('end', String(end));
  if (plays > 0) params.set('autoplay', '1');

  return (
    <div className="youtube-embed" onClick={(e) => e.stopPropagation()}>
      <iframe
        // Changing the key reloads the player, which jumps back to the start time
        key={plays}
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {clip && (
        <div className="clip-bar">
          <span className="clip-time">
            <IonIcon icon={timeOutline} aria-hidden />
            {clip}
          </span>
          <button type="button" className="clip-replay" onClick={() => setPlays((n) => n + 1)}>
            <IonIcon icon={refresh} aria-hidden />
            Replay clip
          </button>
        </div>
      )}
      {!navigator.onLine && <p className="muted small">Video needs an internet connection.</p>}
    </div>
  );
};

export default YoutubeEmbed;
