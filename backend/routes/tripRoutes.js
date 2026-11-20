const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { searchTrip, saveTrip, getSavedTrips, deleteTrip } = require('../controllers/tripController');

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many trip searches. Please try again in 15 minutes.' }
});

const searchSchema = z.object({
  destination: z.string().trim().min(2, 'Destination is required').max(100),
  days: z.coerce.number().int().min(1, 'Minimum 1 day').max(30, 'Maximum 30 days'),
  people: z.coerce.number().int().min(1, 'Minimum 1 person').max(50, 'Maximum 50 people'),
  budget: z.coerce.number().positive('Budget must be positive').max(10_000_000)
});

const placeItemSchema = z.object({
  name: z.string().max(200),
  address: z.string().max(400).optional(),
  rating: z.number().min(0).max(5).optional(),
  priceLevel: z.union([z.number(), z.string()]).optional(),
  priceLevelRaw: z.number().optional(),
  estimatedPerNight: z.number().optional(),
  estimatedPerMeal: z.number().optional(),
  photoReference: z.string().max(500).optional()
});

const saveTripSchema = z.object({
  destination: z.string().trim().min(1).max(100),
  days: z.coerce.number().int().min(1).max(30),
  budget: z.coerce.number().positive().max(10_000_000),
  people: z.coerce.number().int().min(1).max(50),
  hotels: z.array(placeItemSchema).max(10).default([]),
  restaurants: z.array(placeItemSchema).max(10).default([]),
  itinerary: z.string().max(15000).default('')
});

router.post('/search', authMiddleware, searchLimiter, validate(searchSchema), searchTrip);
router.post('/save', authMiddleware, validate(saveTripSchema), saveTrip);
router.get('/saved', authMiddleware, getSavedTrips);
router.delete('/:id', authMiddleware, deleteTrip);

module.exports = router;
