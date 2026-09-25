import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonToast,
} from '@ionic/react';
import { camera, images } from 'ionicons/icons';
import { CardType } from '../db/db';
import { createCard, NewCard } from '../hooks/useCards';
import { PickedImage, useCamera } from '../hooks/useCamera';
import { Recording } from '../hooks/useAudioRecorder';
import {
  describeClip,
  getYouTubeEndTime,
  getYouTubeId,
  getYouTubeStartTime,
  isYouTubeUrl,
  retimeLabel,
} from '../utils/youtube';
import YoutubeClipEditor from '../components/YoutubeClipEditor';
import AudioRecorder from '../components/AudioRecorder';

const TYPES: { type: CardType; emoji: string; label: string; hint: string }[] = [
  { type: 'text', emoji: '✏️', label: 'Text', hint: 'A word or question, and its answer' },
  { type: 'image', emoji: '📷', label: 'Image', hint: 'A photo on the front' },
  { type: 'audio', emoji: '🎤', label: 'Audio', hint: 'A recording on the front' },
  { type: 'youtube', emoji: '▶️', label: 'YouTube', hint: 'A video link on the front' },
];

const TITLES: Record<CardType, string> = {
  text: 'Text card',
  image: 'Image card',
  audio: 'Audio card',
  youtube: 'YouTube card',
};

const AddCard = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useIonRouter();
  const [present] = useIonToast();
  const { takePhoto, chooseFromGallery } = useCamera();

  const [type, setType] = useState<CardType | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [saving, setSaving] = useState(false);
  // Blocks a second tap immediately, before the "saving" state re-renders
  const savingRef = useRef(false);

  const chooseType = (t: CardType | null) => {
    setType(t);
    setFront('');
    setBack('');
    setImage(null);
    setRecording(null);
    setYoutubeUrl('');
  };

  const youtubeId = getYouTubeId(youtubeUrl);
  const clip = youtubeId ? describeClip(youtubeUrl) : null;

  /** New clip times: update the link and any matching times written in the label. */
  const changeClip = (next: string) => {
    const [oldStart, oldEnd] = [getYouTubeStartTime(youtubeUrl), getYouTubeEndTime(youtubeUrl)];
    const [newStart, newEnd] = [getYouTubeStartTime(next), getYouTubeEndTime(next)];
    setFront((f) => retimeLabel(retimeLabel(f, oldStart, newStart), oldEnd, newEnd));
    setYoutubeUrl(next);
  };

  const insertClipTime = () => {
    if (!clip) return;
    setFront((f) => (f.trim() ? `${f.trim()} (${clip})` : `Watch ${clip} — `));
  };
  const hasBack = back.trim().length > 0;
  const canSave =
    !saving &&
    hasBack &&
    ((type === 'text' && front.trim().length > 0) ||
      (type === 'image' && !!image) ||
      (type === 'audio' && !!recording) ||
      (type === 'youtube' && !!youtubeId && front.trim().length > 0));

  const pickImage = async (fromCamera: boolean) => {
    const picked = fromCamera ? await takePhoto() : await chooseFromGallery();
    if (picked) setImage(picked);
  };

  const done = () => {
    if (router.canGoBack()) router.goBack();
    else router.push(`/deck/${deckId}`, 'back', 'replace');
  };

  const save = async () => {
    if (!type || !canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const input: NewCard = { type, front, back };
    if (type === 'image' && image) input.media = { base64: image.dataUrl, ext: image.ext };
    if (type === 'audio' && recording)
      input.media = { base64: recording.base64, ext: recording.ext };
    if (type === 'youtube') input.youtubeUrl = youtubeUrl;
    try {
      await createCard(deckId, input);
      done();
    } catch {
      present({ message: 'Could not save the card. Please try again.', duration: 3000 });
      savingRef.current = false;
      setSaving(false);
    }
  };

  const backField = (
    <IonItem>
      <IonTextarea
        label="Back"
        labelPlacement="stacked"
        placeholder="The answer, translation or explanation"
        autoGrow
        rows={3}
        value={back}
        onIonInput={(e) => setBack(e.detail.value ?? '')}
      />
    </IonItem>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {type ? (
              <IonButton onClick={() => chooseType(null)}>Change type</IonButton>
            ) : (
              <IonBackButton defaultHref={`/deck/${deckId}`} text="" />
            )}
          </IonButtons>
          <IonTitle>{type ? TITLES[type] : 'Add card'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!type && (
          <>
            <p className="muted">Choose a card type</p>
            <div className="type-grid">
              {TYPES.map((t) => (
                <button key={t.type} className="surface-card type-button" onClick={() => chooseType(t.type)}>
                  <span className="type-emoji" aria-hidden>
                    {t.emoji}
                  </span>
                  <span className="type-label">{t.label}</span>
                  <span className="muted small">{t.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {type === 'text' && (
          <IonList className="form-list" lines="full">
            <IonItem>
              <IonTextarea
                label="Front"
                labelPlacement="stacked"
                placeholder="A word, phrase or question"
                autoGrow
                rows={2}
                value={front}
                onIonInput={(e) => setFront(e.detail.value ?? '')}
              />
            </IonItem>
            {backField}
          </IonList>
        )}

        {type === 'image' && (
          <>
            <div className="button-row">
              <IonButton fill="outline" onClick={() => pickImage(true)}>
                <IonIcon slot="start" icon={camera} />
                Take photo
              </IonButton>
              <IonButton fill="outline" onClick={() => pickImage(false)}>
                <IonIcon slot="start" icon={images} />
                Choose from gallery
              </IonButton>
            </div>
            {image && <img className="image-preview" src={image.dataUrl} alt="Selected" />}
            <IonList className="form-list" lines="full">
              <IonItem>
                <IonInput
                  label="Front label (optional)"
                  labelPlacement="stacked"
                  placeholder="e.g. Name the fruits"
                  value={front}
                  onIonInput={(e) => setFront(e.detail.value ?? '')}
                />
              </IonItem>
              {backField}
            </IonList>
          </>
        )}

        {type === 'audio' && (
          <>
            <AudioRecorder onRecorded={setRecording} />
            <IonList className="form-list" lines="full">
              <IonItem>
                <IonInput
                  label="Front label (optional)"
                  labelPlacement="stacked"
                  placeholder="e.g. What is she saying?"
                  value={front}
                  onIonInput={(e) => setFront(e.detail.value ?? '')}
                />
              </IonItem>
              {backField}
            </IonList>
          </>
        )}

        {type === 'youtube' && (
          <IonList className="form-list" lines="full">
            <IonItem>
              <IonInput
                label="YouTube link"
                labelPlacement="stacked"
                placeholder="https://www.youtube.com/watch?v=…&t=84"
                type="url"
                inputmode="url"
                value={youtubeUrl}
                onIonInput={(e) => setYoutubeUrl(e.detail.value ?? '')}
              />
            </IonItem>
            {youtubeUrl && !youtubeId && (
              <p className="error-text item-note">
                {isYouTubeUrl(youtubeUrl)
                  ? "Couldn't find a video in this link."
                  : 'Paste a youtube.com or youtu.be link.'}
              </p>
            )}
            {youtubeId && (
              <div className="clip-section">
                <YoutubeClipEditor url={youtubeUrl} onChange={changeClip} />
              </div>
            )}
            <IonItem>
              <IonTextarea
                label="Front label"
                labelPlacement="stacked"
                placeholder="What should the learner do? e.g. Watch from 1:24 — what does she order?"
                autoGrow
                rows={2}
                value={front}
                onIonInput={(e) => setFront(e.detail.value ?? '')}
              />
            </IonItem>
            {clip && !front.includes(clip.replace('from ', '')) && (
              <button type="button" className="tag tag-button insert-time" onClick={insertClipTime}>
                + Add “{clip}” to the label
              </button>
            )}
            {backField}
          </IonList>
        )}

        {type && (
          <IonButton expand="block" className="save-button" disabled={!canSave} onClick={save}>
            {saving ? 'Saving…' : 'Save card'}
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AddCard;
