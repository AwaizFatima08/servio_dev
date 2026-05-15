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
  generateId,
  isNonEmptyString,
  validateRequired,
};
