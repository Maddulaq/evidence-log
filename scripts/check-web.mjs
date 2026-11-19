import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../privacy.html', import.meta.url), 'utf8');
const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes));

if (blocks.length !== 1) throw new Error(`Expected one inline application script, found ${blocks.length}.`);
new Script(blocks[0][2], { filename: 'index.html:inline-script' });

const helperAt = html.indexOf('const $=id=>document.getElementById(id)');
const startupAt = html.indexOf('(function setupGuidedReport');
if (helperAt < 0 || startupAt < 0 || helperAt > startupAt) {
  throw new Error('DOM helper must be initialized before guided report startup.');
}
if (html.includes('window.loadOcrLibFallback') || html.includes('Banjara Hills 150')) {
  throw new Error('A stale OCR handler or hard-coded store default remains.');
}
for (const id of ['incidentForm','orderShot','category','orderId','store','incidentAt','supporting','notes','records','recordSearch']) {
  if (!html.includes('id="' + id + '"')) throw new Error('Required app element is missing: ' + id);
}
if (!privacy.includes('Device-local storage') || !privacy.includes('SOP & Proof Hub')) {
  throw new Error('Privacy policy content is missing its required identity or storage disclosure.');
}
console.log('Web source checks passed: inline JavaScript parses and required app/privacy elements are present.');
