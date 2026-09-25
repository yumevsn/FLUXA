import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db, Card, Deck } from '../db/db';
import { extFromPath, readMedia } from './media-storage';
import { isDesktopApp } from './platform';

export const FLUXA_VERSION = '1.0';

export interface FluxaCardJson {
  id: string;
  type: Card['type'];
  front?: string;
  front_label?: string;
  back: string;
  image_filename?: string;
  audio_filename?: string;
  youtube_url?: string;
  created_at?: string;
}

export interface FluxaDeckJson {
  fluxa_version: string;
  exported_at: string;
  deck: {
    id: string;
    name: string;
    language: string;
    description: string;
    card_count: number;
    created_at: string;
  };
  cards: FluxaCardJson[];
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Make a deck name safe to use as a filename on every OS. */
export const safeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) ||
  'deck';

/** Build the .fluxa zip for one deck. Missing media files are skipped. */
export const buildDeckZip = async (deckId: string): Promise<{ blob: Blob; deck: Deck }> => {
  const deck = await db.decks.get(deckId);
  if (!deck) throw new Error('Deck not found');
  const cards = await db.cards.where('deckId').equals(deckId).sortBy('createdAt');

  const zip = new JSZip();
  const cardsJson: FluxaCardJson[] = [];

  for (const card of cards) {
    // Key order matches SPEC.md: id, type, front/front_label, back, media, created_at
    const json: FluxaCardJson = {
      id: card.id,
      type: card.type,
      ...(card.type === 'text' ? { front: card.front } : { front_label: card.front }),
      back: card.back,
    };

    if ((card.type === 'image' || card.type === 'audio') && card.mediaPath) {
      const folder = card.type === 'image' ? 'images' : 'audio';
      const fileName = `${folder}/${card.id}.${extFromPath(card.mediaPath)}`;
      try {
        zip.file(fileName, await readMedia(card.mediaPath), { base64: true });
        if (card.type === 'image') json.image_filename = fileName;
        else json.audio_filename = fileName;
      } catch {
        // Media file missing on device — export the card without it
      }
    }

    if (card.type === 'youtube') json.youtube_url = card.youtubeUrl ?? '';
    json.created_at = iso(card.createdAt);
    cardsJson.push(json);
  }

  const deckJson: FluxaDeckJson = {
    fluxa_version: FLUXA_VERSION,
    exported_at: new Date().toISOString(),
    deck: {
      id: deck.id,
      name: deck.name,
      language: deck.language,
      description: deck.description ?? '',
      card_count: cardsJson.length,
      created_at: iso(deck.createdAt),
    },
    cards: cardsJson,
  };
  zip.file('deck.json', JSON.stringify(deckJson, null, 2));

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
  });
  return { blob, deck };
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Desktop app: "Save as…" dialog. Web: browser download.
 * Mobile: save to Documents (falls back to cache) and open the share sheet.
 * Returns false if the user cancelled the save dialog.
 */
export const deliverFile = async (blob: Blob, fileName: string, title: string): Promise<boolean> => {
  if (isDesktopApp()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);
    const ext = fileName.split('.').pop() ?? 'fluxa';
    const path = await save({
      title,
      defaultPath: fileName,
      filters: [{ name: ext === 'zip' ? 'Zip archive' : 'FLUXA deck', extensions: [ext] }],
    });
    if (!path) return false;
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return true;
  }

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }

  const data = await blobToBase64(blob);
  let uri: string;
  try {
    ({ uri } = await Filesystem.writeFile({
      path: `FLUXA/${fileName}`,
      data,
      directory: Directory.Documents,
      recursive: true,
    }));
  } catch {
    ({ uri } = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
    }));
  }
  try {
    await Share.share({ title, url: uri, dialogTitle: title });
  } catch {
    // User dismissed the share sheet — the file is still saved
  }
  return true;
};

/** Returns the file name, or null if the user cancelled saving. */
export const exportDeck = async (deckId: string): Promise<string | null> => {
  const { blob, deck } = await buildDeckZip(deckId);
  const fileName = `${safeFileName(deck.name)}.fluxa`;
  const saved = await deliverFile(blob, fileName, `Save ${deck.name}`);
  return saved ? fileName : null;
};

/**
 * One zip containing every deck as its own .fluxa file.
 * Returns how many decks were exported, or null if the user cancelled saving.
 */
export const exportAllDecks = async (): Promise<number | null> => {
  const decks = await db.decks.orderBy('createdAt').toArray();
  if (decks.length === 0) return 0;
  const outer = new JSZip();
  const used = new Set<string>();
  for (const d of decks) {
    const { blob } = await buildDeckZip(d.id);
    let name = safeFileName(d.name);
    for (let i = 2; used.has(name.toLowerCase()); i++) name = `${safeFileName(d.name)} (${i})`;
    used.add(name.toLowerCase());
    outer.file(`${name}.fluxa`, blob);
  }
  const blob = await outer.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const date = new Date().toISOString().slice(0, 10);
  const saved = await deliverFile(blob, `fluxa-decks-${date}.zip`, 'Save all FLUXA decks');
  return saved ? decks.length : null;
};
