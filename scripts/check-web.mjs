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
if (!appSource.includes('MAX_BYTES=25*1024*1024') || !appSource.includes('MAX_DRAFT_BYTES=8*1024*1024') || !appSource.includes('function isImageFile(file){') || !appSource.includes('canvas.toBlob') || !appSource.includes("$('incidentForm').setAttribute('novalidate','')")) {
  throw new Error('Mobile evidence submission must accept larger camera images, normalize image MIME types, optimize image payloads, and route validation through the form handler.');
}

if (!appSource.includes('Could not check saved reports on this device:')) {
  throw new Error('Saved-record lookup failures must be shown instead of silently blocking submission.');
}

if (!html.includes('pattern="[Oo][Dd][0-9]{18}"') ||
    !appSource.includes('function getLocalRecord(id){') ||
    !appSource.includes('function recordHasCompleteEvidence(saved,expectedShot,expectedExtras){') ||
    !appSource.includes('const persisted=await getLocalRecord(record.id)') ||
    !appSource.includes('reader.onabort=()=>reject(new Error(\'Reading \'+file.name+\' was interrupted.\'))') ||
    !appSource.includes('tx.onabort=()=>reject(tx.error||new Error(\'The incident save was interrupted.\'))')) {
  throw new Error('Evidence submission must accept lowercase Order IDs, handle interrupted file reads/writes, and verify the saved files.');
}
const evidenceStart = appSource.indexOf('function recordHasCompleteEvidence(saved,expectedShot,expectedExtras){');
const evidenceEnd = appSource.indexOf('async function deleteLocalRecord', evidenceStart);
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

const imageHelperStart = appSource.indexOf('function isImageFile(file){');
const imageHelperEnd = appSource.indexOf('async function readFile(file){', imageHelperStart);
if (imageHelperStart < 0 || imageHelperEnd <= imageHelperStart) throw new Error('Mobile image file detector could not be located.');
const imageHelper = appSource.slice(imageHelperStart, imageHelperEnd);
const isImageFile = new Function(imageHelper + '; return isImageFile;')();
if (!isImageFile({name:'camera-photo.jpg',type:''}) ||
    !isImageFile({name:'evidence.PNG',type:'application/octet-stream'}) ||
    !isImageFile({name:'photo.webp',type:'image/webp'}) ||
    isImageFile({name:'document.pdf',type:'application/pdf'})) {
  throw new Error('Mobile camera images with missing or generic MIME types must be accepted by their filename extension.');
}
if (!imageHelper.includes('/\\\\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i')) {
  throw new Error('Image filename extension detection must use a literal-dot regular expression.');
}

const pdfStart = appSource.indexOf('function pdfAscii(value){');
const pdfEnd = appSource.indexOf('async function sharePdf(rows){', pdfStart);
if (pdfStart < 0 || pdfEnd <= pdfStart) throw new Error('Offline PDF generator could not be located.');
const pdfSource = appSource.slice(pdfStart, pdfEnd);
if (pdfSource.includes('loadPdfLibrary') || !pdfSource.includes('xref\\\\n') || !pdfSource.includes('%%EOF')) {
  throw new Error('PDF generation must not depend on a remote library and must write a complete PDF structure.');
}
const createEvidencePdfBlob = new Function('imageAsJpeg', pdfSource + '; return createEvidencePdfBlob;')(
  async () => ({dataUrl:'data:image/jpeg;base64,/9j/2Q==',width:2,height:2})
);
const sampleRecord = {
  category:'Test incident',orderId:'OD123456789012345678',store:'Test hub',
  incidentAt:'2026-11-20T10:00:00.000Z',notes:'Test report',
  orderScreenshot:{data:'data:image/jpeg;base64,AA=='},
  supportingEvidence:[{data:'data:image/jpeg;base64,AA=='},{data:'data:image/jpeg;base64,AA=='}]
};
const generatedPdf = await createEvidencePdfBlob([sampleRecord]);
const generatedPdfText = new TextDecoder('latin1').decode(await generatedPdf.arrayBuffer());
if (generatedPdf.type !== 'application/pdf' || generatedPdf.size < 500 ||
    !generatedPdfText.startsWith('%PDF-1.4') || !generatedPdfText.includes('%%EOF') ||
    !generatedPdfText.includes('/Count 1') ||
    (generatedPdfText.split('/Subtype /Image').length-1) !== 3) {
  throw new Error('PDF generator failed to create a valid report containing the order screenshot and both evidence photos.');
}

console.log('Web checks passed: application syntax, startup order, unique IDs, bilingual controls, OCR loading safeguards, draft recovery, duplicate detection and IndexedDB migration checks, Order ID parser cases and privacy policy.');
