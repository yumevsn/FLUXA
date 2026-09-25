import { useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonActionSheet,
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { Deck } from '../db/db';
import { createDeck, deleteDeck, updateDeck, useDecks } from '../hooks/useDecks';
import { exportDeck } from '../utils/fluxa-export';
import { getDefaultLanguage } from './Settings';
import DeckItem from '../components/DeckItem';
import EmptyState from '../components/EmptyState';
import LanguagePicker from '../components/LanguagePicker';

const CreateDeckModal = ({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (deck: Deck) => void;
}) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const nameInput = useRef<HTMLIonInputElement>(null);

  const reset = () => {
    setName('');
    setLanguage(getDefaultLanguage());
    setDescription('');
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    const deck = await createDeck({ name, language, description });
    onCreated(deck);
  };

  return (
    <IonModal
      isOpen={isOpen}
      onWillPresent={reset}
      onDidPresent={() => nameInput.current?.setFocus()}
      onDidDismiss={onClose}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>New deck</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={!name.trim()} onClick={() => submit()}>
              Create
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={submit}>
          <IonList className="form-list" lines="full">
            <IonItem>
              <IonInput
                label="Name"
                labelPlacement="stacked"
                placeholder="e.g. Market vocabulary"
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? '')}
                required
                ref={nameInput}
              />
            </IonItem>
            <LanguagePicker label="Language" value={language} onChange={setLanguage} />
            <IonItem>
              <IonInput
                label="Description (optional)"
                labelPlacement="stacked"
                value={description}
                onIonInput={(e) => setDescription(e.detail.value ?? '')}
              />
            </IonItem>
          </IonList>
          {/* Lets Enter submit the form */}
          <input type="submit" hidden />
        </form>
      </IonContent>
    </IonModal>
  );
};

const Home = () => {
  const history = useHistory();
  const decks = useDecks();
  const [present] = useIonToast();
  const [creating, setCreating] = useState(false);
  const [menuDeck, setMenuDeck] = useState<Deck | null>(null);
  const [renaming, setRenaming] = useState<Deck | null>(null);
  const [deleting, setDeleting] = useState<Deck | null>(null);

  const toast = (message: string) => present({ message, duration: 2500, position: 'bottom' });

  const handleExport = async (deck: Deck) => {
    try {
      const fileName = await exportDeck(deck.id);
      if (fileName) toast(`Exported ${fileName}`);
    } catch {
      toast('Export failed. Please try again.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="brand">FLUXA</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {decks && decks.length === 0 && (
          <EmptyState
            message="No decks yet. Tap + to create one."
            actionLabel="Create a deck"
            onAction={() => setCreating(true)}
          />
        )}
        <div className="stack">
          {decks?.map((deck) => (
            <DeckItem
              key={deck.id}
              deck={deck}
              onOpen={() => history.push(`/deck/${deck.id}`)}
              onLongPress={() => setMenuDeck(deck)}
            />
          ))}
        </div>
        <div className="fab-spacer" />

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton onClick={() => setCreating(true)} aria-label="Create deck">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <CreateDeckModal
          isOpen={creating}
          onClose={() => setCreating(false)}
          onCreated={() => setCreating(false)}
        />

        <IonActionSheet
          isOpen={!!menuDeck}
          header={menuDeck?.name}
          onDidDismiss={() => setMenuDeck(null)}
          buttons={[
            { text: 'Edit name', handler: () => setRenaming(menuDeck) },
            { text: 'Export', handler: () => void (menuDeck && handleExport(menuDeck)) },
            { text: 'Delete', role: 'destructive', handler: () => setDeleting(menuDeck) },
            { text: 'Cancel', role: 'cancel' },
          ]}
        />

        <IonAlert
          isOpen={!!renaming}
          header="Edit name"
          inputs={[{ name: 'name', type: 'text', value: renaming?.name, attributes: { maxlength: 120 } }]}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Save',
              handler: (data: { name: string }) => {
                const name = data.name?.trim();
                if (!name) return false;
                if (renaming) void updateDeck(renaming.id, { name });
              },
            },
          ]}
          onDidDismiss={() => setRenaming(null)}
        />

        <IonAlert
          isOpen={!!deleting}
          header="Delete deck?"
          message={`"${deleting?.name}" and all its cards will be removed from this device.`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                if (deleting) void deleteDeck(deleting.id).then(() => toast('Deck deleted'));
              },
            },
          ]}
          onDidDismiss={() => setDeleting(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
