/**
 * ============================================================
 * SERVIO — Import CSV -> Firestore Collection  (DEV)
 * HomiLabs
 * ============================================================
 *
 * WRITES TO THE DATABASE. Reads a CSV and writes each row as a
 * document into the given collection in the DEV servio-dev database.
 *
 * SAFETY:
 *  - The CSV MUST have a "__docId" column — that value becomes the
 *    document ID. Without it the script refuses to run (so it can
 *    never create random-ID duplicates of your data).
 *  - DEFAULT MODE is "merge": only the columns present in the CSV are
 *    updated; other existing fields on the document are left untouched.
 *  - Pass "overwrite" as the 3rd argument to REPLACE whole documents
 *    (dangerous — fields not in the CSV are removed).
 *  - Cells that look like JSON ({...} or [...]) are parsed back into
 *    maps/arrays. created/updatedAt ISO strings are converted back to
 *    Firestore Timestamps. Leading-zero values (e.g. "0008", phone
 *    numbers) are kept as strings so they are NOT corrupted.
 *  - Previews the first 3 rows and PAUSES for "yes" before writing.
 *
 * USAGE:
 *   node import_from_csv.js <collectionName> <inputFile.csv> [merge|overwrite]
 * EXAMPLES:
 *   node import_from_csv.js menuItems menu_items_edited.csv
 *   node import_from_csv.js menuItems menu_items_edited.csv overwrite
 *
 * Run from inside core/functions (so firebase-admin resolves).
 * ============================================================
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const readline = require('readline');

const KEY_PATH = '/mnt/storage/projects/servio_dev/core/functions/service-account.json';
const NAMED_INSTANCE = 'servio-dev';

const COLLECTION = process.argv[2];
const INFILE = process.argv[3];
const MODE = (process.argv[4] || 'merge').toLowerCase();

if (!COLLECTION || !INFILE) {
  console.error('ERROR: Usage: node import_from_csv.js <collectionName> <inputFile.csv> [merge|overwrite]');
  process.exit(1);
}
if (MODE !== 'merge' && MODE !== 'overwrite') {
  console.error('ERROR: mode must be "merge" or "overwrite" (default merge).');
  process.exit(1);
}
if (!fs.existsSync(INFILE)) {
  console.error('ERROR: file not found: ' + INFILE);
  process.exit(1);
}

const key = require(KEY_PATH);
const app = admin.initializeApp({ credential: admin.credential.cert(key) }, 'importApp');
const db = getFirestore(app, NAMED_INSTANCE);

// --- Minimal, correct CSV parser (handles quotes, commas, newlines in quotes) ---
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cell += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') { /* ignore */ }
      else { cell += c; }
    }
  }
  // last cell/row if file doesn't end in newline
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// Turn a CSV cell string back into a typed value.
function fromCell(str, fieldName) {
  if (str === '') return null;
  // JSON object or array
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try { return JSON.parse(str); } catch (e) { /* fall through, keep as string */ }
  }
  // booleans
  if (str === 'true') return true;
  if (str === 'false') return false;
  // numbers (but NOT things like "0008" where leading zero is meaningful, e.g. cnicLast4)
  if (/^-?\d+$/.test(str) && !(str.length > 1 && str.startsWith('0'))) {
    return parseInt(str, 10);
  }
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  // timestamps: convert created/updatedAt ISO strings back to Firestore Timestamps
  if ((fieldName === 'createdAt' || fieldName === 'updatedAt') && /^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return admin.firestore.Timestamp.fromDate(new Date(str));
  }
  return str; // default: keep as string (preserves "03001234567", "0008", dates)
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}

async function run() {
  console.log('Reading CSV: ' + INFILE);
  const text = fs.readFileSync(INFILE, 'utf8');
  const rows = parseCSV(text);
  if (rows.length < 2) { console.error('ERROR: CSV has no data rows.'); process.exit(1); }

  const header = rows[0];
  const docIdCol = header.indexOf('__docId');
  if (docIdCol === -1) {
    console.error('ERROR: CSV must have a "__docId" column (the document ID). Aborting.');
    console.error('       Export with export_to_csv.js to get the correct format.');
    process.exit(1);
  }

  // Build the list of {id, data} to write.
  const docs = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0] === '') continue; // skip blank line
    const id = cells[docIdCol];
    if (!id) { console.error('ERROR: row ' + (r + 1) + ' has empty __docId. Aborting.'); process.exit(1); }
    const data = {};
    header.forEach((field, idx) => {
      if (field === '__docId') return;
      data[field] = fromCell(cells[idx] !== undefined ? cells[idx] : '', field);
    });
    docs.push({ id, data });
  }

  console.log('============================================================');
  console.log('  IMPORT — DEV (servio-dev)');
  console.log('  Collection : ' + COLLECTION);
  console.log('  Mode       : ' + MODE.toUpperCase() + (MODE === 'merge'
    ? '  (only CSV columns updated; other fields kept)'
    : '  (WHOLE documents replaced; missing fields removed)'));
  console.log('  Rows to write : ' + docs.length);
  console.log('============================================================');
  console.log('Preview of first 3 documents:');
  docs.slice(0, 3).forEach(d => {
    console.log('  id=' + d.id + '  ' + JSON.stringify(d.data).slice(0, 200));
  });
  console.log('');

  const ans = await ask('Type "yes" to write these ' + docs.length + ' docs to DEV: ');
  if (ans.trim().toLowerCase() !== 'yes') { console.log('Cancelled. No changes made.'); process.exit(0); }

  console.log('Writing...');
  let written = 0, inBatch = 0;
  let batch = db.batch();
  for (const d of docs) {
    const ref = db.collection(COLLECTION).doc(d.id);
    if (MODE === 'merge') batch.set(ref, d.data, { merge: true });
    else batch.set(ref, d.data);
    inBatch++; written++;
    if (inBatch === 450) { await batch.commit(); batch = db.batch(); inBatch = 0; console.log('  ...' + written + ' written'); }
  }
  if (inBatch > 0) await batch.commit();

  console.log('============================================================');
  console.log('  IMPORT COMPLETE. Wrote ' + written + ' documents to "' + COLLECTION + '".');
  console.log('============================================================');
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
