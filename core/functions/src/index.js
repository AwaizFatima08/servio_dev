// ─────────────────────────────────────────
// index.js — Servio Backend Entry Point
// HomiLabs | Servio
// ─────────────────────────────────────────
//
// CHANGE (Batch 1, 01 Jun 2026):
// Added an admin-only manual trigger for the menu resolver. After
// deploying the menuResolver.js fix for Bug 1, you need a way to
// regenerate dailyMenus without waiting for the 23:50 PKT cron.
// This endpoint does exactly that.
//
//   POST  /admin/resolve-menus
//   Header:  Authorization: Bearer <admin user's Firebase ID token>
//   Body:    (none)
//
// The endpoint walks every active tenant and regenerates 7 days of
// dailyMenus, identical to what the nightly cron does. Restricted
// to admin and super_admin roles via verifyRole middleware.
// ─────────────────────────────────────────

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// ── Initialize Firebase Admin ────────────
admin.initializeApp();

// Point to the named Firestore database
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('servio-dev');

// ── Import Route Modules ─────────────────
const authRoutes                  = require('./auth/authRoutes');
const employeeRoutes              = require('./employees/employeeRoutes');
const menuRoutes                  = require('./menu/menuRoutes');
const templateRoutes              = require('./templates/templateRoutes');
const reservationSettingsRoutes   = require('./reservations/reservationSettingsRoutes');
const messRoutes                  = require('./mess/messRoutes');
const rateRoutes                  = require('./rates/ratesRoutes');
const billingRoutes               = require('./billing/billingRoutes');
const notificationRoutes          = require('./notifications/notificationRoutes');
const feedbackRoutes              = require('./feedback/feedbackRoutes');
const eventRoutes                 = require('./events/eventRoutes');
const eventNoteTemplateRoutes     = require('./events/eventNoteTemplateRoutes');
const reportRoutes                = require('./reports/reportRoutes');
const kitchenRoutes               = require('./kitchen/kitchenRoutes');
const profileRoutes               = require('./profile/profileRoutes');
const appSettingsRoutes           = require('./appSettings/appSettingsRoutes');
const familyRoutes                = require('./family/familyRoutes');
const cafeRoutes                  = require('./cafe/cafeRoutes');


// ── Middleware + scheduled module (used by manual trigger below) ──
// verifyToken populates req.user from the Bearer token.
// verifyRole then checks req.user.uid against the users collection
// to confirm the role and load tenantId. Both are required.
const verifyToken  = require('./middleware/verifyToken');
const verifyRole   = require('./middleware/verifyRole');
const menuResolver = require('./scheduled/menuResolver');

// ── Create Express App ───────────────────
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// ── Health Check ─────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servio API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Mount Routes ─────────────────────────
app.use('/auth',                    authRoutes);
app.use('/employees',               employeeRoutes);
app.use('/menu',                    menuRoutes);
app.use('/templates',               templateRoutes);
app.use('/reservation-settings',    reservationSettingsRoutes);
app.use('/mess',                    messRoutes);
app.use('/rates',                   rateRoutes);
app.use('/billing',                 billingRoutes);
app.use('/notifications',           notificationRoutes);
app.use('/feedback',                feedbackRoutes);
app.use('/events',                  eventRoutes);
app.use('/event-note-templates',    eventNoteTemplateRoutes);
app.use('/reports',                 reportRoutes);
app.use('/kitchen',                 kitchenRoutes);
app.use('/profile',                 profileRoutes);
app.use('/app-settings',            appSettingsRoutes);
app.use('/family',                  familyRoutes);
app.use('/cafe',                    cafeRoutes);

// ── Admin: Manual menu resolver trigger (Batch 1, 01 Jun 2026) ──
// POST /admin/resolve-menus
// Re-runs the daily menu resolver on demand. Useful after deploying
// resolver fixes, or whenever menuCycles / messWeeklyTemplates have
// been changed and you want the change reflected immediately rather
// than waiting for the 23:50 PKT cron.
app.post(
  '/admin/resolve-menus',
  verifyToken,
  verifyRole('admin', 'super_admin'),
  async (req, res) => {
    try {
      console.log(`[Admin] Manual menu resolve triggered by uid=${req.user.uid}`);
      await menuResolver.run({ manual: true, triggeredBy: req.user.uid });
      res.status(200).json({
        success: true,
        message: 'Menu resolver completed. Check Cloud Functions logs for per-tenant details.',
      });
    } catch (err) {
      console.error('[Admin] Manual menu resolve failed:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Menu resolver failed. Check Cloud Functions logs.',
      });
    }
  }
);

// ── 404 Handler ──────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Export Main API Function ───────────
exports.api = functions
  .region('asia-south1')
  .https.onRequest(app);

// ── Scheduled Jobs ───────────────────────

// Daily menu resolver — runs at 23:50 PKT, generates next 7 days
exports.resolveDaily = functions
  .region('asia-south1')
  .pubsub.schedule('50 23 * * *')
  .timeZone('Asia/Karachi')
  .onRun(require('./scheduled/menuResolver').run);

// Reporting snapshot engine — runs at 23:30 PKT
exports.generateSnapshots = functions
  .region('asia-south1')
  .pubsub.schedule('30 23 * * *')
  .timeZone('Asia/Karachi')
  .onRun(async () => {
    const { run } = require('./reports/snapshotEngine');
    await run(null);
  });

// Overdue library checker — V2, not yet active
// exports.checkOverdue = functions
//   .region('asia-south1')
//   .pubsub.schedule('0 8 * * *')
//   .timeZone('Asia/Karachi')
//   .onRun(require('./scheduled/overdueChecker').run);
