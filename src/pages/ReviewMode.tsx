import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { checkmark, refresh, swapHorizontal } from 'ionicons/icons';
import { Card } from '../db/db';
import { useCards } from '../hooks/useCards';
import { useDeck } from '../hooks/useDecks';
import CardFlip from '../components/CardFlip';

interface Session {
  cards: Card[];
  queue: string[]; // card ids still to answer; "Not yet" moves a card to the end
  step: number; // answers given so far — used as the key for each shown card
  done: number; // cards answered "Got it"
  gotItFirstTry: number;
  missed: Set<string>; // cards answered "Not yet" at least once
}

const newSession = (cards: Card[]): Session => ({
  cards,
  queue: cards.map((c) => c.id),
  step: 0,
  done: 0,
  gotItFirstTry: 0,
  missed: new Set(),
});

const ReviewMode = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useIonRouter();
  const deck = useDeck(deckId);
  const cards = useCards(deckId);
  const [session, setSession] = useState<Session | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>();

  // Snapshot the deck when review starts so edits elsewhere don't reshuffle the queue
  useEffect(() => {
    if (cards && !session) setSession(newSession(cards));
  }, [cards, session]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2200);
  };

  const backToDeck = () => {
    if (router.canGoBack()) router.goBack();
    else router.push(`/deck/${deckId}`, 'back', 'replace');
  };

  const answer = useCallback(
    (gotIt: boolean) => {
      setSession((s) => {
        if (!s || s.queue.length === 0) return s;
        const [id, ...rest] = s.queue;
        if (gotIt) {
          return {
            ...s,
            queue: rest,
            step: s.step + 1,
            done: s.done + 1,
            gotItFirstTry: s.gotItFirstTry + (s.missed.has(id) ? 0 : 1),
          };
        }
        const missed = new Set(s.missed).add(id);
        return { ...s, queue: [...rest, id], step: s.step + 1, missed };
      });
      if (!gotIt) showNotice('Moved to the end. You’ll see it again before you finish.');
      setFlipped(false);
    },
    []
  );

  const finished = !!session && session.queue.length === 0;
  const toggle = useCallback(() => setFlipped((f) => !f), []);

  // Keyboard: Space/Enter flips, ← or 1 = Not yet, → or 2 = Got it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!session || finished) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        if (target.closest('input, textarea, iframe')) return;
        // A focused button already reacts to Space itself
        if (e.key === ' ' && target.closest('button, ion-button, [role="button"]')) return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) answer(false);
      else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) answer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, finished, flipped, toggle, answer]);

  if (!session) {
    return (
      <IonPage>
        <IonContent />
      </IonPage>
    );
  }

  const total = session.cards.length;
  const current = session.cards.find((c) => c.id === session.queue[0]);
  const toRetry = session.queue.filter((id) => session.missed.has(id)).length;
  const missedCards = session.cards.filter((c) => session.missed.has(c.id));

  const restart = (subset?: Card[]) => {
    setSession(newSession(subset ?? cards ?? session.cards));
    setFlipped(false);
    setNotice(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/deck/${deckId}`} text="" />
          </IonButtons>
          <IonTitle>{deck?.name ?? 'Review'}</IonTitle>
        </IonToolbar>
        <IonProgressBar value={total ? session.done / total : 0} />
      </IonHeader>

      <IonContent className="ion-padding review-content">
        {total === 0 && (
          <div className="end-screen">
            <p>This deck has no cards to review.</p>
            <IonButton onClick={backToDeck}>Back to deck</IonButton>
          </div>
        )}

        {!finished && current && (
          <>
            <div className="review-status">
              <span>
                <strong>{session.done}</strong> of {total} done
              </span>
              {toRetry > 0 && <span className="retry-count">{toRetry} to retry</span>}
            </div>
            <div className={`review-notice ${notice ? 'visible' : ''}`} aria-live="polite">
              {notice}
            </div>
            <CardFlip
              key={session.step}
              card={current}
              flipped={flipped}
              onToggle={toggle}
              showHint={session.step === 0 && !flipped}
              position={session.missed.has(current.id) ? 'Retry' : undefined}
              stackDepth={session.queue.length - 1}
            />
          </>
        )}

        {finished && total > 0 && (
          <div className="end-screen">
            <div className="end-card">
              <p className="muted">Session complete</p>
              <p className="score">
                {session.gotItFirstTry} / {total}
              </p>
              <p className="muted">cards right on the first try</p>
              <div className="end-stats">
                <div>
                  <strong>{session.gotItFirstTry}</strong>
                  <span>Knew it</span>
                </div>
                <div>
                  <strong>{missedCards.length}</strong>
                  <span>Needed practice</span>
                </div>
              </div>
            </div>
            <div className="end-actions">
              {missedCards.length > 0 && (
                <IonButton expand="block" onClick={() => restart(missedCards)}>
                  Practise the {missedCards.length} missed {missedCards.length === 1 ? 'card' : 'cards'}
                </IonButton>
              )}
              <IonButton expand="block" fill="outline" onClick={() => restart()}>
                Review whole deck again
              </IonButton>
              <IonButton expand="block" fill="clear" onClick={backToDeck}>
                Back to deck
              </IonButton>
            </div>
          </div>
        )}
      </IonContent>

      {!finished && current && (
        <IonFooter>
          <div className="action-bar review-bar">
            {!flipped ? (
              <IonButton expand="block" className="btn-flip" onClick={toggle}>
                <IonIcon slot="start" icon={swapHorizontal} />
                Flip card
              </IonButton>
            ) : (
              <div className="review-buttons">
                <IonButton className="btn-not-yet" onClick={() => answer(false)}>
                  <IonIcon slot="start" icon={refresh} />
                  Not yet
                </IonButton>
                <IonButton
                  className="btn-flip-back"
                  fill="outline"
                  onClick={toggle}
                  aria-label="Flip back to the question"
                >
                  <IonIcon slot="icon-only" icon={swapHorizontal} />
                </IonButton>
                <IonButton className="btn-got-it" onClick={() => answer(true)}>
                  <IonIcon slot="start" icon={checkmark} />
                  Got it
                </IonButton>
              </div>
            )}
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default ReviewMode;
