const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { searchTrip, saveTrip, getSavedTrips, deleteTrip } = require('../controllers/tripController');

router.post('/search', authMiddleware, searchTrip);
router.post('/save', authMiddleware, saveTrip);
router.get('/saved', authMiddleware, getSavedTrips);
router.delete('/:id', authMiddleware, deleteTrip);

module.exports = router;