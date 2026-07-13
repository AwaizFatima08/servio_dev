// core/functions/scripts/test_bbq_autoclose.js
//
// One-off manual test runner for bbqAutoClose. Bypasses the Cloud
// Scheduler trigger entirely — calls the same exports.run() the real
// 23:50 Friday cron would call, but on demand.
// NOT part of the deployed app — delete or leave in scripts/ as a
// reusable dev tool, your call.
//
// Credential pattern copied from test_bbq_locker.js / seedBbqSettings.js —
// admin.initializeApp() with no args only works inside a deployed Cloud
// Function; running locally on the NAS needs the explicit service-account
// cert.
//
// Run from core/functions/:  node scripts/test_bbq_autoclose.js

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { run } = require('../src/scheduled/bbqAutoClose');

run({ eventDate: '2026-07-17' })
  .then(() => {
    console.log('bbqAutoClose.run() completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('bbqAutoClose.run() failed:', err);
    process.exit(1);
  });