/**
 * ============================================================
 * SERVIO — Export Firestore Collection -> CSV  (DEV)
 * HomiLabs
 * ============================================================
 *
 * READ-ONLY. Reads one collection from the DEV servio-dev database
 * and writes every document to a CSV file. Does not modify the database.
 *
 * The document ID is written as the first column "__docId".
 * Nested fields (maps/arrays) are written as JSON text in their cell
 * so nothing is lost — but such collections are better handled as JSON.
 *
 * USAGE:
 *   node export_to_csv.js <collectionName> [outputFile.csv]
 * EXAMPLES:
 *   node export_to_csv.js employees
 *   node export_to_csv.js menuItems menu_items_backup.csv
 *
 * Run from inside core/functions (so firebase-admin resolves).
 * ============================================================
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const KEY_PATH = '/mnt/storage/projects/servio_dev/core/functions/service-account.json';
const NAMED_INSTANCE = 'servio-dev';

const COLLECTION = process.argv[2];
const OUTFILE = process.argv[3] || (COLLECTION + '_export.csv');

if (!COLLECTION) {
  console.error('ERROR: Usage: node export_to_csv.js <collectionName> [outputFile.csv]');
  process.exit(1);
}

const key = require(KEY_PATH);
const app = admin.initializeApp({ credential: admin.credential.cert(key) }, 'exportApp');
const db = getFirestore(app, NAMED_INSTANCE);

// Turn one value into a CSV-safe cell.
function toCell(value) {
  if (value === null || value === undefined) return '';
  let str;
  if (typeof value === 'object') {
    // Firestore Timestamp -> ISO string; other objects/arrays -> JSON text
    if (typeof value.toDate === 'function') {
      str = value.toDate().toISOString();
    } else {
      str = JSON.stringify(value);
    }
  } else {
    str = String(value);
  }
  // Escape for CSV: wrap in quotes if it contains comma, quote, or newline.
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function run() {
  console.log('Exporting "' + COLLECTION + '" from DEV (servio-dev)...');
  const snap = await db.collection(COLLECTION).get();
  console.log('  Found ' + snap.size + ' documents.');

  if (snap.size === 0) {
    console.log('Nothing to export. Exiting (no file written).');
    process.exit(0);
  }

  // Collect the full set of field names across all documents (union),
  // so no field is missed even if some docs lack certain fields.
  const fieldSet = new Set();
  snap.docs.forEach(d => Object.keys(d.data()).forEach(k => fieldSet.add(k)));
  const fields = Array.from(fieldSet).sort();

  // Header: __docId first, then all fields.
  const header = ['__docId', ...fields];
  const lines = [header.map(toCell).join(',')];

  // One line per document.
  snap.docs.forEach(d => {
    const data = d.data();
    const row = [d.id, ...fields.map(f => toCell(data[f]))];
    lines.push(row.join(','));
  });

  fs.writeFileSync(OUTFILE, lines.join('\n'), 'utf8');
  console.log('============================================================');
  console.log('  EXPORT COMPLETE');
  console.log('  Collection : ' + COLLECTION);
  console.log('  Documents  : ' + snap.size);
  console.log('  Columns    : ' + header.length + ' (incl. __docId)');
  console.log('  File       : ' + OUTFILE);
  console.log('============================================================');
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
