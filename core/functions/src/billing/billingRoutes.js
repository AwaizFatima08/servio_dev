// ─────────────────────────────────────────────────────────────────────────────
// billingRoutes.js — Billing Dashboard API
// Release: V1 | Flow 14
// ─────────────────────────────────────────────────────────────────────────────
//
// Endpoints:
//   GET /billing/my-statement?month=YYYY-MM         — Bug 7 fix: employee own statement (mobile)
//   GET /billing/employee/:employeeNumber?month=YYYY-MM
//   GET /billing/official?month=YYYY-MM
//   GET /billing/pending?date=YYYY-MM-DD
//   GET /billing/summary?month=YYYY-MM
//
// /my-statement: any authenticated role (employee reads own bill)
// All other endpoints: accounts_supervisor, admin, super_admin
// Summary endpoint additionally allows: manager
//
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const verifyToken    = require('../middleware/verifyToken');
const verifyRole     = require('../middleware/verifyRole');
const billingService = require('./billingService');
const { ROLES }      = require('../constants');

const BILLING_ROLES = ['accounts_supervisor', 'admin', 'super_admin'];
const SUMMARY_ROLES = ['accounts_supervisor', 'manager', 'admin', 'super_admin'];
const ANY_ROLE      = [
  'employee', 'mess_supervisor', 'accounts_supervisor',
  'manager', 'admin', 'super_admin',
  'cafe_bakery_tuckshop_supervisor', 'gh_supervisor',
  'boq_supervisor', 'store_supervisor', 'purchaser', 'sports_supervisor',
];

// ── Validation helpers ────────────────────────────────────────────────────────

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/my-statement?month=YYYY-MM
// Bug 7 fix: mobile employee bill screen calls this.
// Returns the calling employee's own monthly statement.
// Uses req.officialEmployeeNumber set by verifyRole middleware.
// Any authenticated role — employee reads their own data.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/my-statement',
  verifyToken,
  verifyRole(...ANY_ROLE),
  async (req, res) => {
    try {
      const { month } = req.query;
      const employeeNumber = req.officialEmployeeNumber;

      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'month query param required — format: YYYY-MM',
        });
      }
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          message: 'month must be YYYY-MM format (e.g. 2026-05)',
        });
      }
      if (!employeeNumber) {
        return res.status(400).json({
          success: false,
          message: 'Employee number not found on token. Ensure account is active.',
        });
      }

      const raw = await billingService.getEmployeeStatement(
        req.tenantId, employeeNumber, month
      );

      // Mobile screen expects: { reservations, totalAmount, issuedCount, pendingRateCount }
      // Map from the service response shape to what the screen needs
      const data = {
        employeeNumber: raw.employeeNumber,
        employeeName:   raw.employeeName,
        month:          raw.month,
        reservations:   raw.lineItems || [],
        totalAmount:    raw.summary?.totalAmount        ?? 0,
        issuedCount:    raw.summary?.employeeCharges    ?? 0,
        pendingRateCount: raw.summary?.pendingRateCount ?? 0,
      };

      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /billing/my-statement error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate statement',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/employee/:employeeNumber?month=YYYY-MM
// Employee monthly billing statement with line items.
// accounts_supervisor uses this to prepare salary deduction list.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/employee/:employeeNumber',
  verifyToken,
  verifyRole(...BILLING_ROLES),
  async (req, res) => {
    try {
      const { employeeNumber } = req.params;
      const { month } = req.query;

      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'month query param required — format: YYYY-MM',
        });
      }
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          message: 'month must be YYYY-MM format (e.g. 2026-05)',
        });
      }

      const data = await billingService.getEmployeeStatement(
        req.tenantId, employeeNumber, month
      );

      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /billing/employee error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate employee billing statement',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/official?month=YYYY-MM
// All official account charges for the month, grouped by cost centre.
// Used by accounts supervisor for departmental billing.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/official',
  verifyToken,
  verifyRole(...BILLING_ROLES),
  async (req, res) => {
    try {
      const { month } = req.query;

      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'month query param required — format: YYYY-MM',
        });
      }
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          message: 'month must be YYYY-MM format (e.g. 2026-05)',
        });
      }

      const data = await billingService.getOfficialCharges(req.tenantId, month);
      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /billing/official error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate official account charges',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/pending?date=YYYY-MM-DD
// Issued reservations with no rate applied yet.
// Defaults to yesterday if no date provided.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/pending',
  verifyToken,
  verifyRole(...BILLING_ROLES),
  async (req, res) => {
    try {
      const { date } = req.query;

      if (date && !isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: 'date must be YYYY-MM-DD format',
        });
      }

      const data = await billingService.getPendingBilling(req.tenantId, date || null);
      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /billing/pending error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pending billing',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /billing/summary?month=YYYY-MM
// Month-level totals — employee vs official, pending counts, meal breakdown.
// No line items — management overview only.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/summary',
  verifyToken,
  verifyRole(...SUMMARY_ROLES),
  async (req, res) => {
    try {
      const { month } = req.query;

      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'month query param required — format: YYYY-MM',
        });
      }
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          message: 'month must be YYYY-MM format (e.g. 2026-05)',
        });
      }

      const data = await billingService.getMonthlySummary(req.tenantId, month);
      return res.status(200).json({ success: true, data });

    } catch (err) {
      console.error('GET /billing/summary error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate monthly billing summary',
      });
    }
  }
);

module.exports = router;
