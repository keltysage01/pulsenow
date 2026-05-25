import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';

if (!existsSync('index.html')) {
  throw new Error('index.html is required for the static Pulsenow deployment.');
}

const outDir = 'dist';
const staticEntries = [
  'index.html',
  'public',
  'pulsenow_landing_layers',
  'badge-icons',
  'assets',
  'backgrounds',
  'pulsenow-logo-transparent-cropped.png',
  'pulsenow-logo-transparent.png',
  'pulsenow-logo.jpeg',
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const entry of staticEntries) {
  if (!existsSync(entry)) continue;
  await cp(entry, `${outDir}/${entry}`, { recursive: true });
}

console.log('Pulsenow static build: wrote minimal static app to dist and kept Vercel API functions intact.');
