import { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonAlert, useIonLoading, useIonToast } from '@ionic/react';
import { db } from '../db/db';
import { FluxaImportError, FluxaSummary, importFluxaFile, peekFluxaFile } from '../utils/fluxa-import';

/**
 * Only deck files from this same site can be opened by link (the community
 * library at /decks/…). Anything else is ignored.
 */
const safeDeckUrl = (value: string): string | null => {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (!url.pathname.endsWith('.fluxa')) return null;
    return url.href;
  } catch {
    return null;
  }
};

interface Pending extends FluxaSummary {
  blob: Blob;
  alreadyHave: boolean;
}

/**
 * Handles "Open in FLUXA" links from the community library:
 *   /app/?import=/decks/shona-everyday-phrases.fluxa
 * Fetches the deck, asks the learner to confirm, then imports it.
 */
const ImportFromLink = () => {
  const location = useLocation();
  const history = useHistory();
  const [present] = useIonToast();
  const [showLoading, hideLoading] = useIonLoading();
  const [pending, setPending] = useState<Pending | null>(null);
  // Removing ?import= from the address re-runs the effect, so cancellation
  // tracks whether the component is still mounted, not the address.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const toast = (message: string, duration = 3000) => present({ message, duration, position: 'bottom' });

  useEffect(() => {
    const param = new URLSearchParams(location.search).get('import');
    if (!param) return;
    // Remove it from the address so a reload doesn't ask again
    history.replace(location.pathname);

    const url = safeDeckUrl(param);
    if (!url) {
      toast('That link can’t be opened in FLUXA.');
      return;
    }
    (async () => {
      await showLoading({ message: 'Getting the deck…' });
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const summary = await peekFluxaFile(blob);
        const alreadyHave = (await db.decks.filter((d) => d.name === summary.name).count()) > 0;
        if (mounted.current) setPending({ ...summary, blob, alreadyHave });
      } catch (e) {
        toast(
          e instanceof FluxaImportError
            ? e.message
            : navigator.onLine
              ? 'Couldn’t get that deck. Please try again.'
              : 'You’re offline. Connect to the internet to get this deck.'
        );
      } finally {
        await hideLoading();
      }
    })();
    // Only react to a new ?import= in the address
  }, [location.search]);

  const add = async () => {
    if (!pending) return;
    const { blob } = pending;
    setPending(null);
    try {
      const { deck, missingMedia } = await importFluxaFile(blob);
      toast(
        `Deck added: ${deck.name}` + (missingMedia ? `. ${missingMedia} card(s) are missing media.` : ''),
        missingMedia ? 5000 : 2500
      );
      history.push(`/deck/${deck.id}`);
    } catch (e) {
      toast(e instanceof FluxaImportError ? e.message : 'Couldn’t add that deck.');
    }
  };

  const details = pending
    ? `${pending.cardCount} ${pending.cardCount === 1 ? 'card' : 'cards'}` +
      (pending.language ? ` · ${pending.language}` : '') +
      (pending.alreadyHave ? '. You already have a deck with this name; this adds another copy.' : '')
    : '';

  return (
    <IonAlert
      isOpen={!!pending}
      header={pending ? `Add “${pending.name}”?` : ''}
      message={details}
      buttons={[
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add deck', handler: () => void add() },
      ]}
      onDidDismiss={() => setPending(null)}
    />
  );
};

export default ImportFromLink;
