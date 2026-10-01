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

This is automated by [.github/workflows/deck-submissions.yml](../.github/workflows/deck-submissions.yml):

1. **Someone submits a deck** through the "Share a deck" form. Within a minute
   the Action downloads the attached file, runs the same checks as the site
   build, and replies on the issue. The issue gets the label
   `ready for review` with a summary of the deck, or `needs changes` with a
   list of what to fix. Editing the issue re-runs the check.
2. **You review it.** Download the attachment, open it in FLUXA, and check the
   language is right, nothing is harmful, and the pictures and recordings are
   OK to share.
3. **Add the `approved` label.** The Action adds the deck and its credit file
   here, commits to `main` with `Closes #<issue>`, comments with the library
   link, and labels the issue `published`. The site redeploys on its own.

The deck is credited to the name the submitter gave, or to their GitHub
username, under CC BY 4.0. To change its tags or credit, edit its `.json` file
here.

### Adding a deck by hand

1. Put `<name>.fluxa` and `<name>.json` in this folder, using the format above.
2. Run `npm run decks:check` to validate every deck.
3. Commit and push. The deck appears in the library after the next deploy.
