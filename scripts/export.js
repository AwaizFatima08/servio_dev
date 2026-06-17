const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const csv = require('fast-csv');

const DEV_KEY_PATH = '/mnt/storage/projects/servio_dev/core/functions/service-account.json';
const NAMED_INSTANCE = 'servio-dev';

const COLLECTION = process.argv[2];
if (!COLLECTION) {
  console.error('ERROR: Usage: node export_to_csv.js <collectionName>');
  process.exit(1);
}

const devKey = require(DEV_KEY_PATH);
const devApp = admin.initializeApp({ credential: admin.credential.cert(devKey) }, 'devApp');
const devDb = getFirestore(devApp, NAMED_INSTANCE);

async function run() {
  console.log(`Reading "${COLLECTION}" from database instance "${NAMED_INSTANCE}"...`);
  const snap = await devDb.collection(COLLECTION).get();
  
  if (snap.empty) {
    console.log('No documents found in this collection.');
    process.exit(0);
  }

  const rows = [];
  snap.forEach(doc => {
    const data = doc.data();
    
    // Flatten any complex objects or arrays into strings so they fit neatly in CSV columns
    const flatData = { id: doc.id }; // Preserve the Document ID in the first column
    for (const key in data) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        flatData[key] = JSON.stringify(data[key]);
      } else {
        flatData[key] = data[key];
      }
    }
    rows.push(flatData);
  });

  const outputFilename = `${COLLECTION}_export.csv`;
  const csvStream = csv.format({ headers: true });
  const writeStream = fs.createWriteStream(outputFilename);

  csvStream.pipe(writeStream);
  rows.forEach(row => csvStream.write(row));
  csvStream.end();

  writeStream.on('finish', () => {
    console.log(`============================================================`);
    console.log(` SUCCESS: Exported ${rows.length} documents to ${outputFilename}`);
    console.log(` Note: Keep the "id" column unchanged if you want to update existing docs.`);
    console.log(`============================================================`);
    process.exit(0);
  });
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });