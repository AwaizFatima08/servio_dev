// ─────────────────────────────────────────
// index.js — Servio Backend Entry Point
// HomiLabs | Servio
// ─────────────────────────────────────────

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// ── Initialize Firebase Admin ────────────
admin.initializeApp({
  credential: admin.credential.cert(require('../service-account.json')),
});

// Point to the named Firestore database
const db = admin.firestore();

// ── Import Route Modules ─────────────────
const authRoutes = require('./auth/authRoutes');
const employeeRoutes   = require('./employees/employeeRoutes');
const menuRoutes       = require('./menu/menuRoutes');
const templateRoutes   = require('./templates/templateRoutes');
const reservationSettingsRoutes = require('./reservations/reservationSettingsRoutes');
// const orderRoutes      = require('./orders/orderRoutes');
// const rateRoutes       = require('./rates/rateRoutes');
// const billingRoutes    = require('./billing/billingRoutes');
// const notificationRoutes = require('./notifications/notificationRoutes');
// const feedbackRoutes   = require('./feedback/feedbackRoutes');
// const eventRoutes      = require('./events/eventRoutes');
// const reportRoutes     = require('./reports/reportRoutes');

// ── Create Express App ───────────────────
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// ── Health Check ─────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servio API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Mount Routes ─────────────────────────
app.use('/auth',          authRoutes);
app.use('/employees',     employeeRoutes);
app.use('/menu',          menuRoutes);
app.use('/templates',     templateRoutes);
app.use('/reservation-settings', reservationSettingsRoutes);
// app.use('/orders',        orderRoutes);
// app.use('/rates',         rateRoutes);
// app.use('/billing',       billingRoutes);
// app.use('/notifications', notificationRoutes);
// app.use('/feedback',      feedbackRoutes);
// app.use('/events',        eventRoutes);
// app.use('/reports',       reportRoutes);

// ── 404 Handler ──────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Export Main API Function ─────────────
exports.api = functions
  .region('asia-south1')
  .https.onRequest(app);

// ── Scheduled Jobs ───────────────────────
// Uncomment as each scheduled job is built

// Daily menu resolver — runs at midnight PKT
// exports.resolveDaily = functions
//   .region('asia-south1')
//   .pubsub.schedule('0 0 * * *')
//   .timeZone('Asia/Karachi')
//   .onRun(require('./scheduled/menuResolver').run);

// Overdue library checker — runs daily at 8am PKT (V2)
// exports.checkOverdue = functions
//   .region('asia-south1')
//   .pubsub.schedule('0 8 * * *')
//   .timeZone('Asia/Karachi')
//   .onRun(require('./scheduled/overdueChecker').run);
