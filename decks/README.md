# Community decks

Every deck in this folder appears in the community library at
<https://fluxa-ochre.vercel.app/library>. Learners can download it, or open it
straight in FLUXA.

Want to share one? [Open a "Share a deck" issue](https://github.com/yumevsn/FLUXA/issues/new?template=share-a-deck.yml).
See [CONTRIBUTING.md](../CONTRIBUTING.md) for the guidelines.

## How a deck is stored

Each deck is two files with the same name. Use lowercase words joined by
dashes.

```
shona-everyday-phrases.fluxa   the deck, exactly as exported from FLUXA
shona-everyday-phrases.json    who shared it and under what licence
```

The `.json` file:

```json
{
  "author": "Tana Mungombe",
  "author_url": "https://github.com/yumevsn",
  "licence": "CC BY 4.0",
  "added": "2026-09-30",
  "tags": ["greetings", "beginner"]
}
```

| Field | Required | Notes |
|---|---|---|
| `author` | yes | Name to credit, as the person asked to be credited |
| `author_url` | no | Link for the credit, e.g. their GitHub profile |
| `licence` | yes | `CC BY 4.0` for community submissions |
| `added` | no | Date added to the library, `YYYY-MM-DD`. The newest decks are shown first |
| `tags` | no | A few short words, e.g. `beginner`, `market`, `songs` |

The deck's name, language, description and cards are read from the `.fluxa`
file itself.

## Adding a submitted deck (maintainers)

1. Download the `.fluxa.zip` attached to the issue and rename it to
   `<name>.fluxa`.
2. Open it in FLUXA and check it: the language is correct, there's nothing
   harmful, and the pictures and recordings are OK to share.
3. Add it here with its `.json` file. Credit the author and use the date you
   add it.
4. Run `npm run decks:check`. It validates every deck: that it's a proper
   FLUXA file, that its media files are present, that it's under 25 MB, and
   that the credit file is filled in.
5. Commit with `Closes #<issue number>`. The site rebuilds and the deck
   appears in the library.
