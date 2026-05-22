// ─────────────────────────────────────────
// verifyRole.js — Role Authorization Middleware
// HomiLabs | Servio
// ─────────────────────────────────────────
const { getFirestore } = require('firebase-admin/firestore');
const { errorResponse } = require('../utils');
const { COLLECTIONS, ACCOUNT_STATUS } = require('../constants');

const db = getFirestore('servio-dev');

const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user.uid;

      const userDoc = await db
        .collection(COLLECTIONS.USERS)
        .doc(uid)
        .get();

      if (!userDoc.exists) {
        return errorResponse(res, 'User record not found', 404);
      }

      const userData = userDoc.data();

      if (userData.status !== ACCOUNT_STATUS.ACTIVE) {
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