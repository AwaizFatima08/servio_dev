// ─────────────────────────────────────────
// utils.js — Servio Shared Utilities
// HomiLabs | Servio
// ─────────────────────────────────────────

/**
 * Standard success response
 */
const successResponse = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard error response
 */
const errorResponse = (res, message = 'An error occurred', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
  };
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error.toString();
  }
  return res.status(statusCode).json(response);
};

/**
 * Current timestamp as ISO string
 */
const nowISO = () => new Date().toISOString();
/**
 * Date as YYYY-MM-DD in PKT (UTC+5).
 * Safe on Node.js (backend). For mobile, use the inline pattern in mess service
 * (Hermes does not handle toLocaleString reliably).
 */
const pktDateStr = (date = new Date()) => {
  return date.toLocaleString('en-CA', { timeZone: 'Asia/Karachi' }).split(',')[0];
};

/**
 * Adds N days to a YYYY-MM-DD string, returning YYYY-MM-DD (PKT).
 * Copied verbatim from cafe/cafeOrderService.js (04-Jul-2026) — moved here
 * so Tea Bar's History slice can use it without depending on café's file.
 * Café's own copy is untouched and unaffected — this is a pure ADDITION.
 * Verified 04-Jul-2026 against 6 test cases including month/year boundaries.
 */
const addDaysToDateStr = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00+05:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return pktDateStr(d);
};

/**
 * Generate a padded sequential ID
 * e.g. generateId('RES', 1) → 'RES_000001'
 */
const generateId = (prefix, number) => {
  return `${prefix}_${String(number).padStart(6, '0')}`;
};

/**
 * Check if a value is a non-empty string
 */
const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Validate required fields on a request body
 * Returns array of missing field names
 */
const validateRequired = (body, requiredFields) => {
  return requiredFields.filter(field => {
    const value = body[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  });
};

module.exports = {
  successResponse,
  errorResponse,
  nowISO,
  pktDateStr,
  addDaysToDateStr,
  generateId,
  isNonEmptyString,
  validateRequired,
};
