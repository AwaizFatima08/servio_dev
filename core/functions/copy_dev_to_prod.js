const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const readline = require('readline');

const DEV_KEY_PATH  = '/mnt/storage/projects/servio_dev/core/functions/service-account.json';
const PROD_KEY_PATH = '/mnt/storage/projects/servio_dev/keys/service-account-prod.json';
const NAMED_INSTANCE = 'servio-dev';

const COLLECTION = process.argv[2];
if (!COLLECTION) {
  console.error('ERROR: Usage: node copy_dev_to_prod.js <collectionName>');
  process.exit(1);
}

const devKey  = require(DEV_KEY_PATH);
const prodKey = require(PROD_KEY_PATH);

const devApp  = admin.initializeApp({ credential: admin.credential.cert(devKey) },  'devApp');
const prodApp = admin.initializeApp({ credential: admin.credential.cert(prodKey) }, 'prodApp');

const devDb  = getFirestore(devApp,  NAMED_INSTANCE);
const prodDb = getFirestore(prodApp, NAMED_INSTANCE);

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}

async function run() {
  console.log('============================================================');
  console.log('  Dev -> Prod Copy');
  console.log('  Collection : ' + COLLECTION);
  console.log('  READ  from : servio-dev-55d2d (DEV)  / instance ' + NAMED_INSTANCE);
  console.log('  WRITE to   : servio-prod-3a6de (PROD) / instance ' + NAMED_INSTANCE);
  console.log('============================================================');

  console.log('Reading "' + COLLECTION + '" from DEV...');
  const devSnap = await devDb.collection(COLLECTION).get();
  console.log('  Found ' + devSnap.size + ' documents in DEV.');

  const prodBefore = await prodDb.collection(COLLECTION).get();
  console.log('  PROD currently has ' + prodBefore.size + ' documents.');

  if (devSnap.size === 0) { console.log('Nothing to copy. Exiting.'); process.exit(0); }

  console.log('');
  console.log('About to WRITE ' + devSnap.size + ' docs into PROD "' + COLLECTION + '", preserving IDs.');
  console.log('Same-ID docs are overwritten; other prod docs untouched.');
  const ans = await ask('Type "yes" to proceed: ');
  if (ans.trim().toLowerCase() !== 'yes') { console.log('Cancelled. No changes made.'); process.exit(0); }

  console.log('Writing to PROD...');
  let written = 0, inBatch = 0;
  let batch = prodDb.batch();
  for (const d of devSnap.docs) {
    batch.set(prodDb.collection(COLLECTION).doc(d.id), d.data());
    inBatch++; written++;
    if (inBatch === 450) { await batch.commit(); batch = prodDb.batch(); inBatch = 0; console.log('  ...' + written + ' written'); }
  }
  if (inBatch > 0) await batch.commit();

  const prodAfter = await prodDb.collection(COLLECTION).get();
  console.log('============================================================');
  console.log('  DONE. Read ' + devSnap.size + ' / Wrote ' + written + ' / PROD now has ' + prodAfter.size);
  console.log('============================================================');
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
