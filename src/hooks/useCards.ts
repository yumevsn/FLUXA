import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db, Card, CardType } from '../db/db';
import { deleteMedia, saveMedia } from '../utils/media-storage';

export interface NewCard {
  type: CardType;
  front: string;
  back: string;
  youtubeUrl?: string;
  /** base64 (or data URL) of the image/audio to store on the filesystem */
  media?: { base64: string; ext: string };
}

const refreshCardCount = async (deckId: string) => {
  const count = await db.cards.where('deckId').equals(deckId).count();
  await db.decks.update(deckId, { cardCount: count, updatedAt: Date.now() });
};

export const createCard = async (deckId: string, input: NewCard): Promise<Card> => {
  const id = uuid();
  const mediaPath = input.media
    ? await saveMedia(id, input.media.base64, input.media.ext)
    : undefined;
  const card: Card = {
    id,
    deckId,
    type: input.type,
    front: input.front.trim(),
    back: input.back.trim(),
    mediaPath,
    youtubeUrl: input.youtubeUrl?.trim() || undefined,
    createdAt: Date.now(),
  };
  await db.cards.add(card);
  await refreshCardCount(deckId);
  return card;
};

export const updateCard = (id: string, changes: Partial<Omit<Card, 'id' | 'deckId'>>) =>
  db.cards.update(id, changes);

export const deleteCard = async (card: Card): Promise<void> => {
  await deleteMedia(card.mediaPath);
  await db.cards.delete(card.id);
  await refreshCardCount(card.deckId);
};

/** Cards in a deck, oldest first. `undefined` while loading. */
export const useCards = (deckId: string) =>
  useLiveQuery(() => db.cards.where('deckId').equals(deckId).sortBy('createdAt'), [deckId]);

/** `undefined` while loading, `null` if the card does not exist. */
export const useCard = (id: string) =>
  useLiveQuery(async () => (await db.cards.get(id)) ?? null, [id]);
