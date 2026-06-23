// ─────────────────────────────────────────
// dump_schema.js — sample-based schema reflector
// HomiLabs | Servio
//
// READ-ONLY. Reads up to N sample docs from every collection in the dev
// Firestore and prints each collection's observed field names + types.
// Init block copied verbatim from copy_dev_to_prod.js (dev side only —
// no prod app is initialized, so this cannot touch prod).
//
// Output is the ground-truth field shape of live data — use it to update
// the schema reference. NOTE: sampling can miss fields that are null/absent
// in every sampled doc (the "null at creation, populated progressively"
// pattern). Raise SAMPLE or spot-check a known-complete doc if in doubt.
//
// Run from core/functions:  node scripts/dump_schema.js
// ─────────────────────────────────────────
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const DEV_KEY_PATH   = '/mnt/storage/projects/servio_dev/core/functions/service-account.json';
const NAMED_INSTANCE = 'servio-dev';
const SAMPLE = 8; // docs sampled per collection

const devKey = require(DEV_KEY_PATH);
const devApp = admin.initializeApp({ credential: admin.credential.cert(devKey) }, 'devApp');
const devDb  = getFirestore(devApp, NAMED_INSTANCE);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (v && typeof v.toDate === 'function') return 'timestamp';
  if (typeof v === 'object') return 'map';
  return typeof v; // string | number | boolean
}

async function run() {
  const collections = await devDb.listCollections();
  console.log('============================================================');
  console.log('  Servio dev schema reflection — ' + new Date().toISOString());
  console.log('  Project: servio-dev-55d2d / instance ' + NAMED_INSTANCE);
  console.log('  Found ' + collections.length + ' collections. Sampling up to ' + SAMPLE + ' docs each.');
  console.log('============================================================\n');

  // sort collection names for a stable, readable report
  const cols = collections.slice().sort((a, b) => a.id.localeCompare(b.id));

  for (const col of cols) {
    const snap = await col.limit(SAMPLE).get();
    console.log('=== ' + col.id + ' ===');
    if (snap.empty) { console.log('  (empty — no documents)\n'); continue; }

    // merge field types across sampled docs; a real type beats a 'null' seen elsewhere
    const seen = {};
    const nullable = {};
    snap.docs.forEach((doc) => {
      const data = doc.data();
      for (const [k, v] of Object.entries(data)) {
        const t = typeOf(v);
        if (t === 'null') nullable[k] = true;
        if (!(k in seen) || seen[k] === 'null') seen[k] = t;
      }
    });

    console.log('  (' + snap.size + ' sample docs, ' + Object.keys(seen).length + ' fields)');
    Object.keys(seen).sort().forEach((k) => {
      const nul = nullable[k] ? '  (null in some docs)' : '';
      console.log('  ' + k + ': ' + seen[k] + nul);
    });
    console.log('');
  }

  console.log('Done. This is sampled data, not an exhaustive schema — verify against');
  console.log('the schema reference and spot-check any collection that looks thin.');
  process.exit(0);
}

run().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });