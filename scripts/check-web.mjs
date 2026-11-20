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

if (!appSource.includes('function findPotentialDuplicate(records,candidate){') ||
    !appSource.includes('Possible duplicate detected') ||
    !appSource.includes('window.confirm(message)')) {
  throw new Error('Duplicate incident warning or explicit save-anyway confirmation is missing.');
}
const duplicateStart = appSource.indexOf('function findPotentialDuplicate(records,candidate){');
const duplicateEnd = appSource.indexOf('function openDB()', duplicateStart);
if (duplicateStart < 0 || duplicateEnd <= duplicateStart) throw new Error('Duplicate detection helper could not be located.');
const duplicateSource = appSource.slice(duplicateStart, duplicateEnd);
const findPotentialDuplicate = new Function(duplicateSource + '; return findPotentialDuplicate;')();
const duplicateBase = {orderId:'OD123456789012345678',category:'Wrong item given',store:'Hub A',incidentAt:'2026-11-20T10:00'};
if (!findPotentialDuplicate([{...duplicateBase,id:'old'}],duplicateBase) ||
    findPotentialDuplicate([{...duplicateBase,store:'Hub B'}],duplicateBase) !== null ||
    findPotentialDuplicate([{...duplicateBase,category:'Manager misconduct'}],duplicateBase) !== null ||
    findPotentialDuplicate([{...duplicateBase,incidentAt:'2026-11-19T10:00'}],duplicateBase) !== null) {
  throw new Error('Duplicate detection failed exact-match or non-duplicate boundary cases.');
}
if (!html.includes("indexedDB.open(DB_NAME,2)") ||
    !html.includes("createObjectStore(DRAFT_STORE") ||
    !html.includes("function scheduleDraftSave()") ||
    !html.includes("async function restoreDraft()") ||
    !html.includes("setupDraftAutosave();await restoreDraft();") ||
    !html.includes('id="draftStatus"') ||
    !appSource.includes("function draftHasContent(draft)")) {
  throw new Error('Automatic draft recovery, IndexedDB v2 migration, or draft status UI is missing.');
}
const draftStart = appSource.indexOf('function draftHasContent(draft){');
const draftEnd = appSource.indexOf('function persistDraft(){', draftStart);
if (draftStart < 0 || draftEnd <= draftStart) throw new Error('Draft content guard could not be located.');
const draftSource = appSource.slice(draftStart, draftEnd);
const draftHasContent = new Function(draftSource + '; return draftHasContent;')();
if (draftHasContent({fields:{orderId:'OD123'},orderScreenshot:null,supportingEvidence:[]}) !== true ||
    draftHasContent({fields:{},orderScreenshot:null,supportingEvidence:[]}) !== false ||
    draftHasContent({fields:{},orderScreenshot:null,supportingEvidence:[{name:'photo.jpg'}]}) !== true) {
  throw new Error('Draft content guard failed its empty and populated draft cases.');
}
if (!html.includes('pattern="[Oo][Dd][0-9]{18}"') ||
    !appSource.includes('function getLocalRecord(id){') ||
    !appSource.includes('function recordHasCompleteEvidence(saved,expectedShot,expectedExtras){') ||
    !appSource.includes('const persisted=await getLocalRecord(record.id)') ||
    !appSource.includes('r.onabort=()=>reject(new Error(\'Reading \'+file.name+\' was interrupted. Please choose the image again.\'))') ||
    !appSource.includes('tx.onabort=()=>reject(tx.error||new Error(\'The incident save was interrupted.\'))')) {
  throw new Error('Evidence submission must accept lowercase Order IDs, handle interrupted file reads/writes, and verify the saved files.');
}
const evidenceStart = appSource.indexOf('function recordHasCompleteEvidence(saved,expectedShot,expectedExtras){');
const evidenceEnd = appSource.indexOf('function deleteLocalRecord', evidenceStart);
if (evidenceStart < 0 || evidenceEnd <= evidenceStart) throw new Error('Saved evidence verification helper could not be located.');
const evidenceSource = appSource.slice(evidenceStart, evidenceEnd);
const recordHasCompleteEvidence = new Function(evidenceSource + '; return recordHasCompleteEvidence;')();
const shotFile = {name:'order.png'};
const extraFiles = [{name:'proof-1.png'},{name:'proof-2.png'}];
const validSaved = {orderScreenshot:{name:'order.png',data:'data:image/png;base64,AA=='},supportingEvidence:[
 {name:'proof-1.png',data:'data:image/png;base64,AA=='},
 {name:'proof-2.png',data:'data:image/png;base64,AA=='}
]};
if (!recordHasCompleteEvidence(validSaved,shotFile,extraFiles) ||
    recordHasCompleteEvidence({...validSaved,orderScreenshot:{name:'order.png',data:''}},shotFile,extraFiles) ||
    recordHasCompleteEvidence({...validSaved,supportingEvidence:validSaved.supportingEvidence.slice(0,1)},shotFile,extraFiles) ||
    recordHasCompleteEvidence({...validSaved,supportingEvidence:[{name:'wrong.png',data:'data:image/png;base64,AA=='},validSaved.supportingEvidence[1]]},shotFile,extraFiles)) {
  throw new Error('Saved evidence verification failed valid, missing-file, incomplete-count or filename-mismatch cases.');
}
const submitAt = appSource.indexOf("const persisted=await getLocalRecord(record.id)");
if (submitAt < 0 || appSource.indexOf('Incident, order screenshot and ', submitAt) < 0 ||
    appSource.indexOf('Reload the page to refresh the saved-record list.', submitAt) < 0) {
  throw new Error('Submission success and saved-record refresh failures are not reported separately.');
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
console.log('Web checks passed: application syntax, startup order, unique IDs, bilingual controls, OCR loading safeguards, draft recovery, duplicate detection and IndexedDB migration checks, Order ID parser cases and privacy policy.');
