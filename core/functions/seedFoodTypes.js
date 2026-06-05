// ─────────────────────────────────────────────────────────────────────────────
// seedFoodTypes.js — One-time seed script
// HomiLabs | Servio
// Adds missing food types to Firestore. Safe to run multiple times —
// uses merge so existing documents are not overwritten.
// ─────────────────────────────────────────────────────────────────────────────
// Usage:
//   cd /mnt/storage/projects/servio_dev/core/functions
//   node ../../scripts/seedFoodTypes.js
// ─────────────────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore('servio-dev');

// ── Food types to seed ────────────────────────────────────────────────────────
const FOOD_TYPES = [
  { foodTypeCode: 'COMBO',          displayName: 'Combo',               sortOrder: 1  },
  { foodTypeCode: 'DESI_GRAVY',     displayName: 'Desi Gravies',        sortOrder: 2  },
  { foodTypeCode: 'CHINESE_GRAVY',  displayName: 'Chinese Gravies',     sortOrder: 3  },
  { foodTypeCode: 'CONTINENTAL',    displayName: 'Continental',         sortOrder: 4  },
  { foodTypeCode: 'VEG_MAIN',       displayName: 'Veg Main Course',     sortOrder: 5  },
  { foodTypeCode: 'RICE_NOODLES',   displayName: 'Rice & Noodles',      sortOrder: 6  },
  { foodTypeCode: 'SOUP',           displayName: 'Soups',               sortOrder: 7  },
  { foodTypeCode: 'STARTER',        displayName: 'Starters',            sortOrder: 8  },
  { foodTypeCode: 'SALAD',          displayName: 'Salads & Raita',      sortOrder: 20  },
  { foodTypeCode: 'SAUCE_CHUTNEY',  displayName: 'Sauces & Chutneys',   sortOrder: 10 },
  { foodTypeCode: 'BURGER_SANDWICH',displayName: 'Burgers & Sandwiches',sortOrder: 11 },
  { foodTypeCode: 'BBQ',            displayName: 'BBQ Items',           sortOrder: 12 },
  { foodTypeCode: 'BREAD',          displayName: 'Breads',              sortOrder: 13 },
  { foodTypeCode: 'DESS',           displayName: 'Desserts',            sortOrder: 14 },
  { foodTypeCode: 'BEV_HOT',        displayName: 'Hot Beverages',       sortOrder: 15 },
  { foodTypeCode: 'BEV_COLD',       displayName: 'Cold Beverages',      sortOrder: 16 },
  { foodTypeCode: 'DAIRY',          displayName: 'Dairy',               sortOrder: 17 },
  { foodTypeCode: 'SNACK',          displayName: 'Snacks',              sortOrder: 18 },
  { foodTypeCode: 'BAKED',          displayName: 'Baked Items',         sortOrder: 19 },
  { foodTypeCode: 'BF ITEM',        displayName: 'BF Items',            sortOrder: 9 },
];

// ── Run ───────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Seeding food types...\n');
  const now = new Date();
  let added = 0;
  let skipped = 0;

  for (const ft of FOOD_TYPES) {
    const ref = db.collection('foodTypes').doc(ft.foodTypeCode);
    const existing = await ref.get();

    if (existing.exists) {
      // Update sortOrder and displayName but preserve other fields
      await ref.update({
        displayName: ft.displayName,
        sortOrder:   ft.sortOrder,
        updatedAt:   now,
      });
      console.log(`  updated : ${ft.foodTypeCode} — ${ft.displayName}`);
      skipped++;
    } else {
      await ref.set({
        foodTypeCode: ft.foodTypeCode,
        displayName:  ft.displayName,
        sortOrder:    ft.sortOrder,
        isActive:     true,
        isVisible:    true,
        createdAt:    now,
        updatedAt:    now,
      });
      console.log(`  added   : ${ft.foodTypeCode} — ${ft.displayName}`);
      added++;
    }
  }

  console.log(`\nDone. ${added} added, ${skipped} updated.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
