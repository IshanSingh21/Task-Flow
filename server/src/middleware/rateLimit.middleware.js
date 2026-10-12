const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Bypassed in tests unless the x-test-rate-limit header is present to prevent test suite flakiness.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5 : 100, // Small limit for testing if enabled
  skip: (req) => isTest && !req.headers['x-test-rate-limit'],
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again after 15 minutes.'
    }
  }
});

/**
 * Strict limiter for sensitive authentication endpoints (prevent brute-force): 10 attempts per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 3 : 10,
  skip: (req) => isTest && !req.headers['x-test-rate-limit'],
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again after 15 minutes.'
    }
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
