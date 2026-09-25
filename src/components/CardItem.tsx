import { IonIcon } from '@ionic/react';
import { imageOutline, pulseOutline, logoYoutube } from 'ionicons/icons';
import { Card } from '../db/db';
import { useLongPress } from '../hooks/useLongPress';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { getYouTubeId, getYouTubeThumbnail } from '../utils/youtube';

interface Props {
  card: Card;
  onOpen: () => void;
  onLongPress: () => void;
}

const ImageThumb = ({ path }: { path?: string }) => {
  const url = useMediaUrl(path);
  return url ? (
    <img className="thumb" src={url} alt="" />
  ) : (
    <div className="thumb thumb-icon">
      <IonIcon icon={imageOutline} />
    </div>
  );
};

const YoutubeThumb = ({ url }: { url?: string }) => {
  const id = url ? getYouTubeId(url) : null;
  return id ? (
    <img
      className="thumb thumb-wide"
      src={getYouTubeThumbnail(id)}
      alt=""
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
  ) : (
    <div className="thumb thumb-icon">
      <IonIcon icon={logoYoutube} />
    </div>
  );
};

const CardItem = ({ card, onOpen, onLongPress }: Props) => {
  const press = useLongPress(onLongPress, onOpen);
  const fallback = { image: 'Image card', audio: 'Audio card', youtube: 'YouTube card', text: '' };

  return (
    <button className="surface-card card-item" {...press}>
      {card.type === 'image' && <ImageThumb path={card.mediaPath} />}
      {card.type === 'audio' && (
        <div className="thumb thumb-icon">
          <IonIcon icon={pulseOutline} />
        </div>
      )}
      {card.type === 'youtube' && <YoutubeThumb url={card.youtubeUrl} />}
      <div className="card-item-text">
        <div className="card-item-front">{card.front || fallback[card.type]}</div>
        <div className="muted small clamp-1">{card.back}</div>
      </div>
    </button>
  );
};

export default CardItem;
