import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { Card } from '../db/db';
import { deleteCard, updateCard, useCard } from '../hooks/useCards';
import {
  getYouTubeEndTime,
  getYouTubeId,
  getYouTubeStartTime,
  retimeLabel,
} from '../utils/youtube';
import YoutubeClipEditor from '../components/YoutubeClipEditor';
import { CardFront, FaceHeader } from '../components/CardFlip';
import EmptyState from '../components/EmptyState';

const TITLES: Record<Card['type'], string> = {
  text: 'Text card',
  image: 'Image card',
  audio: 'Audio card',
  youtube: 'YouTube card',
};

const CardDetail = () => {
  const { deckId, cardId } = useParams<{ deckId: string; cardId: string }>();
  const router = useIonRouter();
  const card = useCard(cardId);

  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goToDeck = () => {
    if (router.canGoBack()) router.goBack();
    else router.push(`/deck/${deckId}`, 'back', 'replace');
  };

  const startEditing = () => {
    if (!card) return;
    setFront(card.front);
    setBack(card.back);
    setYoutubeUrl(card.youtubeUrl ?? '');
    setEditing(true);
  };

  const valid =
    !!card &&
    back.trim().length > 0 &&
    (card.type !== 'text' || front.trim().length > 0) &&
    (card.type !== 'youtube' || (!!getYouTubeId(youtubeUrl) && front.trim().length > 0));

  const save = async () => {
    if (!card || !valid) return;
    await updateCard(card.id, {
      front: front.trim(),
      back: back.trim(),
      ...(card.type === 'youtube' ? { youtubeUrl: youtubeUrl.trim() } : {}),
    });
    setEditing(false);
  };

  const frontLabel = card?.type === 'text' ? 'Front' : 'Front label';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {editing ? (
              <IonButton onClick={() => setEditing(false)}>Cancel</IonButton>
            ) : (
              <IonBackButton defaultHref={`/deck/${deckId}`} text="" />
            )}
          </IonButtons>
          <IonTitle>{card ? TITLES[card.type] : ''}</IonTitle>
          <IonButtons slot="end">
            {card &&
              (editing ? (
                <IonButton strong disabled={!valid} onClick={save}>
                  Save
                </IonButton>
              ) : (
                <IonButton onClick={startEditing}>Edit</IonButton>
              ))}
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {card === null && (
          <EmptyState message="This card no longer exists." actionLabel="Back to deck" onAction={goToDeck} />
        )}

        {card && !editing && (
          <div className="detail-faces">
            <div className="card-face static face-front">
              <FaceHeader side="Question" type={card.type} />
              <div className="face-body">
                <CardFront card={card} />
              </div>
            </div>
            <div className="card-face static face-back">
              <FaceHeader side="Answer" type={card.type} />
              <div className="face-body">
                <div className="back-text">{card.back}</div>
              </div>
            </div>
          </div>
        )}

        {card && editing && (
          <>
            {card.type !== 'text' && card.type !== 'youtube' && (
              <div className="surface-card detail-card">
                <CardFront card={{ ...card, front: '' }} />
              </div>
            )}
            <IonList className="form-list" lines="full">
              {card.type === 'youtube' && (
                <IonItem>
                  <IonInput
                    label="YouTube link"
                    labelPlacement="stacked"
                    type="url"
                    value={youtubeUrl}
                    onIonInput={(e) => setYoutubeUrl(e.detail.value ?? '')}
                  />
                </IonItem>
              )}
              {card.type === 'youtube' && getYouTubeId(youtubeUrl) && (
                <div className="clip-section">
                  <YoutubeClipEditor
                    url={youtubeUrl}
                    onChange={(next) => {
                      // Keep times written in the label in step with the clip
                      const from = [getYouTubeStartTime(youtubeUrl), getYouTubeEndTime(youtubeUrl)];
                      const to = [getYouTubeStartTime(next), getYouTubeEndTime(next)];
                      setFront((f) => retimeLabel(retimeLabel(f, from[0], to[0]), from[1], to[1]));
                      setYoutubeUrl(next);
                    }}
                  />
                </div>
              )}
              <IonItem>
                <IonTextarea
                  label={card.type === 'image' || card.type === 'audio' ? `${frontLabel} (optional)` : frontLabel}
                  labelPlacement="stacked"
                  autoGrow
                  rows={2}
                  value={front}
                  onIonInput={(e) => setFront(e.detail.value ?? '')}
                />
              </IonItem>
              <IonItem>
                <IonTextarea
                  label="Back"
                  labelPlacement="stacked"
                  autoGrow
                  rows={3}
                  value={back}
                  onIonInput={(e) => setBack(e.detail.value ?? '')}
                />
              </IonItem>
            </IonList>
          </>
        )}

        {card && !editing && (
          <IonButton
            className="delete-button"
            color="danger"
            fill="clear"
            onClick={() => setConfirmDelete(true)}
          >
            Delete card
          </IonButton>
        )}

        <IonAlert
          isOpen={confirmDelete}
          header="Delete card?"
          message="This card will be removed from the deck."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                if (card) void deleteCard(card).then(goToDeck);
              },
            },
          ]}
          onDidDismiss={() => setConfirmDelete(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default CardDetail;
