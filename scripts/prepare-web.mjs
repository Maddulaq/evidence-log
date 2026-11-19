import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('www', { recursive: true });
await Promise.all([
  copyFile('index.html', 'www/index.html'),
  copyFile('privacy.html', 'www/privacy.html')
]);
console.log('Prepared SOP & Proof Hub web app and privacy policy for Android.');
