/**
 * ============================================================
 * SERVIO — Employee Bulk Upload Script
 * HomiLabs | servio-dev Firebase Project
 * ============================================================
 *
 * WHAT THIS SCRIPT DOES:
 * Reads Employee_Data.xlsx and uploads each row as one document
 * into the Firestore "employees" collection.
 *
 * BEFORE RUNNING:
 * 1. Place this file in your project folder on the NAS
 * 2. Place Employee_Data.xlsx in the same folder
 * 3. Place your Firebase service account key JSON in the same folder
 *    (download from Firebase Console → Project Settings → Service Accounts)
 * 4. Run: npm install xlsx firebase-admin
 * 5. Run: node upload_employees.js
 *
 * OUTPUT:
 * - Prints progress as it uploads
 * - At the end, prints a summary report
 * - Saves a report file: upload_report.txt
 * ============================================================
 */

const XLSX = require('xlsx');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION — Edit these two lines if needed
// ============================================================
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';  // Your Firebase key file
const EXCEL_FILE_PATH = './Employee_Data.xlsx';           // Your Excel file
const TENANT_ID = 'ffl';
// ============================================================

// --- Initialize Firebase ---
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  databaseId: 'servio-dev',
  credential: admin.credential.cert(serviceAccount)
});
const db = getFirestore('servio-dev');

// --- Helper: Convert "10-Apr-1972" → "1972-04-10" ---
function convertDOB(dobString) {
  if (!dobString || dobString.toString().trim() === '') return null;

  const months = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  const str = dobString.toString().trim();

  // Handle "10-Apr-1972" format
  const match = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()];
    const year = match[3];
    if (month) return `${year}-${month}-${day}`;
  }

  // Handle "1972-04-10" format (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Unrecognised format — return null and log
  return null;
}

// --- Helper: Fix phone number ---
// Excel drops leading zero: 3336139245 → "03336139245"
function convertPhone(phoneVal) {
  if (phoneVal === null || phoneVal === undefined || phoneVal === '') return null;
  const str = phoneVal.toString().trim();
  if (str === '') return null;
  // If it's 10 digits (missing leading 0), add it
  if (/^\d{10}$/.test(str)) return '0' + str;
  // If it's already 11 digits starting with 0, keep it
  if (/^0\d{10}$/.test(str)) return str;
  // Otherwise keep as-is and flag
  return str;
}

// --- Helper: Fix CNIC last 4 ---
// Pad to always be 4 characters: 8 → "0008", 129 → "0129"
function convertCnic(cnicVal) {
  if (cnicVal === null || cnicVal === undefined || cnicVal === '') return null;
  const num = parseFloat(cnicVal.toString());
  if (isNaN(num)) return null;
  return Math.round(num).toString().padStart(4, '0');
}

// --- Main Upload Function ---
async function uploadEmployees() {
  console.log('============================================================');
  console.log('  SERVIO — Employee Bulk Upload');
  console.log('============================================================');
  console.log('');

  // Read Excel file
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Found ${rows.length} rows in Excel.`);
  console.log('');

  // Counters
  let uploaded = 0;
  let skipped = 0;
  let warnings = [];
  const skippedRows = [];

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row number (1 = header, so data starts at 2)

    const empNum = row['officialEmployeeNumber']
      ? row['officialEmployeeNumber'].toString().trim()
      : null;

    const fullName = row['fullName']
      ? row['fullName'].toString().trim()
      : null;

    // --- Validation: Skip rows missing critical fields ---
    if (!empNum) {
      skipped++;
      skippedRows.push(`Row ${rowNum}: Skipped — no employee number`);
      console.log(`  ⚠️  Row ${rowNum}: Skipped — no employee number`);
      continue;
    }

    if (!fullName) {
      skipped++;
      skippedRows.push(`Row ${rowNum} (${empNum}): Skipped — no name`);
      console.log(`  ⚠️  Row ${rowNum} (${empNum}): Skipped — no name`);
      continue;
    }

    const cnic = convertCnic(row['cnicLast4']);
    if (!cnic) {
      skipped++;
      skippedRows.push(`Row ${rowNum} (${empNum} - ${fullName}): Skipped — no CNIC last 4`);
      console.log(`  ⚠️  Row ${rowNum} (${empNum}): Skipped — no CNIC`);
      continue;
    }

    // --- Process optional fields ---
    const phone = convertPhone(row['phoneNumber']);
    const dob = convertDOB(row['dateOfBirth']);

    // Warn about missing DOB (but do not skip)
    if (!dob) {
      warnings.push(`${empNum} (${fullName}): DOB missing or unreadable — self-signup will fail for this employee`);
    }

    // Warn about unusual phone
    if (!phone) {
      warnings.push(`${empNum} (${fullName}): Phone number missing`);
    }

    // --- Build the Firestore document ---
    const now = admin.firestore.Timestamp.now();

    const employeeDoc = {
      officialEmployeeNumber: empNum,
      fullName: fullName,
      employeeType: 'management',
      tenantId: TENANT_ID,

      // From data
      cnicLast4: cnic,
      phoneNumber: phone,
      dateOfBirth: dob,

      // Fields employee fills via app later
      grade: null,
      designation: null,
      department: null,
      houseNumber: null,
      residenceType: null,
      pendingGrade: null,
      pendingDesignation: null,
      pendingHouseNumber: null,
      pendingResidenceType: null,

      // Throttle/auth fields
      failedAttemptCount: 0,
      lastFailedAt: null,
      isThrottled: false,

      // Status
      isActive: true,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    };

    // --- Upload to Firestore ---
    try {
      await db.collection('employees').doc(empNum).set(employeeDoc);
      uploaded++;
      console.log(`  ✅  ${empNum} — ${fullName}`);
    } catch (err) {
      skipped++;
      skippedRows.push(`Row ${rowNum} (${empNum}): Upload FAILED — ${err.message}`);
      console.log(`  ❌  ${empNum}: Upload failed — ${err.message}`);
    }
  }

  // --- Print Summary ---
  console.log('');
  console.log('============================================================');
  console.log('  UPLOAD COMPLETE');
  console.log('============================================================');
  console.log(`  ✅  Uploaded:  ${uploaded}`);
  console.log(`  ⚠️   Skipped:   ${skipped}`);
  console.log(`  ⚠️   Warnings:  ${warnings.length}`);
  console.log('');

  // Build report text
  let report = `SERVIO Employee Upload Report\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `============================================================\n\n`;
  report += `SUMMARY\n`;
  report += `  Uploaded:  ${uploaded}\n`;
  report += `  Skipped:   ${skipped}\n`;
  report += `  Warnings:  ${warnings.length}\n\n`;

  if (skippedRows.length > 0) {
    report += `SKIPPED ROWS (need manual handling)\n`;
    skippedRows.forEach(s => report += `  - ${s}\n`);
    report += '\n';
  }

  if (warnings.length > 0) {
    report += `WARNINGS (uploaded but needs attention)\n`;
    warnings.forEach(w => report += `  - ${w}\n`);
    report += '\n';
  }

  if (skippedRows.length === 0 && warnings.length === 0) {
    report += `No issues found. All rows uploaded cleanly.\n`;
  }

  // Save report
  fs.writeFileSync('./upload_report.txt', report);
  console.log('  Report saved to: upload_report.txt');
  console.log('============================================================');

  // Exit
  process.exit(0);
}

// Run
uploadEmployees().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
