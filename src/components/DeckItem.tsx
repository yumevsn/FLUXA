import { Deck } from '../db/db';
import { useLongPress } from '../hooks/useLongPress';

interface Props {
  deck: Deck;
  onOpen: () => void;
  onLongPress: () => void;
}

export const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const DeckItem = ({ deck, onOpen, onLongPress }: Props) => {
  const press = useLongPress(onLongPress, onOpen);
  return (
    <button className="surface-card deck-item" {...press}>
      <div className="deck-item-name">{deck.name}</div>
      <div className="meta-row">
        {deck.language && <span className="tag">{deck.language}</span>}
        <span className="muted">
          {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
        </span>
        <span className="muted">· {formatDate(deck.createdAt)}</span>
      </div>
    </button>
  );
};

export default DeckItem;
