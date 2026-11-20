// Leonida Legend — GTA VI trophy guide & tracker, make.fun entry gta6-trophy-guide-01.
// The guide is plain static files: app/index.html, app/app.js, app/style.css and
// app/data/trophies.json (the official 55, each with a guide in our own words and its
// sources). It runs offline from app/ with no build step and no network at run time.
// This program hands it in: it copies app/ and screenshots/ from beside this file into
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes /output/dossier.json
// with buildDossier from the vendored make.fun library. Leave vendor/makefun-frontend.ts
// untouched — the scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Run it locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide:  node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files: app/
// counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
