import Dexie, { Table } from 'dexie';

export type CardType = 'text' | 'image' | 'audio' | 'youtube';

export interface Deck {
  id: string;
  name: string;
  language: string;
  description?: string;
  cardCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  type: CardType;
  front: string; // text content OR front label
  back: string; // always text
  mediaPath?: string; // filesystem path for image or audio
  youtubeUrl?: string; // for youtube cards
  createdAt: number;
}

class FluxaDB extends Dexie {
  decks!: Table<Deck>;
  cards!: Table<Card>;

  constructor() {
    super('FluxaDB');
    this.version(1).stores({
      decks: 'id, createdAt',
      cards: 'id, deckId, createdAt',
    });
  }
}

export const db = new FluxaDB();

// Exposed for console testing during development (Build Sequence step 2)
if (import.meta.env.DEV) {
  (window as unknown as { fluxaDb: FluxaDB }).fluxaDb = db;
}
