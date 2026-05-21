import { existsSync } from 'node:fs';

if (!existsSync('index.html')) {
  throw new Error('index.html is required for the static Pulsenow deployment.');
}

console.log('Pulsenow static build: keeping root index.html and Vercel API functions intact.');
