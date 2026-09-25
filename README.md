# FLUXA

FLUXA is a free, open-source app for learning languages with interactive
flashcards that use text, images, audio and YouTube videos. It works completely
offline, with no accounts and no servers, and whole decks can be shared as a
single `.fluxa` file that anyone can import on any device.

## Features

- Four card types: **text**, **image** (camera or gallery), **audio**
  (recorded in the app) and **YouTube**. For YouTube cards you play the video
  while making the card and capture the exact start and end time of the clip.
- Review mode with a two-sided 3D card flip, a Flip button and keyboard
  shortcuts (Space flips, ← is Not yet, → is Got it). "Not yet" cards go to the
  end of the queue, and you can practise only the missed cards afterwards.
- Light, dark or system theme.
- Export a deck as a `.fluxa` file. It downloads on desktop and opens the
  share sheet on mobile.
- Import `.fluxa` files. Export all decks at once.
- Language picker with about 8,700 languages and 13,600 dialects and
  varieties. It covers living, extinct, ancient and historical, constructed
  (from Esperanto to Klingon and Na'vi) and sign languages. Languages are
  grouped by region and tagged by country, and macrolanguages list their
  members (e.g. Arabic → Egyptian Arabic).
- Installable PWA that works offline after the first load, plus Android and iOS
  builds from the same code.

Everything is stored on your device in IndexedDB, with images and audio in the
app's private file storage. Nothing leaves your device unless you share a file.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev          # http://localhost:8100
```

Other scripts:

```bash
npm run build        # type-check and build the PWA into dist/
npm run preview      # serve the production build locally
```

## Deploy the PWA

`npm run build` writes a static site into `dist/`, including the service
worker. Host it on any static host over HTTPS, for example Cloudflare Pages,
Netlify or GitHub Pages. Once deployed it can be installed from Chrome or Edge
("Install app"), from Android ("Add to Home screen") and from iOS Safari (Share →
"Add to Home Screen").

## Desktop app (Windows, macOS, Linux)

The desktop app uses [Tauri 2](https://tauri.app). It runs the same web app
inside the system's own web engine: WebView2 on Windows, WebKit on macOS and
Linux. Installers are small (under 10 MB), it starts fast and uses little
memory.

**Download:** see [Releases](https://github.com/yumevsn/FLUXA/releases).

**Build it yourself.** You need [Rust](https://rustup.rs) and, on Windows, the
Visual Studio C++ Build Tools. See Tauri's
[prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm run desktop:dev      # run the desktop app with hot reload
npm run desktop:build    # installers in src-tauri/target/release/bundle/
```

**Release builds:** push a version tag and GitHub Actions builds every
platform. It attaches the installers to a draft release for you to review and
publish.

```bash
git tag v1.0.0
git push origin v1.0.0
```

The desktop app saves exported decks with a normal "Save as…" dialog and opens
links in your browser. Your decks are stored in the app's own data folder.

## Build for Android and iOS

FLUXA uses [Capacitor](https://capacitorjs.com/) 5.

```bash
npm run build
npx cap add android      # first time only
npx cap sync android
npx cap open android     # opens Android Studio → Run / Build APK
```

```bash
# macOS with Xcode only
npm run build
npx cap add ios          # first time only
npx cap sync ios
npx cap open ios
```

After `cap add`, add the permissions the camera and microphone need:

- **Android** (`android/app/src/main/AndroidManifest.xml`):
  `CAMERA`, `RECORD_AUDIO`, `READ_MEDIA_IMAGES`.
- **iOS** (`ios/App/App/Info.plist`): `NSCameraUsageDescription`,
  `NSPhotoLibraryUsageDescription`, `NSMicrophoneUsageDescription`.

## The .fluxa file format

A `.fluxa` file is a zip archive containing:

```
deck-name.fluxa
├── deck.json      deck metadata and every card
├── images/        one file per image card
└── audio/         one file per audio card
```

YouTube cards store only the URL, never the video. Importers always give
cards new IDs, so the same deck can be imported many times without collisions.

The full specification is in [SPEC.md](SPEC.md), so anyone can build
compatible importers in other apps or languages.

## Project structure

```
src/
  components/   UI pieces (card flip, audio player/recorder, language picker…)
  db/           Dexie (IndexedDB) schema
  hooks/        deck/card CRUD, camera, audio recording
  pages/        Home, Deck, Add card, Card detail, Review, Settings
  utils/        .fluxa import/export, media storage, YouTube, languages
```

## Language data

`src/data/languages.json` is generated. To refresh it from the upstream sources, run:

```bash
npm run languages
```

The script downloads its sources into `scripts/sources/` (git-ignored) on the
first run:

- [ISO 639-3](https://iso639-3.sil.org/) code tables from SIL International.
  These give language status and macrolanguage membership.
- [Glottolog](https://glottolog.org/) (CC-BY 4.0). This gives dialects,
  countries and language families.
- [Unicode CLDR](https://cldr.unicode.org/). This gives speaker populations
  and regions.

To add varieties, alternate names or new languages, edit the curated lists at
the top of `scripts/build-languages.mjs`.

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch.
2. `npm install && npm run dev`
3. Keep changes small and focused. Run `npm run build` before opening a pull
   request. It type-checks the whole project.
4. Open a pull request describing what changed and how you tested it.

The MVP scope is deliberately small: no accounts, no backend, no sync. Please
open an issue to discuss larger features before building them. Changes to the
`.fluxa` format must update [SPEC.md](SPEC.md) and stay backwards compatible
within 1.x.

## Licence

[MIT](LICENSE). Free forever.

FLUXA: free, open-source, offline flashcards for everyone. No accounts. No
servers. Just learning.
