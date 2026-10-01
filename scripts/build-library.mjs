#!/usr/bin/env node
/**
 * Community deck library.
 *
 * Every shared deck lives in decks/ as two files:
 *   decks/<slug>.fluxa   the deck, exactly as exported from FLUXA
 *   decks/<slug>.json    who shared it and under what licence (see decks/README.md)
 *
 * This checks every deck and writes the library for the website:
 *   <out>/decks/<slug>.fluxa
 *   <out>/decks/index.json   metadata used by the /library page
 *
 * Run on its own to validate the decks without building the site:
 *   npm run decks:check
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSZip = createRequire(import.meta.url)('jszip');

export const DECKS_DIR = join(root, 'decks');
export const MAX_BYTES = 25 * 1024 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CARD_TYPES = ['text', 'image', 'audio', 'youtube'];

/** Language name → countries (ISO 3166 codes), including dialects/varieties via their parent. */
export const loadLanguageCountries = () => {
  const data = JSON.parse(readFileSync(join(root, 'src/data/languages.json'), 'utf8'));
  const byName = new Map();
  for (const row of data.langs) {
    const [, name, , , countries = '', , , , aliases = '', dialects = ''] = row;
    const list = countries ? countries.split(' ') : [];
    const add = (n) => n && !byName.has(n.toLowerCase()) && byName.set(n.toLowerCase(), list);
    add(name);
    aliases.split('|').forEach(add);
    dialects.split('|').forEach(add);
  }
  return (language) => {
    const l = language.trim().toLowerCase();
    if (byName.has(l)) return byName.get(l);
    const inner = l.match(/\(([^)]+)\)\s*$/); // "Zezuru (Shona)"
    if (inner && byName.has(inner[1])) return byName.get(inner[1]);
    const outer = l.replace(/\s*\([^)]*\)\s*$/, '');
    return byName.get(outer) ?? [];
  };
};

/**
 * Check one .fluxa file. Returns { json, size, types, sample, problems }; it is
 * valid when `problems` is empty. Also used by scripts/deck-submission.mjs.
 */
export const validateDeckFile = async (file) => {
  const problems = [];
  const size = statSync(file).size;
  if (size > MAX_BYTES) problems.push(`is ${(size / 1048576).toFixed(1)} MB (max 25 MB)`);

  let zip;
  try {
    zip = await JSZip.loadAsync(readFileSync(file));
  } catch {
    return { problems: ['is not a valid zip / .fluxa file'] };
  }
  const deckFile = zip.file('deck.json');
  if (!deckFile) return { problems: ['has no deck.json'] };
  let json;
  try {
    json = JSON.parse(await deckFile.async('string'));
  } catch {
    return { problems: ['has a deck.json that is not valid JSON'] };
  }
  if (typeof json.fluxa_version !== 'string' || !json.fluxa_version.startsWith('1.')) problems.push('has an unsupported fluxa_version');
  if (!json.deck || typeof json.deck.name !== 'string' || !json.deck.name.trim()) problems.push('has no deck name');
  if (!Array.isArray(json.cards) || json.cards.length === 0) problems.push('has no cards');

  const types = {};
  for (const [i, c] of (json.cards ?? []).entries()) {
    if (!CARD_TYPES.includes(c?.type)) {
      problems.push(`card ${i + 1} has an unknown type "${c?.type}"`);
      continue;
    }
    types[c.type] = (types[c.type] ?? 0) + 1;
    const media = c.type === 'image' ? c.image_filename : c.type === 'audio' ? c.audio_filename : null;
    if (media && !zip.file(media)) problems.push(`card ${i + 1} is missing its ${c.type} file (${media})`);
    if (typeof c.back !== 'string' || !c.back.trim()) problems.push(`card ${i + 1} has an empty back`);
  }

  // A few text cards to preview on the library page
  const sample = (json.cards ?? [])
    .filter((c) => c?.type === 'text' && c.front && c.back)
    .slice(0, 3)
    .map((c) => ({ front: String(c.front).slice(0, 80), back: String(c.back).slice(0, 120) }));

  return { json, size, types, sample, problems };
};

const readMeta = (slug) => {
  const file = join(DECKS_DIR, `${slug}.json`);
  if (!existsSync(file)) return { problems: [`needs ${slug}.json with author and licence (see decks/README.md)`] };
  let meta;
  try {
    meta = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { problems: [`${slug}.json is not valid JSON`] };
  }
  const problems = [];
  if (typeof meta.author !== 'string' || !meta.author.trim()) problems.push(`${slug}.json needs an "author"`);
  if (typeof meta.licence !== 'string' || !meta.licence.trim()) problems.push(`${slug}.json needs a "licence"`);
  if (meta.added && !/^\d{4}-\d{2}-\d{2}$/.test(meta.added)) problems.push(`${slug}.json "added" must be YYYY-MM-DD`);
  return { meta, problems };
};

/** Validate every deck and, if `outDir` is given, write the library into it. */
export async function buildLibrary(outDir) {
  const countriesFor = loadLanguageCountries();
  const slugs = existsSync(DECKS_DIR)
    ? readdirSync(DECKS_DIR).filter((f) => f.endsWith('.fluxa')).map((f) => f.slice(0, -6)).sort()
    : [];

  const entries = [];
  const errors = [];
  for (const slug of slugs) {
    const problems = [];
    if (!SLUG.test(slug)) problems.push('file name must be lowercase-with-dashes.fluxa');
    const deck = await validateDeckFile(join(DECKS_DIR, `${slug}.fluxa`));
    const meta = readMeta(slug);
    problems.push(...deck.problems, ...meta.problems);
    if (problems.length) {
      errors.push(...problems.map((p) => `decks/${slug}.fluxa ${p}`));
      continue;
    }
    const { json, size, types, sample } = deck;
    const language = String(json.deck.language ?? '').trim();
    entries.push({
      slug,
      file: `/decks/${slug}.fluxa`,
      name: json.deck.name.trim(),
      language,
      countries: language ? countriesFor(language) : [],
      description: String(json.deck.description ?? '').trim(),
      cardCount: json.cards.length,
      types,
      size,
      author: meta.meta.author.trim(),
      authorUrl: typeof meta.meta.author_url === 'string' ? meta.meta.author_url : undefined,
      licence: meta.meta.licence.trim(),
      added: meta.meta.added ?? null,
      tags: Array.isArray(meta.meta.tags) ? meta.meta.tags.map(String) : [],
      sample,
    });
  }

  for (const [slug] of readdirSync(DECKS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.json'))
    .map((d) => [d.name.slice(0, -5)])) {
    if (!slugs.includes(slug)) errors.push(`decks/${slug}.json has no matching ${slug}.fluxa`);
  }

  if (errors.length) {
    throw new Error(`Community decks have problems:\n  - ${errors.join('\n  - ')}`);
  }

  entries.sort((a, b) => (b.added ?? '').localeCompare(a.added ?? '') || a.name.localeCompare(b.name));

  if (outDir) {
    const dir = join(outDir, 'decks');
    mkdirSync(dir, { recursive: true });
    for (const e of entries) copyFileSync(join(DECKS_DIR, `${e.slug}.fluxa`), join(dir, `${e.slug}.fluxa`));
    writeFileSync(
      join(dir, 'index.json'),
      JSON.stringify({ generated: new Date().toISOString(), count: entries.length, decks: entries })
    );
  }
  return entries;
}

// Run directly: validate only
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const entries = await buildLibrary();
    console.log(`${entries.length} community deck(s) OK:`);
    for (const e of entries) console.log(`  ${e.slug}: ${e.name} (${e.language}, ${e.cardCount} cards)`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
