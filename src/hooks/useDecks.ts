import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db, Deck } from '../db/db';
import { deleteMedia } from '../utils/media-storage';

export interface NewDeck {
  name: string;
  language: string;
  description?: string;
}

export const createDeck = async (input: NewDeck): Promise<Deck> => {
  const now = Date.now();
  const deck: Deck = {
    id: uuid(),
    name: input.name.trim(),
    language: input.language.trim(),
    description: input.description?.trim() || undefined,
    cardCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.decks.add(deck);
  return deck;
};

export const updateDeck = (id: string, changes: Partial<Omit<Deck, 'id'>>) =>
  db.decks.update(id, { ...changes, updatedAt: Date.now() });

export const deleteDeck = async (id: string): Promise<void> => {
  const cards = await db.cards.where('deckId').equals(id).toArray();
  await Promise.all(cards.map((c) => deleteMedia(c.mediaPath)));
  await db.transaction('rw', db.decks, db.cards, async () => {
    await db.cards.where('deckId').equals(id).delete();
    await db.decks.delete(id);
  });
};

/** All decks, newest first. `undefined` while loading. */
export const useDecks = () =>
  useLiveQuery(() => db.decks.orderBy('createdAt').reverse().toArray(), []);

/** `undefined` while loading, `null` if the deck does not exist. */
export const useDeck = (id: string) =>
  useLiveQuery(async () => (await db.decks.get(id)) ?? null, [id]);
