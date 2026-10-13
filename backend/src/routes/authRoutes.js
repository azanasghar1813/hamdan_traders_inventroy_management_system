const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { loginUser, registerUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Throttling for login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Optional protect middleware so it extracts req.user if a token is provided
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

router.post('/login', loginLimiter, loginUser);
router.post('/register', optionalProtect, registerUser);
router.get('/me', protect, getMe);

module.exports = router;
