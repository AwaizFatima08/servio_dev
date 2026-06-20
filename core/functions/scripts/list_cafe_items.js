const admin = require('firebase-admin');
const path = require('path');
admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(process.cwd(), 'keys/service-account.json')))
});
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

(async () => {
  const snap = await db.collection('menuItems')
    .where('tenantId', '==', 'ffl')
    .where('serviceCategories', 'array-contains', 'cafe')
    .get();
  console.log(`Found ${snap.size} cafe-tagged menuItems:\n`);
  snap.docs.forEach(d => {
    const m = d.data();
    console.log(`  ${d.id.padEnd(28)} ${(m.itemName || '?').padEnd(28)} active=${m.isActive} visible=${m.isVisible}`);
  });
  process.exit(0);
})();
