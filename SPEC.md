# The .fluxa file format — version 1.0

A `.fluxa` file is a single flashcard deck. It is a standard **ZIP archive**
with the extension `.fluxa`. Any app, in any language, can read or write one
using an ordinary zip library and a JSON parser.

This document is licensed under MIT, like the rest of FLUXA. You are welcome
to build compatible importers and exporters.

## Archive layout

```
deck-name.fluxa          (a zip file)
├── deck.json            deck metadata and all card data   (required)
├── images/
│   └── <card-id>.jpg    one file per image card           (optional)
└── audio/
    └── <card-id>.m4a    one file per audio card           (optional)
```

- `deck.json` sits at the root of the archive and is **UTF-8 encoded JSON**.
- Media files are referenced from `deck.json` by their path inside the zip.
  Writers name them after the card's `id`. Readers must use the path given
  in `deck.json` and must not assume a naming pattern.
- Text and YouTube cards never have a media file.

## deck.json

```json
{
  "fluxa_version": "1.0",
  "exported_at": "2026-09-24T09:00:00Z",
  "deck": {
    "id": "5b1c…",
    "name": "Brazilian Portuguese — Market Vocabulary",
    "language": "Portuguese",
    "description": "Vocabulary from Feira market visits",
    "card_count": 4,
    "created_at": "2026-09-20T08:00:00Z"
  },
  "cards": [ … ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `fluxa_version` | string | yes | `"1.0"` for this spec. Readers should accept any `1.x` |
| `exported_at` | ISO 8601 string | yes | When the file was written |
| `deck.id` | string (UUID) | yes | Informational only (see *IDs* below) |
| `deck.name` | string | yes | |
| `deck.language` | string | yes | Free text, may be empty. FLUXA writes an English language name such as `"Shona"`, or `"Any"` |
| `deck.description` | string | no | May be empty |
| `deck.card_count` | integer | yes | Number of entries in `cards` |
| `deck.created_at` | ISO 8601 string | yes | |
| `cards` | array | yes | May be empty |

### Cards

Every card has a front and a back. The **back is always plain text**. Cards
differ only in what the front contains.

Common fields:

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `type` | `"text"` \| `"image"` \| `"audio"` \| `"youtube"` | |
| `back` | string | The answer. Plain text; newlines allowed |
| `created_at` | ISO 8601 string | |

#### `text`

```json
{ "id": "…", "type": "text", "front": "saudade",
  "back": "A deep longing. No English equivalent.", "created_at": "…" }
```

| Field | Notes |
|---|---|
| `front` | Plain text shown on the front |

#### `image`

```json
{ "id": "…", "type": "image", "front_label": "Name the fruits on this stall",
  "back": "manga, abacaxi, maracujá", "image_filename": "images/….jpg",
  "created_at": "…" }
```

| Field | Notes |
|---|---|
| `front_label` | Optional question or instruction shown under the image (may be `""`) |
| `image_filename` | Path to the image inside the zip. JPEG is recommended; PNG and WebP are allowed |

#### `audio`

```json
{ "id": "…", "type": "audio", "front_label": "What is she saying?",
  "back": "Tudo bem, e você? — All good, and you?",
  "audio_filename": "audio/….m4a", "created_at": "…" }
```

| Field | Notes |
|---|---|
| `front_label` | Optional label (may be `""`) |
| `audio_filename` | Path to the recording inside the zip. The extension gives the format: `.m4a`/`.aac` (AAC, used by the iOS and Android apps), `.webm` or `.ogg` (used by some browsers), `.mp3`, `.wav` |

#### `youtube`

```json
{ "id": "…", "type": "youtube",
  "front_label": "Watch from 1:24 — what does she order?",
  "back": "Ela pede um café com leite e um pão de queijo",
  "youtube_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX&t=84",
  "created_at": "…" }
```

| Field | Notes |
|---|---|
| `front_label` | What the learner should do. Required |
| `youtube_url` | Any `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/` or `/live/` URL. A `t=` or `start=` parameter (`84`, `84s`, `1m24s` or `1:24`) sets the start time. An optional `end=` parameter (same formats) marks where the clip ends. FLUXA writes `https://www.youtube.com/watch?v=ID&t=84&end=100` |

The video itself is **never** stored in the file. Only the URL is saved.

## Rules for readers (importers)

1. Unzip the archive. If it is not a valid zip, or has no `deck.json` at the
   root, reject it as "not a FLUXA file".
2. If `deck.json` is not valid JSON, reject it as "damaged".
3. Check that `fluxa_version` starts with `1.`, and that `deck` is an object and
   `cards` is an array.
4. **Generate new IDs** for the deck and every card. Never reuse IDs from the
   file. The same deck may be imported many times, and on many devices.
5. If a card's media file is missing from the archive, import the card without
   media and warn the user. Do not fail the whole import.
6. Skip cards with an unknown `type`, and tell the user how many were skipped.
7. Ignore unknown fields. Future 1.x versions may add optional fields.

## Rules for writers (exporters)

- The file extension is always `.fluxa`.
- Write `deck.json` as UTF-8 JSON.
- Store each image or audio file once, under `images/` or `audio/`, named after
  the card's `id`.
- Omit `image_filename` / `audio_filename` if the media is unavailable.

## Versioning

Adding optional fields is a **minor** change (1.0 → 1.1). Existing readers
keep working. A change that older readers cannot understand safely is a
**major** change (2.0), and 1.x readers must reject it.
