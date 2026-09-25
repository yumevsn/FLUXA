import { useEffect, useState } from 'react';
import { readMediaAsDataUrl } from '../utils/media-storage';

/**
 * Load a stored image/audio file as a data URL usable in <img>/<audio>.
 * Returns `undefined` while loading and `null` if the file is missing.
 */
export const useMediaUrl = (path?: string) => {
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setUrl(undefined);
    if (!path) {
      setUrl(null);
      return;
    }
    readMediaAsDataUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [path]);

  return url;
};
