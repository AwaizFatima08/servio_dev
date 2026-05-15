// ─────────────────────────────────────────
// verifyRole.js — Role Authorization Middleware
// HomiLabs | Servio
// ─────────────────────────────────────────

const admin = require('firebase-admin');
const { errorResponse } = require('../utils');
const { COLLECTIONS } = require('../constants');

const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user.uid;

      const userDoc = await admin
        .firestore()
        .collection(COLLECTIONS.USERS)
        .doc(uid)
        .get();

      if (!userDoc.exists) {
        return errorResponse(res, 'User record not found', 404);
      }

      const userData = userDoc.data();

      if (!userData.isActive) {
        return errorResponse(res, 'Account is inactive', 403);
      }

      if (!allowedRoles.includes(userData.role)) {
        return errorResponse(res, 'Access denied — insufficient role', 403);
      }

      req.userRole = userData.role;
      req.officialEmployeeNumber = userData.officialEmployeeNumber;
      req.tenantId = userData.tenantId;
      next();

    } catch (error) {
      return errorResponse(res, 'Authorization check failed', 500, error);
    }
  };
};

module.exports = verifyRole;
