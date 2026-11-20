const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Valid email is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required').max(128)
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Protected route works', userId: req.userId });
});

module.exports = router;
