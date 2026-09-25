# Contributing to FLUXA

There are two ways to help: **share a deck** so others can learn, or **improve
the app** itself.

## Share a deck

Decks made by people who live a language are the heart of FLUXA: everyday
phrases, local slang, the words you need at the market. Shared decks will be
listed in the community library on [the FLUXA website](https://fluxa-ochre.vercel.app),
searchable by language and country.

1. **Make the deck in FLUXA.** Any mix of text, pictures, audio and YouTube clips
   works.
2. **Export it.** Open the deck and use the export button. You get a single
   `.fluxa` file with everything inside it.
3. **Submit it.** [Open a "Share a deck" issue](https://github.com/yumevsn/FLUXA/issues/new?template=share-a-deck.yml).
   GitHub doesn't accept the `.fluxa` extension, so rename the file to end in
   `.zip` (for example `market-vocabulary.fluxa.zip`) and attach it. It's the
   same file.

A maintainer checks each deck before it's published.

### Deck guidelines

- **Share only what you have the right to share.** Your own text, photos and
  recordings are fine. Don't include pictures or audio copied from elsewhere
  unless their licence allows it. YouTube cards only store a link, so they're
  fine to share.
- **Ask first.** Anyone you recorded or photographed must agree to be shared.
- **Licence.** Shared decks are published under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Others may use and
  adapt them if they credit you.
- **Keep it small.** Stay under 25 MB. Resize big photos, and use YouTube clips
  instead of long recordings where you can.
- **Label it clearly.** Give the deck a descriptive name, the right language
  and dialect, and a short description of who it's for.
- **Be kind.** No hateful, sexual or harmful content.

## Improve the app

1. Fork the repository and create a branch.
2. Run `npm install` and `npm run dev`. The app runs at http://localhost:8100.
3. Keep changes small and focused. Run `npm run build` before opening a pull
   request. It type-checks the whole project.
4. Open a pull request saying what changed and how you tested it.

Useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | Web app with hot reload |
| `npm run desktop:dev` | Desktop app (needs Rust, see README) |
| `npm run build:site` | Landing page + web app, as deployed on Vercel |
| `npm run languages` | Rebuild the language catalogue |

FLUXA deliberately has no accounts and no servers. Please open an issue to
discuss bigger features before building them. Changes to the `.fluxa` format
must update [SPEC.md](SPEC.md) and stay backwards compatible within 1.x.
