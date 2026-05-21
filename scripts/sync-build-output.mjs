import { cp, rm } from 'node:fs/promises';

await rm('assets', { recursive: true, force: true });
await cp('build-output/index.html', 'index.html');
await cp('build-output/assets', 'assets', { recursive: true });
