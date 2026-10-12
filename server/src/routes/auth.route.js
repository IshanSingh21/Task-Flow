const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { registerSchema, loginSchema, validateRequest } = require('../validators/auth.validator');

// Rate-limited sensitive authentication routes
router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;
