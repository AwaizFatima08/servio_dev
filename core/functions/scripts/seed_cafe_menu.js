// ─────────────────────────────────────────
// seed_cafe_menu.js — V1.2 Slice 1 one-time dev seed
// HomiLabs | Servio
//
// Run ONCE on the NAS to seed 4 cafe test fixtures into dev.
// After this completes, serviceMenuConfigs/cafe will exist with 4 items
// and Backend Slice 1 endpoints can be tested end-to-end.
//
// USAGE (from the NAS):
//   cd /mnt/storage/projects/servio_dev/core/functions
//   node /tmp/seed_cafe_menu.js
//
// PRE-REQ: keys/service-account.json must exist in core/functions.
//
// IDEMPOTENT: re-running this script overwrites the same 4 menuItems
// (by deterministic itemId) and rebuilds the fat doc. Safe to re-run.
// Wipe before V1.2 reaches prod.
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const path = require('path');

// ── Resolve paths relative to script execution ────────────────────────
// Assumes you run this from inside core/functions/ (cwd).
const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'keys/service-account.json');
const RESOLVER_PATH        = path.resolve(process.cwd(), 'src/cafe/cafeMenuResolver');
const CONSTANTS_PATH       = path.resolve(process.cwd(), 'src/constants');

// ── Initialize Admin SDK ──────────────────────────────────────────────
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

const { COLLECTIONS } = require(CONSTANTS_PATH);
const cafeMenuResolver = require(RESOLVER_PATH);

// ── Test fixtures (4 items) ───────────────────────────────────────────
//
// itemId is deterministic so re-running overwrites instead of duplicating.
// foodTypeCode values must match docs in foodTypes collection.
//   BEV_HOT, BEV_COLD — beverages (handled as items[] in Slice 1; see resolver)
//   SNACK             — hot food
//
const TENANT_ID = 'ffl';
const NOW = new Date();

const FIXTURES = [
  {
    itemId:        'CAFE_TEST_TEA',
    itemName:      'Doodh Patti Tea',
    itemType:      'individual',
    serviceCategories: ['cafe'],
    foodTypeCode:  'BEV_HOT',
    baseUnit:      'cup',
    constituentItemIds:   null,
    constituentItemNames: null,
    baseRate:      null,             // FFL is retrospective
    rateType:      'retrospective',
    effectiveFrom: null,
    effectiveTo:   null,
    supportsFeedback: true,
    supportsRate:  true,
    isActive:      true,
    isVisible:     true,
    sortOrder:     10,
    tenantId:      TENANT_ID,
    createdAt:     NOW,
    updatedAt:     NOW,
  },
  {
    itemId:        'CAFE_TEST_COFFEE',
    itemName:      'Cappuccino',
    itemType:      'individual',
    serviceCategories: ['cafe'],
    foodTypeCode:  'BEV_HOT',
    baseUnit:      'cup',
    constituentItemIds:   null,
    constituentItemNames: null,
    baseRate:      null,
    rateType:      'retrospective',
    effectiveFrom: null,
    effectiveTo:   null,
    supportsFeedback: true,
    supportsRate:  true,
    isActive:      true,
    isVisible:     true,
    sortOrder:     20,
    tenantId:      TENANT_ID,
    createdAt:     NOW,
    updatedAt:     NOW,
  },
  {
    itemId:        'CAFE_TEST_SANDWICH',
    itemName:      'Club Sandwich',
    itemType:      'individual',
    serviceCategories: ['cafe'],
    foodTypeCode:  'SNACK',
    baseUnit:      'portion',
    constituentItemIds:   null,
    constituentItemNames: null,
    baseRate:      null,
    rateType:      'retrospective',
    effectiveFrom: null,
    effectiveTo:   null,
    supportsFeedback: true,
    supportsRate:  true,
    isActive:      true,
    isVisible:     true,
    sortOrder:     30,
    tenantId:      TENANT_ID,
    createdAt:     NOW,
    updatedAt:     NOW,
  },
  {
    itemId:        'CAFE_TEST_FRIES',
    itemName:      'French Fries',
    itemType:      'individual',
    serviceCategories: ['cafe'],
    foodTypeCode:  'SNACK',
    baseUnit:      'portion',
    constituentItemIds:   null,
    constituentItemNames: null,
    baseRate:      null,
    rateType:      'retrospective',
    effectiveFrom: null,
    effectiveTo:   null,
    supportsFeedback: true,
    supportsRate:  true,
    isActive:      true,
    isVisible:     true,
    sortOrder:     40,
    tenantId:      TENANT_ID,
    createdAt:     NOW,
    updatedAt:     NOW,
  },
];

async function run() {
  console.log(`\n[seed] Cafe test fixtures — tenant: ${TENANT_ID}`);
  console.log(`[seed] Writing ${FIXTURES.length} menuItems...`);

  for (const fx of FIXTURES) {
    await db.collection(COLLECTIONS.MENU_ITEMS).doc(fx.itemId).set(fx);
    console.log(`  ✓ ${fx.itemId.padEnd(22)} ${fx.itemName}`);
  }

  console.log(`\n[seed] Triggering cafe menu resolver...`);
  const result = await cafeMenuResolver.rebuildCafeMenu({
    tenantId: TENANT_ID,
    triggeredByUid: 'seed_script',
  });
  console.log(`[seed] Resolver wrote serviceMenuConfigs/cafe`);
  console.log(`[seed]   items:     ${result.itemCount}`);
  console.log(`[seed]   beverages: ${result.beverageCount} (Slice 1 always 0)`);

  console.log(`\n[seed] DONE. Cafe is now testable on dev.\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error('\n[seed] FAILED:', err);
  process.exit(1);
});
