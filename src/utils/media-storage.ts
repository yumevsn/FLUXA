import { Directory, Filesystem } from '@capacitor/filesystem';

// All image and audio files live under this folder in the app's private
// data directory. On web, Capacitor Filesystem is backed by IndexedDB.
const MEDIA_DIR = 'media';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

export const extFromMime = (mime: string, fallback: string): string => {
  const m = mime.toLowerCase().split(';')[0].trim();
  const found = Object.entries(MIME_BY_EXT).find(([, v]) => v === m);
  if (m === 'audio/x-m4a' || m === 'audio/m4a') return 'm4a';
  return found ? found[0] : fallback;
};

export const extFromPath = (path: string): string =>
  (path.split('.').pop() || '').toLowerCase();

export const mimeFromPath = (path: string): string =>
  MIME_BY_EXT[extFromPath(path)] || 'application/octet-stream';

/** Strip a `data:...;base64,` prefix if present. */
export const stripDataUrl = (data: string): string => {
  const i = data.indexOf('base64,');
  return i >= 0 ? data.slice(i + 7) : data;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(reader.result as string));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Save base64 data as `media/<cardId>.<ext>`. Returns the stored path. */
export const saveMedia = async (
  cardId: string,
  base64: string,
  ext: string
): Promise<string> => {
  const path = `${MEDIA_DIR}/${cardId}.${ext}`;
  await Filesystem.writeFile({
    path,
    data: stripDataUrl(base64),
    directory: Directory.Data,
    recursive: true,
  });
  return path;
};

/** Read a stored media file as base64 (no data URL prefix). */
export const readMedia = async (path: string): Promise<string> => {
  const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
  return typeof data === 'string' ? data : blobToBase64(data);
};

export const readMediaAsDataUrl = async (path: string): Promise<string> =>
  `data:${mimeFromPath(path)};base64,${await readMedia(path)}`;

export const deleteMedia = async (path?: string): Promise<void> => {
  if (!path) return;
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // Already gone — nothing to do
  }
};

export const deleteAllMedia = async (): Promise<void> => {
  try {
    await Filesystem.rmdir({ path: MEDIA_DIR, directory: Directory.Data, recursive: true });
  } catch {
    // Folder did not exist
  }
};
