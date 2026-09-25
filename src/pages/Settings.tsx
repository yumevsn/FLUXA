import { useRef, useState } from 'react';
import {
  IonAlert,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  useIonLoading,
  useIonRouter,
  useIonToast,
} from '@ionic/react';
import { moonOutline, phonePortraitOutline, sunnyOutline } from 'ionicons/icons';
import { db } from '../db/db';
import { exportAllDecks } from '../utils/fluxa-export';
import { FluxaImportError, importFluxaFile } from '../utils/fluxa-import';
import { deleteAllMedia } from '../utils/media-storage';
import LanguagePicker from '../components/LanguagePicker';
import { openExternal } from '../utils/platform';
import { getThemePref, setThemePref, ThemePref } from '../utils/theme';

export const APP_VERSION = '1.0.0';
export const REPO_URL = 'https://github.com/yumevsn/FLUXA';
export const WEB_APP_URL = 'https://fluxa-ochre.vercel.app/app/';
export const RELEASES_URL = 'https://github.com/yumevsn/FLUXA/releases/latest';

const LANGUAGE_KEY = 'fluxa.defaultLanguage';

export const getDefaultLanguage = (): string => {
  try {
    return localStorage.getItem(LANGUAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const setDefaultLanguage = (value: string) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode) — setting just won't persist
  }
};

const Settings = () => {
  const router = useIonRouter();
  const [present] = useIonToast();
  const [showLoading, hideLoading] = useIonLoading();
  const [language, setLanguage] = useState(getDefaultLanguage);
  const [confirmClear, setConfirmClear] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  const fileInput = useRef<HTMLInputElement>(null);

  const toast = (message: string, duration = 2500) =>
    present({ message, duration, position: 'bottom' });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    await showLoading({ message: 'Importing…' });
    try {
      const { deck, missingMedia, skipped } = await importFluxaFile(file);
      await hideLoading();
      const warnings = [
        missingMedia > 0 &&
          `${missingMedia} ${missingMedia === 1 ? 'card is' : 'cards are'} missing media`,
        skipped > 0 && `${skipped} unknown ${skipped === 1 ? 'card was' : 'cards were'} skipped`,
      ].filter(Boolean);
      toast(
        `Deck imported: ${deck.name}` + (warnings.length ? `. ${warnings.join(', ')}.` : ''),
        warnings.length ? 5000 : 2500
      );
      router.push(`/deck/${deck.id}`);
    } catch (err) {
      await hideLoading();
      toast(err instanceof FluxaImportError ? err.message : "This doesn't look like a FLUXA file.", 4000);
    }
  };

  const handleExportAll = async () => {
    await showLoading({ message: 'Preparing decks…' });
    try {
      const count = await exportAllDecks();
      await hideLoading();
      if (count !== null) toast(count === 0 ? 'No decks to export yet.' : `Exported ${count} ${count === 1 ? 'deck' : 'decks'}`);
    } catch {
      await hideLoading();
      toast('Export failed. Please try again.');
    }
  };

  const clearAll = async () => {
    await db.transaction('rw', db.decks, db.cards, async () => {
      await db.cards.clear();
      await db.decks.clear();
    });
    await deleteAllMedia();
    toast('All data cleared');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset lines="full">
          <IonListHeader>
            <IonLabel>General</IonLabel>
          </IonListHeader>
          <LanguagePicker
            label="Default language"
            helperText="Pre-filled when you create a new deck"
            value={language}
            onChange={(v) => {
              setLanguage(v);
              setDefaultLanguage(v);
            }}
          />
        </IonList>

        <IonList inset lines="full">
          <IonListHeader>
            <IonLabel>Appearance</IonLabel>
          </IonListHeader>
          <IonItem lines="none">
            <IonLabel className="lang-field">
              <span className="lang-field-label">Theme</span>
              <IonSegment
                className="theme-segment"
                value={theme}
                onIonChange={(e) => {
                  const pref = (e.detail.value ?? 'system') as ThemePref;
                  setTheme(pref);
                  setThemePref(pref);
                }}
              >
                <IonSegmentButton value="system">
                  <IonIcon icon={phonePortraitOutline} />
                  <IonLabel>System</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="light">
                  <IonIcon icon={sunnyOutline} />
                  <IonLabel>Light</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="dark">
                  <IonIcon icon={moonOutline} />
                  <IonLabel>Dark</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonList inset lines="full">
          <IonListHeader>
            <IonLabel>Data</IonLabel>
          </IonListHeader>
          <IonItem button detail={false} onClick={() => fileInput.current?.click()}>
            <IonLabel>
              Import a deck
              <p className="item-sub">Open a .fluxa file</p>
            </IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={handleExportAll}>
            <IonLabel>
              Export all decks
              <p className="item-sub">One zip containing every deck as a .fluxa file</p>
            </IonLabel>
          </IonItem>
          <IonItem button detail={false} onClick={() => setConfirmClear(true)}>
            <IonLabel color="danger">
              Clear all data
              <p className="item-sub">Delete every deck, card, image and recording on this device</p>
            </IonLabel>
          </IonItem>
        </IonList>
        <input
          ref={fileInput}
          type="file"
          accept=".fluxa,.zip,application/zip,application/octet-stream"
          hidden
          onChange={handleImport}
        />

        <IonList inset lines="full">
          <IonListHeader>
            <IonLabel>About</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonLabel className="ion-text-wrap about-blurb">
              <strong>What is FLUXA?</strong>
              <p>
                FLUXA helps you learn languages with interactive flashcards. Each card can use
                text, images, audio recordings or YouTube videos, so you can read, see, hear and
                watch a language in real use. Review with a quick flip, and share whole decks as a
                single .fluxa file.
              </p>
              <p>
                Everything stays on your device and works offline. There are no accounts, no
                servers and no ads.
              </p>
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>Version</IonLabel>
            <IonNote slot="end">{APP_VERSION}</IonNote>
          </IonItem>
          <IonItem button detail onClick={() => void openExternal(WEB_APP_URL)}>
            <IonLabel>
              Web app
              <p className="item-sub">fluxa-ochre.vercel.app/app</p>
            </IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => void openExternal(RELEASES_URL)}>
            <IonLabel>
              Desktop downloads
              <p className="item-sub">Windows, macOS and Linux</p>
            </IonLabel>
          </IonItem>
          <IonItem button detail onClick={() => void openExternal(REPO_URL)}>
            <IonLabel>Source code on GitHub</IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel className="ion-text-wrap">
              <p className="item-sub">FLUXA is free and open source. No accounts. No servers.</p>
              <p className="item-sub">Released under the MIT licence.</p>
              <p className="item-sub">
                Language data: ISO 639-3 (SIL International), Glottolog (CC-BY 4.0), Unicode CLDR.
              </p>
            </IonLabel>
          </IonItem>
        </IonList>

        <IonAlert
          isOpen={confirmClear}
          header="Clear all data?"
          message="This deletes every deck and card on this device and cannot be undone. Type DELETE to confirm."
          inputs={[{ name: 'confirm', type: 'text', placeholder: 'DELETE' }]}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Clear all data',
              role: 'destructive',
              handler: (data: { confirm: string }) => {
                if (data.confirm?.trim() !== 'DELETE') {
                  toast('Type DELETE to confirm.');
                  return false;
                }
                void clearAll();
              },
            },
          ]}
          onDidDismiss={() => setConfirmClear(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
