/**
 * SERVIO — Cleanup Script
 * Deletes all documents from the "employees" collection
 * in the DEFAULT Firestore database (wrong upload target).
 *
 * Run ONCE, then discard this file.
 * Run: node cleanup_default_db.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Explicitly targeting the DEFAULT database for cleanup
const db = admin.firestore();

async function cleanup() {
  console.log('Connecting to DEFAULT database for cleanup...');

  const collectionRef = db.collection('employees');
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log('No documents found in employees collection. Nothing to delete.');
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} documents to delete...`);

  // Delete in batches of 400 (Firestore batch limit is 500, keeping margin)
  const batchSize = 400;
  const docs = snapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
    console.log(`  Deleted ${deleted} / ${docs.length}`);
  }

  console.log('');
  console.log('============================================================');
  console.log(`  Cleanup complete. ${deleted} documents deleted from DEFAULT database.`);
  console.log('  Now run: node upload_employees.js');
  console.log('============================================================');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
