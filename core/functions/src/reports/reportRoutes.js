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

// ── Role groups ───────────────────────────────────────────────────────────
// Who can see what:
//   Headcount:      mess_supervisor, manager, admin, super_admin
//   Billing:        accounts_supervisor, manager, admin, super_admin
//   Feedback:       manager, admin, super_admin
//   Events:         manager, admin, super_admin
//   Admin alerts:   admin, super_admin
//   Manual trigger: admin, super_admin only

const OPERATIONAL_ROLES = [
  'mess_supervisor','manager','admin','super_admin'
];
const BILLING_ROLES = [
  'accounts_supervisor','manager','admin','super_admin'
];
const MANAGEMENT_ROLES = [
  'manager','admin','super_admin'
];
const ADMIN_ROLES = [
  'admin','super_admin'
];

// ── GET /reports/daily-headcount?date=YYYY-MM-DD ─────────────────────────
// Live query. Returns headcount breakdown for the given date.
// If no date is provided, defaults to today.
router.get(
  '/daily-headcount',
  verifyToken,
  verifyRole(...OPERATIONAL_ROLES),
  async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];

      // Basic date format validation — YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'date must be YYYY-MM-DD' });
      }

      const data = await reportService.getDailyHeadcount(req.tenantId, date);
      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /reports/daily-headcount error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate headcount report' });
    }
  }
);

// ── GET /reports/admin-alerts ────────────────────────────────────────────
// Live query. Returns all pending action items for admin dashboard.
router.get(
  '/admin-alerts',
  verifyToken,
  verifyRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const data = await reportService.getAdminAlerts(req.tenantId);
      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /reports/admin-alerts error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate admin alerts' });
    }
  }
);

// ── GET /reports/snapshot/:reportType?period=YYYY-MM ─────────────────────
// Snapshot read. Returns a pre-computed KPI document.
// period format:
//   monthly snapshots → YYYY-MM  (e.g. 2026-05)
//   weekly snapshots  → YYYY-MM-DD  (Monday of the week, e.g. 2026-05-19)
//
// Role access is enforced per reportType.
router.get(
  '/snapshot/:reportType',
  verifyToken,
  verifyRole(...OPERATIONAL_ROLES, ...BILLING_ROLES), // broad — narrowed below per type
  async (req, res) => {
    try {
      const { reportType } = req.params;
      const { period }     = req.query;

      if (!period) {
        return res.status(400).json({ success: false, message: 'period query param required' });
      }

      // Per-report-type role enforcement
      const billingTypes = [
        'monthly_billing_employee',
        'monthly_billing_official',
        'monthly_billing_summary',
      ];
      if (billingTypes.includes(reportType) && !BILLING_ROLES.includes(req.userRole)) {
        return res.status(403).json({ success: false, message: 'Access denied for billing reports' });
      }

      const adminOnlyTypes = ['admin_alerts_summary'];
      if (adminOnlyTypes.includes(reportType) && !ADMIN_ROLES.includes(req.userRole)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const data = await reportService.getSnapshot(req.tenantId, reportType, period);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: `No snapshot found for ${reportType} / ${period}. It may not have been generated yet.`,
        });
      }

      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /reports/snapshot error:', err);
      return res.status(500).json({ success: false, message: 'Failed to read snapshot' });
    }
  }
);

// ── GET /reports/snapshots/:reportType ───────────────────────────────────
// Lists all available snapshot periods for a report type.
// Used by frontend to populate a period picker.
router.get(
  '/snapshots/:reportType',
  verifyToken,
  verifyRole(...MANAGEMENT_ROLES, 'accounts_supervisor'),
  async (req, res) => {
    try {
      const { reportType } = req.params;
      const limit = parseInt(req.query.limit) || 12;
      const list  = await reportService.listSnapshots(req.tenantId, reportType, limit);
      return res.status(200).json({ success: true, data: list });

    } catch (err) {
      console.error('GET /reports/snapshots error:', err);
      return res.status(500).json({ success: false, message: 'Failed to list snapshots' });
    }
  }
);

// ── GET /reports/event/:eventId ───────────────────────────────────────────
// On-demand event summary — not pre-computed.
// Generated fresh when requested.
router.get(
  '/event/:eventId',
  verifyToken,
  verifyRole(...MANAGEMENT_ROLES),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const data = await reportService.getEventSummary(req.tenantId, eventId);
      return res.status(200).json({ success: true, data });

    } catch (err) {
      if (err.message && err.message.startsWith('Event not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      console.error('GET /reports/event error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate event summary' });
    }
  }
);

// ── POST /reports/trigger-snapshot ───────────────────────────────────────
// Admin-only manual trigger. Runs the full snapshot engine immediately.
// Used for testing without waiting for midnight.
// In production, the nightly Cloud Function handles this automatically.
router.post(
  '/trigger-snapshot',
  verifyToken,
  verifyRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      // Runs for req.tenantId only — cannot trigger for other tenants
      const results = await reportService.triggerManualSnapshot(req.tenantId);
      return res.status(200).json({
        success: true,
        message: 'Snapshot engine completed',
        results,
      });

    } catch (err) {
      console.error('POST /reports/trigger-snapshot error:', err);
      return res.status(500).json({ success: false, message: 'Snapshot engine failed' });
    }
  }
);

module.exports = router;