// SKY RUSH — Island Courier: the entrypoint for this bounty (Node 22,
// standard library only). It hands the game in: copies game/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there with the vendored make.fun library, so the dossier is
// byte-for-byte what the scorer computes from the same files.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and play the game with `node serve.ts`, then http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps the scorer enforces for this bounty: at most 160 KiB of dossier
// text, at most 4 screenshots of 256 KiB each, at most 993 files or 48 MiB
// under game/, and no game path over 1000 bytes. buildDossier refuses an
// entry that breaks any of them, so a dossier that writes here is one the
// scorer accepts.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
