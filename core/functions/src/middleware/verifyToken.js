// ─────────────────────────────────────────
// verifyToken.js — Firebase Auth Middleware
// HomiLabs | Servio
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const { errorResponse } = require('../utils');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Unauthorized — no token provided', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = decodedToken;
    next();

  } catch (error) {
    return errorResponse(res, 'Unauthorized — invalid token', 401);
  }
};

module.exports = verifyToken;
