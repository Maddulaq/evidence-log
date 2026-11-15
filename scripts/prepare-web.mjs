import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('www', { recursive: true });
await copyFile('index.html', 'www/index.html');
console.log('Prepared SOP & Proof Hub web assets for Android.');
