// ─────────────────────────────────────────
// seedBbqSettings.js
// HomiLabs | Servio
// Run once: node scripts/seedBbqSettings.js
// (run from core/functions/, same as seedReservationSettings.js)
// ─────────────────────────────────────────
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();

const run = async () => {
  try {
    await db.collection('bbqSettings').doc('ffl').set({
      tenantId: 'ffl',
      preorderCutoffTime: '17:30',
      orderWindowStartTime: '19:30',
      orderWindowEndTime: '22:30',
      closeoutTime: '23:00',
      allowManagerOverride: true,
      requireOverrideReason: true,
      tableBookingCutoffTime: '17:30',
      createdAt: ts(),
      updatedAt: ts(),
    });

    console.log('✅ bbqSettings seeded for ffl');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

run();