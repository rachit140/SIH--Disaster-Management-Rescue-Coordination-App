const express = require('express');
const router = express.Router();
const {
  createSOS,
  syncEvents,
  getIncidents,
  updateIncidentStatus,
  acceptRescue,
  updateRescueStatus,
  getNearbySOS,
} = require('../controllers/incidentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/sos', createSOS);
router.post('/sync', syncEvents);
router.get('/incidents', getIncidents);
router.patch('/incidents/:id', updateIncidentStatus);

router.get('/sos/nearby', getNearbySOS);
router.post('/rescue/accept/:incidentId', verifyToken, acceptRescue);
router.patch('/rescue/status/:incidentId', verifyToken, updateRescueStatus);

module.exports = router;