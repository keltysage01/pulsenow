import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';

if (!existsSync('index.html')) {
  throw new Error('index.html is required for the static Pulsenow deployment.');
}

const outDir = 'dist';
const staticEntries = [
  'index.html',
  'pulsenow_landing_layers',
  'badge-icons',
  'pulsenow-logo-transparent-cropped.png',
  'pulsenow-logo-transparent.png',
  'pulsenow-logo.jpeg',
];
const publicEntries = ['design-system', 'backgrounds', 'social-assets'];
const publicFiles = ['dream-mic-button.png'];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const entry of staticEntries) {
  if (!existsSync(entry)) continue;
  await cp(entry, `${outDir}/${entry}`, { recursive: true });
}

for (const entry of publicEntries) {
  const source = `public/${entry}`;
  if (!existsSync(source)) continue;
  await mkdir(`${outDir}/public`, { recursive: true });
  await cp(source, `${outDir}/public/${entry}`, { recursive: true });
}

for (const file of publicFiles) {
  const source = `public/${file}`;
  if (!existsSync(source)) continue;
  await mkdir(`${outDir}/public`, { recursive: true });
  await cp(source, `${outDir}/public/${file}`);
}

await rm(`${outDir}/public/backgrounds/premium_seed_images`, { recursive: true, force: true });

console.log('Pulsenow static build: wrote the static app shell and referenced assets to dist.');
