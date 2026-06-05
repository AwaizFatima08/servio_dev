// ─────────────────────────────────────────
// reportRoutes.js — Reporting API Endpoints
// Release: V1 | Flow 11
// ─────────────────────────────────────────
//
// Endpoints:
//
//   LIVE QUERIES (real-time — always fresh):
//   GET  /reports/daily-headcount?date=YYYY-MM-DD
//   GET  /reports/admin-alerts
//
//   SNAPSHOT READS (pre-computed — fast):
//   GET  /reports/snapshot/:reportType?period=YYYY-MM
//   GET  /reports/snapshots/:reportType           (list available periods)
//
//   ON-DEMAND:
//   GET  /reports/event/:eventId                  (single event summary)
//   POST /reports/trigger-snapshot                (admin manual trigger)
//
// ─────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const reportService   = require('./reportService');

const OPERATIONAL_ROLES = ['mess_supervisor','manager','admin','super_admin'];
const BILLING_ROLES = ['accounts_supervisor','manager','admin','super_admin'];
const MANAGEMENT_ROLES = ['manager','admin','super_admin'];
const ADMIN_ROLES = ['admin','super_admin'];

// GET /daily-headcount
router.get('/daily-headcount', verifyToken, verifyRole(...OPERATIONAL_ROLES), async (req, res) => {
  try {
    // PKT = UTC+5. Using UTC+5 arithmetic so the default date is always correct in Pakistan.
    const _pkt = new Date(new Date().getTime() + 5 * 60 * 60 * 1000);
    const _pktStr = `${_pkt.getUTCFullYear()}-${String(_pkt.getUTCMonth()+1).padStart(2,'0')}-${String(_pkt.getUTCDate()).padStart(2,'0')}`;
    const date = req.query.date || _pktStr;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: 'date must be YYYY-MM-DD' });
    const data = await reportService.getDailyHeadcount(req.tenantId, date);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate headcount report' });
  }
});

// GET /admin-alerts
router.get('/admin-alerts', verifyToken, verifyRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = await reportService.getAdminAlerts(req.tenantId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate admin alerts' });
  }
});

// GET /snapshot/:reportType?period=YYYY-MM
router.get('/snapshot/:reportType', verifyToken, verifyRole(...OPERATIONAL_ROLES, ...BILLING_ROLES), async (req, res) => {
  try {
    const { reportType } = req.params;
    const { period } = req.query;
    if (!period) return res.status(400).json({ success: false, message: 'period query param required' });
    if (['monthly_billing_employee','monthly_billing_official','monthly_billing_summary'].includes(reportType) && !BILLING_ROLES.includes(req.userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied for billing reports' });
    }
    let data = await reportService.getSnapshot(req.tenantId, reportType, period);

    // ── Bug 9 fix: live fallback for feedback_trends ─────────────────────────
    // The snapshot engine only runs nightly for the PREVIOUS month.
    // If no snapshot exists yet (e.g. current month), fall back to a live
    // calculation so the dashboard never shows a blank 0.0 state.
    if (!data && reportType === 'feedback_trends') {
      const feedbackTrendsGen = require('./generators/feedbackTrends');
      const { getFirestore } = require('firebase-admin/firestore');
      const db = getFirestore('servio-dev');
      // period is YYYY-MM — expand to first and last day of that month
      const [yr, mo] = period.split('-').map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      const pad = n => String(n).padStart(2, '0');
      const periodStart = `${yr}-${pad(mo)}-01`;
      const periodEnd   = `${yr}-${pad(mo)}-${pad(lastDay)}`;
      data = await feedbackTrendsGen.generate(db, req.tenantId, periodStart, periodEnd);
      data._liveCalculation = true; // flag for debugging — not shown to user
    }
    // ── End Bug 9 fix ────────────────────────────────────────────────────────

    if (!data) return res.status(404).json({ success: false, message: `No snapshot found for ${reportType} / ${period}.` });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to read snapshot' });
  }
});

// GET /snapshots/:reportType
router.get('/snapshots/:reportType', verifyToken, verifyRole(...MANAGEMENT_ROLES, 'accounts_supervisor'), async (req, res) => {
  try {
    const { reportType } = req.params;
    const limit = parseInt(req.query.limit) || 12;
    const list = await reportService.listSnapshots(req.tenantId, reportType, limit);
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to list snapshots' });
  }
});

// GET /event/:eventId
router.get('/event/:eventId', verifyToken, verifyRole(...MANAGEMENT_ROLES), async (req, res) => {
  try {
    const { eventId } = req.params;
    const data = await reportService.getEventSummary(req.tenantId, eventId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate event summary' });
  }
});

// POST /trigger-snapshot
router.post('/trigger-snapshot', verifyToken, verifyRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const results = await reportService.triggerManualSnapshot(req.tenantId);
    return res.status(200).json({ success: true, message: 'Snapshot engine completed', results });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Snapshot engine failed' });
  }
});

module.exports = router;