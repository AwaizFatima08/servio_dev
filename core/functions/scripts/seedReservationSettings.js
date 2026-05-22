// ─────────────────────────────────────────
// seedReservationSettings.js
// HomiLabs | Servio
// Run once: node scripts/seedReservationSettings.js
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
    await db.collection('reservationSettings').doc('ffl').set({
      tenantId: 'ffl',
      bookingWindowOpensOn: 'saturday',
      bookingWeekStartDay: 'monday',
      bookingWindowDays: 7,
      cutoffHoursBeforeMeal: 3,
      weeklyOptinResidenceTypes: ['boq', 'guest_house'],
      flexibleResidenceTypes: ['moq', 'a', 'b', 'b_modified', 'c', 'd_plus', 'd', 'e', 'e_modified'],
      allowWalkIn: true,
      allowGuestBooking: true,
      allowProxyBooking: true,
      allowSupervisorCancellation: true,
      requireSupervisorCancelReason: true,
      allowManagerOverride: true,
      allowSupervisorOverride: true,
      requireOverrideReason: true,
      maxGuestQuantityPerBooking: 5,
      allowOfficialMeals: true,
      officialMealMaxHeadcount: 20,
      allowSpecialMeals: true,
      specialMealStaffPunchedOnly: true,
      createdAt: ts(),
      updatedAt: ts(),
    });

    console.log('✅ reservationSettings seeded for ffl');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

run();