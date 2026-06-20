// ─────────────────────────────────────────
// list_family_members.js — generic family lookup
// HomiLabs | Servio
//
// USAGE (from core/functions/):
//   node scripts/list_family_members.js FFL00257
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(
    require(path.resolve(process.cwd(), 'keys/service-account.json'))
  ),
});

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

(async () => {
  const empNum = process.argv[2];
  if (!empNum) {
    console.error('USAGE: node scripts/list_family_members.js <officialEmployeeNumber>');
    process.exit(2);
  }

  const snap = await db
    .collection('familyMembers')
    .where('tenantId', '==', 'ffl')
    .where('officialEmployeeNumber', '==', empNum)
    .get();

  console.log(`Found ${snap.size} family member(s) for ${empNum}:\n`);
  snap.docs.forEach((d) => {
    const m = d.data();
    console.log(`  id=${d.id}`);
    console.log(`    name=${m.fullName}  relation=${m.relation}  active=${m.isActive}  deletionRequested=${m.deletionRequested === true}\n`);
  });

  process.exit(0);
})();