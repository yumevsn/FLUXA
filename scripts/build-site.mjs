#!/usr/bin/env node
/**
 * Builds the website deployed on Vercel (see vercel.json):
 *
 *   site-dist/            landing page (landing/)
 *   site-dist/app/        the FLUXA web app, built with base "/app/"
 *   site-dist/decks/      the community deck library (see scripts/build-library.mjs)
 *
 *   npm run build:site
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { buildLibrary } from './build-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site-dist');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. The web app under /app/
process.env.FLUXA_BASE = '/app/';
await build({
  root,
  configFile: join(root, 'vite.config.ts'),
  base: '/app/',
  build: { outDir: join(out, 'app'), emptyOutDir: true },
  logLevel: 'warn',
});

// 2. The landing page at the root, plus the icons it shares with the app
cpSync(join(root, 'landing'), out, { recursive: true });
for (const icon of ['icon-192.png', 'icon-512.png']) {
  cpSync(join(root, 'public', icon), join(out, icon));
}

// 3. The community deck library (decks/ → /decks/*.fluxa + /decks/index.json)
const decks = await buildLibrary(out);

console.log(`Built site-dist/ (landing page + /app/ + ${decks.length} community decks)`);
