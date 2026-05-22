// ─────────────────────────────────────────
// seedCatalogue.js — Seed foodTypes and mealTypes
// HomiLabs | Servio
// Run once before launch: node scripts/seedCatalogue.js
// ─────────────────────────────────────────
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');
const ts = () => FieldValue.serverTimestamp();

// ── Food Types ───────────────────────────
const foodTypes = [
  { foodTypeCode: 'VEG',      displayName: 'Vegetarian',       sortOrder: 1 },
  { foodTypeCode: 'NVEG',     displayName: 'Non-Vegetarian',   sortOrder: 2 },
  { foodTypeCode: 'BBQ',      displayName: 'BBQ Items',        sortOrder: 3 },
  { foodTypeCode: 'BREAD',    displayName: 'Breads',           sortOrder: 4 },
  { foodTypeCode: 'BAKED',    displayName: 'Baked Items',      sortOrder: 5 },
  { foodTypeCode: 'DAIRY',    displayName: 'Dairy',            sortOrder: 6 },
  { foodTypeCode: 'BEV_HOT',  displayName: 'Hot Beverages',    sortOrder: 7 },
  { foodTypeCode: 'BEV_COLD', displayName: 'Cold Beverages',   sortOrder: 8 },
  { foodTypeCode: 'DESS',     displayName: 'Desserts',         sortOrder: 9 },
  { foodTypeCode: 'SNACK',    displayName: 'Snacks',           sortOrder: 10 },
  { foodTypeCode: 'COND',     displayName: 'Condiments',       sortOrder: 11 },
];

// ── Meal Types ───────────────────────────
const mealTypes = [
  {
    mealTypeCode:        'breakfast',
    displayName:         'Breakfast',
    serviceWindowStart:  '06:00',
    serviceWindowEnd:    '09:00',
    bookingCutoffTime:   '03:00',
    sortOrder:           1,
    isBookable:          true,
    supportsFeedback:    true,
    supportsRate:        true,
    supportsIssueFlow:   true,
    allowRealTimeBooking:false,
  },
  {
    mealTypeCode:        'lunch',
    displayName:         'Lunch',
    serviceWindowStart:  '13:00',
    serviceWindowEnd:    '15:00',
    bookingCutoffTime:   '10:00',
    sortOrder:           2,
    isBookable:          true,
    supportsFeedback:    true,
    supportsRate:        true,
    supportsIssueFlow:   true,
    allowRealTimeBooking:false,
  },
  {
    mealTypeCode:        'dinner',
    displayName:         'Dinner',
    serviceWindowStart:  '19:00',
    serviceWindowEnd:    '22:00',
    bookingCutoffTime:   '16:00',
    sortOrder:           3,
    isBookable:          true,
    supportsFeedback:    true,
    supportsRate:        true,
    supportsIssueFlow:   true,
    allowRealTimeBooking:false,
  },
  {
    mealTypeCode:        'cafe',
    displayName:         'Café',
    serviceWindowStart:  '18:00',
    serviceWindowEnd:    '23:00',
    bookingCutoffTime:   null,
    sortOrder:           4,
    isBookable:          true,
    supportsFeedback:    true,
    supportsRate:        true,
    supportsIssueFlow:   false,
    allowRealTimeBooking:true,
  },
  {
    mealTypeCode:        'bbq',
    displayName:         'BBQ',
    serviceWindowStart:  '19:00',
    serviceWindowEnd:    '22:00',
    bookingCutoffTime:   null,
    sortOrder:           5,
    isBookable:          true,
    supportsFeedback:    true,
    supportsRate:        true,
    supportsIssueFlow:   false,
    allowRealTimeBooking:true,
  },
  {
    mealTypeCode:        'tuckshop',
    displayName:         'Tuck Shop',
    serviceWindowStart:  '17:00',
    serviceWindowEnd:    '23:00',
    bookingCutoffTime:   null,
    sortOrder:           6,
    isBookable:          false,
    supportsFeedback:    false,
    supportsRate:        true,
    supportsIssueFlow:   false,
    allowRealTimeBooking:true,
  },
  {
    mealTypeCode:        'bakery',
    displayName:         'Bakery',
    serviceWindowStart:  '17:00',
    serviceWindowEnd:    '22:00',
    bookingCutoffTime:   null,
    sortOrder:           7,
    isBookable:          true,
    supportsFeedback:    false,
    supportsRate:        true,
    supportsIssueFlow:   false,
    allowRealTimeBooking:true,
  },
  {
    mealTypeCode:        'teabar',
    displayName:         'Tea Bar',
    serviceWindowStart:  '00:00',
    serviceWindowEnd:    '23:59',
    bookingCutoffTime:   null,
    sortOrder:           8,
    isBookable:          false,
    supportsFeedback:    false,
    supportsRate:        true,
    supportsIssueFlow:   false,
    allowRealTimeBooking:true,
  },
];

// ── Seed Functions ────────────────────────
const seedFoodTypes = async () => {
  console.log('Seeding foodTypes...');
  const batch = db.batch();

  for (const ft of foodTypes) {
    const ref = db.collection('foodTypes').doc(ft.foodTypeCode);
    batch.set(ref, {
      ...ft,
      isActive: true,
      isVisible: true,
      createdAt: ts(),
      updatedAt: ts(),
    });
  }

  await batch.commit();
  console.log(`✔ ${foodTypes.length} foodTypes seeded`);
};

const seedMealTypes = async () => {
  console.log('Seeding mealTypes...');
  const batch = db.batch();

  for (const mt of mealTypes) {
    const ref = db.collection('mealTypes').doc(mt.mealTypeCode);
    batch.set(ref, {
      ...mt,
      isActive: true,
      createdAt: ts(),
      updatedAt: ts(),
    });
  }

  await batch.commit();
  console.log(`✔ ${mealTypes.length} mealTypes seeded`);
};

// ── Run ───────────────────────────────────
const run = async () => {
  try {
    await seedFoodTypes();
    await seedMealTypes();
    console.log('\n✅ Catalogue seed complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

run();