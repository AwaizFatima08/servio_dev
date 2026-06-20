// ─────────────────────────────────────────
// test_member_has_transactions.js — V1.2 Slice 1
// HomiLabs | Servio
//
// Direct unit-ish test of the _memberHasTransactions stub fix.
// The stub itself is reachable only from approveDeletion (parked endpoint),
// so we test it via a temporary export from familyService.
//
// PRE-REQ: familyService.js must export _memberHasTransactions
// (see surgical edit instructions in the same delivery).
//
// USAGE (from core/functions/):
//   node scripts/test_member_has_transactions.js <FAMILY_MEMBER_ID_FFL00005>
//
// The argument is a family member ID owned by FFL00005. The script
// expects this member to have at least one cafe order tagged against
// them (e.g. from test_cafe_slice1.sh test 8) — that order causes
// _memberHasTransactions to return true.
//
// The script then tests with a deliberately fake ID to confirm false.
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'keys/service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const familyService = require(path.resolve(process.cwd(), 'src/family/familyService'));

const TENANT_ID = 'ffl';

async function run() {
  const realMemberId = process.argv[2];

  if (!realMemberId) {
    console.error('USAGE: node scripts/test_member_has_transactions.js <familyMemberId>');
    process.exit(2);
  }

  if (typeof familyService._memberHasTransactions !== 'function') {
    console.error('FATAL: familyService does not export _memberHasTransactions.');
    console.error('Apply the surgical export edit before running this test.');
    process.exit(2);
  }

  console.log('Testing _memberHasTransactions...\n');

  // Test A: real member with a cafe order tagged against them → should be true
  const realResult = await familyService._memberHasTransactions(TENANT_ID, realMemberId);
  const A_pass = realResult === true;
  console.log(`A. Real member (id=${realMemberId})`);
  console.log(`   returned: ${realResult}   expected: true   ${A_pass ? 'PASS' : 'FAIL'}\n`);

  // Test B: a clearly fake ID → should be false
  const fakeId = 'fm_NEVER_EXISTS_xyz_999';
  const fakeResult = await familyService._memberHasTransactions(TENANT_ID, fakeId);
  const B_pass = fakeResult === false;
  console.log(`B. Fake member (id=${fakeId})`);
  console.log(`   returned: ${fakeResult}   expected: false   ${B_pass ? 'PASS' : 'FAIL'}\n`);

  if (A_pass && B_pass) {
    console.log('Both checks passed. Stub fix verified.');
    process.exit(0);
  } else {
    console.log('One or more checks failed. Review familyService._memberHasTransactions.');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test errored:', err);
  process.exit(1);
});
