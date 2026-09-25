export const isYouTubeUrl = (url: string): boolean =>
  /youtube\.com|youtu\.be/.test(url);

export const getYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

export const getYouTubeThumbnail = (id: string): string =>
  `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

/** Parse `84`, `84s`, `1m24s`, `1h2m3s` or `1:24` / `1:02:03` into seconds. */
export const parseTime = (value: string): number | null => {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (/^\d+s?$/.test(v)) return parseInt(v, 10);
  if (/^\d+(:\d{1,2}){1,2}$/.test(v)) {
    return v.split(':').reduce((total, part) => total * 60 + parseInt(part, 10), 0);
  }
  if (/^(\d+h)?(\d+m)?(\d+s)?$/.test(v)) {
    const h = v.match(/(\d+)h/);
    const m = v.match(/(\d+)m/);
    const s = v.match(/(\d+)s/);
    return (
      (h ? parseInt(h[1], 10) * 3600 : 0) +
      (m ? parseInt(m[1], 10) * 60 : 0) +
      (s ? parseInt(s[1], 10) : 0)
    );
  }
  return null;
};

/** 84 → "1:24", 3723 → "1:02:03" */
export const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

const readParam = (url: string, names: string[]): number => {
  const match = url.match(new RegExp(`[?&#](?:${names.join('|')})=([0-9hms:]+)`));
  return match ? parseTime(match[1]) ?? 0 : 0;
};

/** Start time in seconds from `t=` or `start=` (0 if none). */
export const getYouTubeStartTime = (url: string): number => readParam(url, ['t', 'start']);

/** Optional end time in seconds from `end=` (0 if none). */
export const getYouTubeEndTime = (url: string): number => readParam(url, ['end']);

/**
 * Canonical link with the clip times baked in, e.g.
 * https://www.youtube.com/watch?v=ID&t=84&end=100
 * Returns the input unchanged if no video ID can be found.
 */
export const withYouTubeTimes = (url: string, start: number, end: number): string => {
  const id = getYouTubeId(url);
  if (!id) return url;
  let out = `https://www.youtube.com/watch?v=${id}`;
  if (start > 0) out += `&t=${Math.floor(start)}`;
  if (end > 0 && end > start) out += `&end=${Math.floor(end)}`;
  return out;
};

/** "1:24" or "1:24 – 1:40" for a card's clip, or null if it plays from the start. */
export const describeClip = (url: string): string | null => {
  const start = getYouTubeStartTime(url);
  const end = getYouTubeEndTime(url);
  if (!start && !end) return null;
  return end ? `${formatTime(start)} – ${formatTime(end)}` : `from ${formatTime(start)}`;
};

/**
 * Keep times written in a card's label in step with its clip: when the start
 * (or end) moves from `from` to `to` seconds, "1:24" in the label becomes the new time.
 */
export const retimeLabel = (label: string, from: number, to: number): string => {
  if (!from || from === to) return label;
  // formatTime() only produces digits and colons, so it is safe inside a RegExp.
  // Match the old time only as a whole token (so 1:24 doesn't touch 11:24).
  const old = new RegExp(`(^|[^0-9:])${formatTime(from)}(?![0-9:])`, 'g');
  return label.replace(old, `$1${formatTime(to)}`);
};
