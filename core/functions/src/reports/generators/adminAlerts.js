// ─────────────────────────────────────────
// adminAlerts.js — Live Query Generator
// Release: V1 | Flow 11
// Type: LIVE — runs at query time
// ─────────────────────────────────────────
// Collects all pending action items across the system
// that require admin or accounts_supervisor attention.
// This is NOT pre-computed because admins need real-time counts.
//
// Alert categories:
//   - Pending registration requests
//   - Pending profile change approvals
//   - Throttled employee accounts
//   - Rates not yet entered for yesterday
//   - Events pending review
// ─────────────────────────────────────────

const { COLLECTIONS, REGISTRATION_STATUS, RATE_ENTRY_STATUS } = require('../../constants');

/**
 * Generate live admin alerts summary.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} tenantId
 * @returns {object}
 */
async function generate(db, tenantId) {

  const today     = new Date().toISOString().split('T')[0];
  const yesterday = getPreviousDate(today);

  // Run all queries in parallel — faster than sequential
  const [
    pendingRegSnap,
    throttledSnap,
    pendingRatesSnap,
    pendingEventsSnap,
  ] = await Promise.all([

    // Pending registration requests
    db.collection(COLLECTIONS.REGISTRATION_REQUESTS)
      .where('tenantId', '==', tenantId)
      .where('requestStatus', '==', REGISTRATION_STATUS.PENDING)
      .get(),

    // Throttled employees
    db.collection(COLLECTIONS.EMPLOYEES)
      .where('tenantId', '==', tenantId)
      .where('isThrottled', '==', true)
      .get(),

    // Daily menus where rates are not yet complete (yesterday)
    // These are the menus that still need rate entry from accounts supervisor
    db.collection(COLLECTIONS.DAILY_MENUS)
      .where('tenantId', '==', tenantId)
      .where('menuDate', '==', yesterday)
      .where('rateEntryStatus', 'in', [RATE_ENTRY_STATUS.PENDING, RATE_ENTRY_STATUS.PARTIAL])
      .get(),

    // Official events pending admin review
    db.collection(COLLECTIONS.EVENTS)
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'pending_review')
      .get(),
  ]);

  const alerts = [];

  if (pendingRegSnap.size > 0) {
    alerts.push({
      alertType:   'pending_registrations',
      count:       pendingRegSnap.size,
      message:     `${pendingRegSnap.size} registration request(s) awaiting approval`,
      priority:    'high',
    });
  }

  if (throttledSnap.size > 0) {
    alerts.push({
      alertType:   'throttled_accounts',
      count:       throttledSnap.size,
      message:     `${throttledSnap.size} employee account(s) throttled — manual reset required`,
      priority:    'high',
    });
  }

  if (pendingRatesSnap.size > 0) {
    alerts.push({
      alertType:   'pending_rate_entry',
      count:       pendingRatesSnap.size,
      date:        yesterday,
      message:     `Rate entry pending for ${pendingRatesSnap.size} meal(s) from ${yesterday}`,
      priority:    'medium',
    });
  }

  if (pendingEventsSnap.size > 0) {
    alerts.push({
      alertType:   'events_pending_review',
      count:       pendingEventsSnap.size,
      message:     `${pendingEventsSnap.size} event(s) pending admin review`,
      priority:    'medium',
    });
  }

  return {
    reportType:   'admin_alerts_summary',
    generatedAt:  new Date().toISOString(),
    tenantId,
    totalAlerts:  alerts.length,
    hasHighPriority: alerts.some(a => a.priority === 'high'),
    alerts,
  };
}

function getPreviousDate(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

module.exports = { generate };