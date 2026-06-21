// ─────────────────────────────────────────
// test_kitchen_today_scope.js — V1.2 Slice 2
// HomiLabs | Servio
//
// Verifies the "today only" design decision in cafeKitchenService.js:
// plants a FAKE cafeOrders document directly in Firestore with
// createdAt set to 2 days ago and orderStatus 'placed', then calls
// getKitchenOrders() and confirms the fake order does NOT appear.
//
// This matters because 'accepted' has no further transition in V1.2 —
// if today-scoping were broken or removed, old accepted/placed orders
// would silently accumulate in the kitchen view forever.
//
// The fake document is deleted at the end regardless of pass/fail —
// this script does not leave test junk behind.
//
// USAGE (from core/functions/):
//   node scripts/test_kitchen_today_scope.js
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

const cafeKitchenService = require(path.resolve(process.cwd(), 'src/cafe/cafeKitchenService'));

const TENANT_ID = 'ffl';
const FAKE_ORDER_ID = 'TEST_OLD_ORDER_today_scope_check';

async function run() {
  console.log('Planting a fake cafeOrders document dated 2 days ago...\n');

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const fakeOrder = {
    tenantId: TENANT_ID,
    employeeNumber: 'FFL00257',
    employeeName: 'Test Old Order',
    orderType: 'cafe_hours',
    menuItemId: 'CAFE_TEST_TEA',
    itemName: 'Doodh Patti Tea',
    quantity: 1,
    diningMode: 'dine_in',
    requestedPickupTime: null,
    consumerType: 'self',
    consumerFamilyMemberId: null,
    consumerName: 'Test Old Order',
    orderStatus: 'placed',
    acceptedAt: null,
    acceptedByUid: null,
    cancellationWindowExpiresAt: null,
    cancelledAt: null,
    cancelledByUid: null,
    cancelledByRole: null,
    cancellationReason: null,
    cancellationNote: null,
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
    isVisible: true,
    remarks: 'TEST FIXTURE — created by test_kitchen_today_scope.js, safe to delete',
  };

  await db.collection('cafeOrders').doc(FAKE_ORDER_ID).set(fakeOrder);
  console.log(`Planted fake order: ${FAKE_ORDER_ID} (createdAt = ${twoDaysAgo.toISOString()})\n`);

  let testPassed = false;

  try {
    console.log('Calling getKitchenOrders()...\n');
    const result = await cafeKitchenService.getKitchenOrders({ tenantId: TENANT_ID });

    const foundFakeOrder = result.orders.some((o) => o.orderId === FAKE_ORDER_ID);

    console.log(`Kitchen list returned ${result.orders.length} order(s) for today (${result.date}).`);
    console.log(`Fake old order present in list: ${foundFakeOrder}`);
    console.log(`Expected: false\n`);

    if (!foundFakeOrder) {
      console.log('PASS — old order correctly excluded from today-only kitchen view.');
      testPassed = true;
    } else {
      console.log('FAIL — old order leaked into kitchen view. Today-scoping is broken.');
    }
  } catch (err) {
    console.error('Test errored:', err);
  } finally {
    console.log('\nCleaning up fake order...');
    await db.collection('cafeOrders').doc(FAKE_ORDER_ID).delete();
    console.log('Fake order deleted.');
  }

  process.exit(testPassed ? 0 : 1);
}

run();
