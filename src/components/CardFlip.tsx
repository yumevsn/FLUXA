import { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { documentTextOutline, imageOutline, logoYoutube, micOutline } from 'ionicons/icons';
import { Card, CardType } from '../db/db';
import { useMediaUrl } from '../hooks/useMediaUrl';
import AudioPlayer from './AudioPlayer';
import YoutubeEmbed from './YoutubeEmbed';

export const TYPE_META: Record<CardType, { icon: string; label: string }> = {
  text: { icon: documentTextOutline, label: 'Text' },
  image: { icon: imageOutline, label: 'Image' },
  audio: { icon: micOutline, label: 'Audio' },
  youtube: { icon: logoYoutube, label: 'Video' },
};

/** The front of a card: text, image, audio or YouTube, plus its label. */
export const CardFront = ({ card, autoPlay = false }: { card: Card; autoPlay?: boolean }) => {
  const mediaUrl = useMediaUrl(card.type === 'image' || card.type === 'audio' ? card.mediaPath : undefined);

  if (card.type === 'text') return <div className="front-text">{card.front}</div>;

  return (
    <div className="front-media">
      {card.type === 'image' &&
        (mediaUrl ? (
          <img className="front-image" src={mediaUrl} alt={card.front || 'Card image'} />
        ) : mediaUrl === null ? (
          <p className="muted">Image file missing.</p>
        ) : (
          <div className="front-image placeholder" />
        ))}
      {card.type === 'audio' && <AudioPlayer src={mediaUrl} autoPlay={autoPlay} size="large" />}
      {card.type === 'youtube' && card.youtubeUrl && <YoutubeEmbed url={card.youtubeUrl} />}
      {card.front && <div className="front-label">{card.front}</div>}
    </div>
  );
};

/** Small header shown at the top of each card face. */
export const FaceHeader = ({ side, type, note }: { side: 'Question' | 'Answer'; type: CardType; note?: string }) => (
  <div className="face-header">
    <span className={`face-pill ${side === 'Answer' ? 'answer' : ''}`}>{side}</span>
    <span className="face-type">
      <IonIcon icon={TYPE_META[type].icon} aria-hidden />
      {TYPE_META[type].label}
    </span>
    {note && <span className="face-note">{note}</span>}
  </div>
);

interface Props {
  card: Card;
  flipped: boolean;
  onToggle: () => void;
  showHint?: boolean;
  /** e.g. "4 / 12" shown in the corner of each face */
  position?: string;
  /** Number of cards stacked underneath (0–2 drawn) */
  stackDepth?: number;
}

export const FLIP_MS = 520;

/**
 * Two-sided review card that turns over in 3D. Tap the card (or press Space /
 * the Flip button) to turn it; tap again to see the question.
 * The face turned away is hidden once it is edge-on, so embedded video and
 * audio never show through from behind.
 * Give it a new `key` per review step so the next card starts face up.
 */
const CardFlip = ({ card, flipped, onToggle, showHint, position, stackDepth = 0 }: Props) => {
  const [hidden, setHidden] = useState<'front' | 'back'>(flipped ? 'front' : 'back');
  const [anim, setAnim] = useState<'to-back' | 'to-front' | null>(null);
  const shown = useRef(flipped); // side currently facing up
  const halfway = useRef<number>();
  const done = useRef<number>();

  useEffect(() => {
    if (shown.current === flipped) return; // mount (and StrictMode re-run): no turn
    shown.current = flipped;
    window.clearTimeout(halfway.current);
    window.clearTimeout(done.current);
    // The card is only 3D while it turns. At rest it lies flat, because Chrome
    // won't paint iframes (YouTube) inside a hidden-backface 3D face.
    setAnim(flipped ? 'to-back' : 'to-front');
    // Swap which face is hidden at the moment the card is edge-on
    halfway.current = window.setTimeout(() => setHidden(flipped ? 'front' : 'back'), FLIP_MS / 2);
    done.current = window.setTimeout(() => setAnim(null), FLIP_MS);
    return () => {
      window.clearTimeout(halfway.current);
      window.clearTimeout(done.current);
    };
  }, [flipped]);

  return (
    <div className={`flip-scene stack-${Math.min(stackDepth, 2)}`}>
      <div
        className={`flip-card ${anim ? `animating anim-${anim}` : ''}`}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? 'Answer. Tap to see the question again.' : 'Question. Tap to flip.'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className={`card-face face-front ${hidden === 'front' ? 'face-hidden' : ''}`}>
          <FaceHeader side="Question" type={card.type} note={position} />
          <div className="face-body">
            <CardFront card={card} autoPlay={!flipped} />
          </div>
          {showHint && <div className="flip-hint">Tap the card or press Flip</div>}
        </div>

        <div className={`card-face face-back ${hidden === 'back' ? 'face-hidden' : ''}`}>
          <FaceHeader side="Answer" type={card.type} note={position} />
          {card.front && <div className="back-echo">{card.front}</div>}
          <div className="face-body">
            <div className="back-text">{card.back}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardFlip;
