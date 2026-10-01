#!/usr/bin/env node
/**
 * Handles "Share a deck" issues. Run by .github/workflows/deck-submissions.yml.
 *
 *   node scripts/deck-submission.mjs check     validate the attached deck and report on the issue
 *   node scripts/deck-submission.mjs publish   add the deck to decks/ (after a maintainer approves)
 *
 * Inputs come from environment variables (never from the command line, so
 * nothing in the issue can be run as a shell command):
 *   ISSUE_NUMBER, ISSUE_BODY, ISSUE_AUTHOR, GITHUB_REPOSITORY, GITHUB_TOKEN
 *   GITHUB_OUTPUT   (publish) where to write slug/name for the commit step
 *
 * For local testing: DECK_FILE=path/to/deck.fluxa skips the download, and
 * without GITHUB_TOKEN the issue comment is printed instead of posted.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLibrary, DECKS_DIR, MAX_BYTES, validateDeckFile } from './build-library.mjs';

const MODE = process.argv[2];
const {
  ISSUE_NUMBER,
  ISSUE_BODY = '',
  ISSUE_AUTHOR = '',
  GITHUB_REPOSITORY,
  GITHUB_TOKEN,
  GITHUB_OUTPUT,
  DECK_FILE,
} = process.env;

const MARKER = '<!-- fluxa-deck-check -->';
const LABELS = {
  submission: { name: 'deck submission', color: '2D5A3D', description: 'A deck shared for the community library' },
  ready: { name: 'ready for review', color: '7CC394', description: 'Deck passed the automatic checks' },
  changes: { name: 'needs changes', color: 'D39A3A', description: 'Deck needs fixing before it can be added' },
  approved: { name: 'approved', color: '0E8A16', description: 'Maintainer approved: publish to the library' },
  published: { name: 'published', color: '1D76DB', description: 'Deck is live in the community library' },
};
const LIBRARY_URL = 'https://fluxa-ochre.vercel.app/library';

// ---------------------------------------------------------------------------
// GitHub API (no-ops that print when there is no token, for local testing)
// ---------------------------------------------------------------------------
const api = async (method, path, body) => {
  if (!GITHUB_TOKEN) {
    console.log(`[dry run] ${method} ${path}${body ? ' ' + JSON.stringify(body).slice(0, 400) : ''}`);
    return null;
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && method !== 'POST') return null;
  if (!res.ok) throw new Error(`GitHub API ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

const ensureLabel = async (label) => {
  if (!GITHUB_TOKEN) return;
  const existing = await api('GET', `/labels/${encodeURIComponent(label.name)}`);
  if (!existing) await api('POST', '/labels', label);
};

const setLabels = async ({ add = [], remove = [] }) => {
  for (const l of add) await ensureLabel(l);
  if (add.length) await api('POST', `/issues/${ISSUE_NUMBER}/labels`, { labels: add.map((l) => l.name) });
  for (const l of remove) await api('DELETE', `/issues/${ISSUE_NUMBER}/labels/${encodeURIComponent(l.name)}`);
};

/** Create or update the bot's single status comment on the issue. */
const upsertComment = async (text) => {
  const body = `${MARKER}\n${text}`;
  if (!GITHUB_TOKEN) {
    console.log('\n----- issue comment -----\n' + text + '\n-------------------------');
    return;
  }
  const comments = (await api('GET', `/issues/${ISSUE_NUMBER}/comments?per_page=100`)) ?? [];
  const mine = comments.find((c) => c.body?.startsWith(MARKER) && c.user?.type === 'Bot');
  if (mine) await api('PATCH', `/issues/comments/${mine.id}`, { body });
  else await api('POST', `/issues/${ISSUE_NUMBER}/comments`, { body });
};

const comment = async (text) => {
  if (!GITHUB_TOKEN) return console.log('\n----- new comment -----\n' + text);
  await api('POST', `/issues/${ISSUE_NUMBER}/comments`, { body: text });
};

// ---------------------------------------------------------------------------
// Reading the issue form
// ---------------------------------------------------------------------------
/** GitHub issue forms render as "### Label\n\nvalue" sections. */
const parseForm = (body) => {
  const fields = {};
  for (const part of body.replace(/\r/g, '').split(/^### /m).slice(1)) {
    const nl = part.indexOf('\n');
    const label = part.slice(0, nl).trim().toLowerCase();
    let value = part.slice(nl + 1).trim();
    if (value === '_No response_') value = '';
    fields[label] = value;
  }
  const field = (prefix) => Object.entries(fields).find(([k]) => k.startsWith(prefix))?.[1] ?? '';
  return {
    credit: field('credit'),
    file: field('deck file'),
    rules: field('sharing rules'),
  };
};

/** Attachments live on github.com/user-attachments (or the older /owner/repo/files). */
const findAttachment = (text) => {
  const urls = text.match(/https:\/\/github\.com\/[^\s)<>"']+/g) ?? [];
  return (
    urls.find((u) => /^https:\/\/github\.com\/user-attachments\/files\/\d+\//.test(u)) ??
    urls.find((u) => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/files\/\d+\//.test(u)) ??
    null
  );
};

const download = async (url, dest) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const final = new URL(res.url);
  const okHost = final.hostname === 'github.com' || final.hostname.endsWith('.githubusercontent.com');
  if (!okHost) throw new Error(`unexpected download host ${final.hostname}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error(`file is ${(len / 1048576).toFixed(1)} MB (max 25 MB)`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`file is ${(buf.length / 1048576).toFixed(1)} MB (max 25 MB)`);
  writeFileSync(dest, buf);
};

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '') || 'deck';

const kb = (n) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const TYPE_NAMES = { text: 'text', image: 'picture', audio: 'audio', youtube: 'YouTube' };

/** Download (or read) and validate the submission. */
const inspect = async () => {
  const problems = [];
  const form = parseForm(ISSUE_BODY);

  const ticked = (form.rules.match(/^- \[x\]/gim) ?? []).length;
  if (ticked < 3) problems.push('Please tick all three boxes under **Sharing rules**.');

  const dir = mkdtempSync(join(tmpdir(), 'fluxa-deck-'));
  const file = join(dir, 'deck.fluxa');
  if (DECK_FILE) {
    copyFileSync(DECK_FILE, file);
  } else {
    const url = findAttachment(form.file);
    if (!url) {
      problems.push(
        'I couldn’t find an attached deck. Rename your `.fluxa` file to end in `.zip` (e.g. `my-deck.fluxa.zip`) and drag it into **Deck file**.'
      );
      return { problems, form, dir };
    }
    try {
      await download(url, file);
    } catch (e) {
      problems.push(`I couldn’t download the attached file: ${e.message}.`);
      return { problems, form, dir };
    }
  }

  const deck = await validateDeckFile(file);
  problems.push(...deck.problems.map((p) => `The deck ${p}.`));
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  return { problems, form, dir, file, deck, sha256 };
};

const summary = ({ json, size, types }) => {
  const kinds = Object.entries(types)
    .map(([t, n]) => `${n} ${TYPE_NAMES[t] ?? t}`)
    .join(', ');
  return [
    `| | |`,
    `|---|---|`,
    `| **Deck** | ${json.deck.name} |`,
    `| **Language** | ${json.deck.language || '(not set)'} |`,
    `| **Cards** | ${json.cards.length} (${kinds}) |`,
    `| **Size** | ${kb(size)} |`,
  ].join('\n');
};

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------
const check = async () => {
  const r = await inspect();
  try {
    if (r.problems.length) {
      await upsertComment(
        [
          '### ⚠️ This deck needs a few changes',
          '',
          ...r.problems.map((p) => `- ${p}`),
          '',
          'Edit this issue to fix them and I’ll check again automatically.',
        ].join('\n')
      );
      await setLabels({ add: [LABELS.submission, LABELS.changes], remove: [LABELS.ready] });
      return;
    }
    await upsertComment(
      [
        '### ✅ Thanks! Your deck passed the automatic checks',
        '',
        summary(r.deck),
        '',
        'A maintainer will look through it and, once it’s approved, it’ll appear in the [community library](' +
          LIBRARY_URL +
          ').',
        '',
        `<sub>Checked file SHA-256: \`${r.sha256.slice(0, 16)}…\`. Maintainers: review the deck, then add the \`approved\` label to publish it.</sub>`,
      ].join('\n')
    );
    await setLabels({ add: [LABELS.submission, LABELS.ready], remove: [LABELS.changes] });
    // So maintainers can pick it from the label list
    await ensureLabel(LABELS.approved);
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
};

const publish = async () => {
  const r = await inspect();
  try {
    if (r.problems.length) {
      await comment(
        ['### ❌ Couldn’t publish this deck', '', ...r.problems.map((p) => `- ${p}`), '', 'Once it’s fixed, remove and re-add the `approved` label.'].join('\n')
      );
      await setLabels({ add: [LABELS.changes], remove: [LABELS.approved, LABELS.ready] });
      process.exitCode = 1;
      return;
    }

    // Credit: what the submitter asked for, else their GitHub username
    const credit = r.form.credit.replace(/[\r\n]+/g, ' ').trim().slice(0, 80) || ISSUE_AUTHOR;
    const name = r.deck.json.deck.name.trim();
    let slug = slugify(name);
    for (let i = 2; existsSync(join(DECKS_DIR, `${slug}.fluxa`)); i++) slug = `${slugify(name)}-${i}`;

    copyFileSync(r.file, join(DECKS_DIR, `${slug}.fluxa`));
    const meta = {
      author: credit,
      ...(ISSUE_AUTHOR ? { author_url: `https://github.com/${ISSUE_AUTHOR}` } : {}),
      licence: 'CC BY 4.0',
      added: new Date().toISOString().slice(0, 10),
      tags: [],
      ...(ISSUE_NUMBER ? { source: `#${ISSUE_NUMBER}` } : {}),
    };
    writeFileSync(join(DECKS_DIR, `${slug}.json`), JSON.stringify(meta, null, 2) + '\n');

    // Whole library must still validate
    try {
      await buildLibrary();
    } catch (e) {
      rmSync(join(DECKS_DIR, `${slug}.fluxa`), { force: true });
      rmSync(join(DECKS_DIR, `${slug}.json`), { force: true });
      throw e;
    }

    if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `slug=${slug}\nname=${name.replace(/[\r\n]/g, ' ')}\n`);
    console.log(`Added decks/${slug}.fluxa (${name}), credited to ${credit}`);
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
};

/** After the commit is pushed: tell the submitter and tidy labels. */
const announce = async () => {
  const slug = process.env.DECK_SLUG;
  await comment(
    [
      '### 🎉 Your deck is in the community library',
      '',
      `It’ll be live in a minute or two: [${LIBRARY_URL}?q=${encodeURIComponent(process.env.DECK_NAME ?? slug)}](${LIBRARY_URL}?q=${encodeURIComponent(process.env.DECK_NAME ?? slug)})`,
      '',
      'Thank you for helping people learn your language. 💚',
    ].join('\n')
  );
  await setLabels({ add: [LABELS.published], remove: [LABELS.ready, LABELS.changes] });
  await api('PATCH', `/issues/${ISSUE_NUMBER}`, { state: 'closed', state_reason: 'completed' });
};

const modes = { check, publish, announce };
if (!modes[MODE]) {
  console.error('usage: node scripts/deck-submission.mjs <check|publish|announce>');
  process.exit(2);
}
await modes[MODE]();
