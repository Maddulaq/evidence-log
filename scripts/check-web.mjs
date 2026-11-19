import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../privacy.html', import.meta.url), 'utf8');
const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes));

if (blocks.length !== 1) throw new Error(`Expected one inline application script, found ${blocks.length}.`);
const appSource = blocks[0][2];
new Script(appSource, { filename: 'index.html:inline-script' });

const helperAt = html.indexOf('const $=id=>document.getElementById(id)');
const startupAt = html.indexOf('(function setupGuidedReport');
if (helperAt < 0 || startupAt < 0 || helperAt > startupAt) {
  throw new Error('DOM helper must be initialized before guided report startup.');
}
if (html.includes('window.loadOcrLibFallback') || html.includes('Banjara Hills 150')) {
  throw new Error('A stale OCR handler or hard-coded store default remains.');
}
const required = ['incidentForm','orderShot','category','orderId','store','incidentAt','supporting','notes','records','recordSearch','languageToggle','languageToggleMobile'];
for (const id of required) {
  if (!html.includes('id="' + id + '"')) throw new Error('Required app element is missing: ' + id);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML element IDs detected.');

if (!appSource.includes("tesseract.js@5.0.0") ||
    !appSource.includes('workerPath:config.worker,corePath:config.core') ||
    !appSource.includes('Timed out loading OCR library') ||
    !appSource.includes('[label-crop numeric pass]')) {
  throw new Error('OCR loader or label-anchored Order ID recognition safeguards are missing.');
}

if (!html.includes('id="ocrConfidence"') ||
    !appSource.includes('function estimateOcrConfidence(words)') ||
    !appSource.includes('confidence:estimateOcrConfidence(r.words)') ||
    !appSource.includes('ocrConfidence') ||
    !appSource.includes('ocrVerify')) {
  throw new Error('OCR confidence feedback or bilingual verification copy is missing.');
}
const confidenceStart = appSource.indexOf('function estimateOcrConfidence(words){');
const confidenceEnd = appSource.indexOf('function exactOrderIdFromDigits(raw){', confidenceStart);
if (confidenceStart < 0 || confidenceEnd <= confidenceStart) {
  throw new Error('OCR confidence helper could not be located.');
}
const confidenceSource = appSource.slice(confidenceStart, confidenceEnd);
const estimateOcrConfidence = new Function(confidenceSource + '; return estimateOcrConfidence;')();
if (estimateOcrConfidence([{confidence:80},{confidence:90}]) !== 85 ||
    estimateOcrConfidence([{confidence:-1},{confidence:101}]) !== null ||
    estimateOcrConfidence([]) !== null) {
  throw new Error('OCR confidence helper failed its numeric boundary tests.');
}
if (!appSource.includes("issueDescriptionsTe") ||
    !appSource.includes("languageToggleMobile") ||
    !appSource.includes('Could not refresh records after language change')) {
  throw new Error('Language switching is missing bilingual templates or saved-record refresh.');
}

const parserStart = appSource.indexOf('function extractOrderId(rawText){');
const parserEnd = appSource.indexOf('/* ---------- Order ID OCR', parserStart);
if (parserStart < 0 || parserEnd <= parserStart) throw new Error('Order ID parser could not be located.');
const parserSource = appSource.slice(parserStart, parserEnd);
const extractOrderId = new Function('OCR_DIGIT_MAP', parserSource + '; return extractOrderId;')({
  O:'0', Q:'0', D:'0', U:'0', I:'1', L:'1', '|':'1', '!':'1', '[':'1', ']':'1', S:'5', B:'8', Z:'2', G:'6', T:'7'
});
if (extractOrderId('Order ID: OD123456789012345678') !== 'OD123456789012345678') {
  throw new Error('Order ID parser failed a valid prefixed ID test.');
}
if (extractOrderId('Order ID\n123456789012345678') !== 'OD123456789012345678') {
  throw new Error('Order ID parser failed a split-label ID test.');
}
if (extractOrderId('123456789012345678') !== null) {
  throw new Error('Order ID parser accepted an unlabelled 18-digit number.');
}
if (!privacy.includes('Device-local storage') || !privacy.includes('SOP &amp; Proof Hub')) {
  throw new Error('Privacy policy content is missing its required identity or storage disclosure.');
}
console.log('Web checks passed: application syntax, startup order, unique IDs, bilingual controls, OCR loading safeguards, Order ID parser cases and privacy policy.');
