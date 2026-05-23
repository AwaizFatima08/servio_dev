// core/functions/src/rates/mealRatesRoutes.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');
const { ROLES } = require('../constants');
const { errorResponse } = require('../utils');
const { getPendingRateEntries, submitRateEntries, getRatesForDate } = require('./mealRatesService');

const accountsAndAbove = [verifyToken, verifyRole(
  ROLES.ACCOUNTS_SUPERVISOR,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
)];

/**
 * GET /rates/pending?date=2026-05-23
 * Get items needing rate entry for a date
 * Accounts supervisor and above
 */
router.get('/pending', accountsAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { date } = req.query;

    if (!date) {
      return errorResponse(res, 'date query parameter is required.', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const items = await getPendingRateEntries({ tenantId, rateDate: date });

    return res.status(200).json({
      date,
      count: items.length,
      items,
    });

  } catch (error) {
    console.error('Get pending rates error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

/**
 * POST /rates
 * Submit rate entries for a date
 * Accounts supervisor and above
 * Body: { rateDate, entryDate, entries: [{ rateTargetKey, menuItemId, itemName, mealType, menuOptionKey, selectionMode, unitRate }] }
 */
router.post('/', accountsAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const enteredByUid = req.user.uid;
    const enteredByName = req.officialEmployeeNumber;

    const { rateDate, entryDate, entries } = req.body;

    if (!rateDate || !entryDate || !entries) {
      return errorResponse(res, 'rateDate, entryDate, and entries are required.', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rateDate)) {
      return errorResponse(res, 'Invalid rateDate format. Use YYYY-MM-DD.', 400);
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return errorResponse(res, 'entries must be a non-empty array.', 400);
    }

    const result = await submitRateEntries({
      tenantId,
      rateDate,
      entryDate,
      entries,
      enteredByUid,
      enteredByName,
    });

    return res.status(201).json({
      message: 'Rates submitted successfully.',
      result,
    });

  } catch (error) {
    console.error('Submit rates error:', error.message);
    return errorResponse(res, error.message, 400);
  }
});

/**
 * GET /rates/:date
 * Get all rate entries for a date
 * Accounts supervisor and above
 */
router.get('/:date', accountsAndAbove, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const rates = await getRatesForDate({ tenantId, rateDate: date });

    return res.status(200).json({
      date,
      count: rates.length,
      rates,
    });

  } catch (error) {
    console.error('Get rates error:', error.message);
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;