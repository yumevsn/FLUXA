import { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { add, play, shareOutline } from 'ionicons/icons';
import { Card } from '../db/db';
import { useDeck } from '../hooks/useDecks';
import { deleteCard, useCards } from '../hooks/useCards';
import { exportDeck } from '../utils/fluxa-export';
import CardItem from '../components/CardItem';
import EmptyState from '../components/EmptyState';

const DeckScreen = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const history = useHistory();
  const deck = useDeck(deckId);
  const cards = useCards(deckId);
  const [present] = useIonToast();
  const [deleting, setDeleting] = useState<Card | null>(null);
  const [exporting, setExporting] = useState(false);

  const toast = (message: string) => present({ message, duration: 2500, position: 'bottom' });

  const handleExport = async () => {
    setExporting(true);
    try {
      const fileName = await exportDeck(deckId);
      if (fileName) toast(`Exported ${fileName}`);
    } catch {
      toast('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const addCard = () => history.push(`/deck/${deckId}/add`);
  const count = cards?.length ?? 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="" />
          </IonButtons>
          <IonTitle>{deck?.name ?? ''}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleExport} disabled={!deck || exporting} aria-label="Export deck">
              <IonIcon slot="icon-only" icon={shareOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {deck === null ? (
          <EmptyState
            message="This deck no longer exists."
            actionLabel="Back to decks"
            onAction={() => history.replace('/')}
          />
        ) : (
          <>
            <div className="meta-row deck-meta">
              {deck?.language && <span className="tag">{deck.language}</span>}
              <span className="muted">
                {count} {count === 1 ? 'card' : 'cards'}
              </span>
            </div>
            {deck?.description && <p className="muted">{deck.description}</p>}

            {cards && cards.length === 0 && (
              <EmptyState
                message="No cards yet. Tap + to add one."
                actionLabel="Add a card"
                onAction={addCard}
              />
            )}
            <div className="stack">
              {cards?.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onOpen={() => history.push(`/deck/${deckId}/card/${card.id}`)}
                  onLongPress={() => setDeleting(card)}
                />
              ))}
            </div>
          </>
        )}

        <IonAlert
          isOpen={!!deleting}
          header="Delete card?"
          message="This card will be removed from the deck."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                if (deleting) void deleteCard(deleting);
              },
            },
          ]}
          onDidDismiss={() => setDeleting(null)}
        />
      </IonContent>
      {deck && (
        <IonFooter>
          <div className="action-bar">
            <div className="button-row">
              <IonButton color="primary" fill="outline" onClick={addCard}>
                <IonIcon slot="start" icon={add} />
                Add card
              </IonButton>
              <IonButton
                color="primary"
                disabled={count === 0}
                onClick={() => history.push(`/deck/${deckId}/review`)}
              >
                <IonIcon slot="start" icon={play} />
                Review
              </IonButton>
            </div>
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default DeckScreen;
