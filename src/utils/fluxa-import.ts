import JSZip from 'jszip';
import { v4 as uuid } from 'uuid';
import { db, Card, CardType, Deck } from '../db/db';
import { deleteMedia, extFromPath, saveMedia } from './media-storage';
import type { FluxaCardJson, FluxaDeckJson } from './fluxa-export';

export class FluxaImportError extends Error {}

export const INVALID_FILE = "This doesn't look like a FLUXA file.";
export const DAMAGED_FILE = 'The file appears to be damaged.';

export interface ImportResult {
  deck: Deck;
  /** Cards whose image or audio file was missing from the zip */
  missingMedia: number;
  /** Cards skipped because their type was not recognised */
  skipped: number;
}

const CARD_TYPES: CardType[] = ['text', 'image', 'audio', 'youtube'];

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const toMs = (v: unknown): number => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? Date.now() : t;
};

/** Import one .fluxa file (a zip containing deck.json + images/ + audio/). */
export const importFluxaFile = async (file: Blob | ArrayBuffer): Promise<ImportResult> => {
  // 1. Unzip
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new FluxaImportError(INVALID_FILE);
  }

  const deckFile = zip.file('deck.json');
  if (!deckFile) throw new FluxaImportError(INVALID_FILE);

  // 2. Parse and validate deck.json
  let parsed: FluxaDeckJson;
  try {
    parsed = JSON.parse(await deckFile.async('string'));
  } catch {
    throw new FluxaImportError(DAMAGED_FILE);
  }
  if (
    !parsed ||
    typeof parsed.fluxa_version !== 'string' ||
    !parsed.fluxa_version.startsWith('1.') ||
    typeof parsed.deck !== 'object' ||
    parsed.deck === null ||
    !Array.isArray(parsed.cards)
  ) {
    throw new FluxaImportError(INVALID_FILE);
  }

  // 3. Fresh IDs for the deck and every card
  const now = Date.now();
  const deck: Deck = {
    id: uuid(),
    name: str(parsed.deck.name).trim() || 'Imported deck',
    language: str(parsed.deck.language).trim(),
    description: str(parsed.deck.description).trim() || undefined,
    cardCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const cards: Card[] = [];
  const savedPaths: string[] = [];
  let missingMedia = 0;
  let skipped = 0;

  for (const raw of parsed.cards as FluxaCardJson[]) {
    if (!raw || !CARD_TYPES.includes(raw.type)) {
      skipped++;
      continue;
    }
    const id = uuid();
    const card: Card = {
      id,
      deckId: deck.id,
      type: raw.type,
      front: raw.type === 'text' ? str(raw.front) : str(raw.front_label) || str(raw.front),
      back: str(raw.back),
      createdAt: toMs(raw.created_at),
    };

    // 4 + 5. Images and audio: copy from the zip onto the device filesystem
    if (raw.type === 'image' || raw.type === 'audio') {
      const name = str(raw.type === 'image' ? raw.image_filename : raw.audio_filename);
      const entry = name ? zip.file(name) : null;
      if (entry) {
        const base64 = await entry.async('base64');
        card.mediaPath = await saveMedia(id, base64, extFromPath(name) || 'bin');
        savedPaths.push(card.mediaPath);
      } else {
        missingMedia++;
      }
    }

    // 6. YouTube: URL only
    if (raw.type === 'youtube') card.youtubeUrl = str(raw.youtube_url);

    cards.push(card);
  }

  deck.cardCount = cards.length;

  // 7. Write deck and cards in one transaction
  try {
    await db.transaction('rw', db.decks, db.cards, async () => {
      await db.decks.add(deck);
      await db.cards.bulkAdd(cards);
    });
  } catch (e) {
    await Promise.all(savedPaths.map((p) => deleteMedia(p)));
    throw e;
  }

  return { deck, missingMedia, skipped };
};
