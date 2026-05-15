// ─────────────────────────────────────────
// authRoutes.js — Placeholder
// HomiLabs | Servio | Flow 01
// ─────────────────────────────────────────

const express = require('express');
const router = express.Router();

// Placeholder — routes will be added in Flow 01
router.get('/ping', (req, res) => {
  res.status(200).json({ success: true, message: 'Auth routes active' });
});

module.exports = router;
