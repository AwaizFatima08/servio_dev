const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const csv = require('fast-csv');
const readline = require('readline');

const DEV_KEY_PATH = '/mnt/storage/projects/servio_dev/core/functions/service-account.json';
const NAMED_INSTANCE = 'servio-dev';

const COLLECTION = process.argv[2];
const CSV_FILE = process.argv[3];

if (!COLLECTION || !CSV_FILE) {
  console.error('ERROR: Usage: node import_from_csv.js <collectionName> <path_to_csv_file>');
  process.exit(1);
}

const devKey = require(DEV_KEY_PATH);
const devApp = admin.initializeApp({ credential: admin.credential.cert(devKey) }, 'devApp');
const devDb = getFirestore(devApp, NAMED_INSTANCE);

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}

async function run() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`ERROR: File not found at path: ${CSV_FILE}`);
    process.exit(1);
  }

  const rows = [];
  
  // Parse the CSV file into memory
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv.parse({ headers: true }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve())
      .on('error', err => reject(err));
  });

  console.log(`============================================================`);
  console.log(` Ready to Import to Instance: ${NAMED_INSTANCE}`);
  console.log(` Target Collection         : ${COLLECTION}`);
  console.log(` Total rows found in CSV   : ${rows.length}`);
  console.log(`============================================================`);

  const ans = await ask('Type "yes" to upload data and overwrite matching IDs: ');
  if (ans.trim().toLowerCase() !== 'yes') {
    console.log('Cancelled. No modifications made.');
    process.exit(0);
  }

  console.log('Importing records...');
  let written = 0, inBatch = 0;
  let batch = devDb.batch();

  for (const row of rows) {
    const docId = row.id ? row.id.trim() : '';
    
    // Extract data fields, omitting the system "id" column
    const firestoreData = {};
    for (const key in row) {
      if (key === 'id') continue;
      
      let val = row[key];
      
      // Try to convert string fields back into true numbers, booleans, or parsed objects
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val !== '' && !isNaN(val)) val = Number(val);
      else {
        // If it looks like a stringified JSON object or array, parse it back
        try {
          if ((val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
            val = JSON.parse(val);
          }
        } catch (e) {
          // Leave it as a standard text string if parsing fails
        }
      }
      firestoreData[key] = val;
    }

    // Assign reference to an existing ID or generate a fresh ID if blank
    let docRef;
    if (docId) {
      docRef = devDb.collection(COLLECTION).doc(docId);
    } else {
      docRef = devDb.collection(COLLECTION).doc(); // Auto-generated ID
    }

    // Set data (merges or completely overwrites depending on requirement. Use .set(docRef, firestoreData, { merge: true }) if you don't want to clear unmentioned properties)
    batch.set(docRef, firestoreData);
    inBatch++;
    written++;

    if (inBatch === 450) {
      await batch.commit();
      batch = devDb.batch();
      inBatch = 0;
      console.log(`  ... ${written} rows imported`);
    }
  }

  if (inBatch > 0) {
    await batch.commit();
  }

  console.log(`============================================================`);
  console.log(` DONE. Successfully applied ${written} updates/inserts to Firestore.`);
  console.log(`============================================================`);
  process.exit(0);
}

run().catch(e => { console.error('Fatal Import Error:', e); process.exit(1); });