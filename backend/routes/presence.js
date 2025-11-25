const express = require('express');
const { authenticateToken, checkBranchAccess } = require('../middleware/auth');
const presence = require('../utils/presence');

const router = express.Router();

// Get online members for a specific branch
router.get('/branch/:branchId', authenticateToken, checkBranchAccess, async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const members = await presence.getMembers(branchId);
    res.json({ success: true, branchId, members });
  } catch (error) {
    console.error('Error fetching branch presence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin debug endpoint - all online members across branches
router.get('/online', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const all = await presence.getAllOnline();
    res.json({ success: true, data: all });
  } catch (error) {
    console.error('Error fetching all presence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
