// LAGUNA BRAVA — hand-in launcher for the gta6-01 bounty (@climaxku / Climaxcuy).
//
// What this program does, in order:
//   1. Work out where the finished entry has to land — the directory named by
//      MAKEFUN_OUTPUT_DIR, or /output when that variable is not set.
//   2. Copy the static game (the game/ folder beside this file) into place.
//   3. Copy the screenshots folder the same way, when one is present.
//   4. Ask the vendored make.fun library to describe the staged tree and
//      write the result to dossier.json in the output directory.
//
// Node 22+, standard library only; the one import beyond node:* is the
// vendored buildDossier helper that ships with the entry.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Directory this launcher lives in; game/ and screenshots/ sit beside it.
const here = fileURLToPath(new URL('.', import.meta.url));

// The hand-in target: the caller's chosen output directory when provided,
// otherwise the conventional /output.
function resolveOutDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

// Create a directory, including any missing parents, and tolerate it
// already being there — every folder this launcher makes goes through here.
function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

// Copy a whole folder tree from beside this launcher into the output tree.
// A missing source means the entry was packaged wrong, so fail loudly and
// name the folder instead of letting a bare filesystem error bubble up.
function copyTree(from: string, to: string, label: string): void {
  if (!existsSync(from)) {
    throw new Error(`LAGUNA BRAVA hand-in: required folder missing: ${label} (${from})`);
  }
  cpSync(from, to, { recursive: true });
}

// Stage the playable game: create the output directory, then mirror game/
// into it so the entry runs from the output tree exactly as authored.
function stageGame(out: string): void {
  ensureDir(out);
  copyTree(join(here, 'game'), join(out, 'game'), 'game');
}

// Stage the screenshots next to the game. The target folder is created even
// when there is nothing to copy, so the output layout never depends on
// whether this build ships screenshots. Screenshots stay optional: a build
// without the folder simply skips the copy.
function stageScreenshots(out: string): void {
  ensureDir(join(out, 'screenshots'));
  if (existsSync(join(here, 'screenshots'))) {
    copyTree(join(here, 'screenshots'), join(out, 'screenshots'), 'screenshots');
  }
}

// The gta6-01 hand-in limits the dossier is measured against. They live in
// one named place so the numbers the judges check are easy to audit against
// the bounty rules, and they reach the vendored builder unchanged.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840, // cap on the text the dossier may carry
  screenshots: { max: 4, max_bytes: 262144 }, // at most 4 shots, 256 KiB each
  game_max_files: 993, // files allowed under game/
  game_max_bytes: 50331648, // 48 MiB total for the game tree
  game_path_max_bytes: 1000, // longest allowed in-game path, in bytes
};

// Describe the staged entry for the judges and write the dossier as JSON.
function writeDossier(out: string): void {
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_LIMITS));
}

function main(): void {
  const out = resolveOutDir();
  stageGame(out);
  stageScreenshots(out);
  writeDossier(out);
}

main();
