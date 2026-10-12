const crypto = require('crypto');

/**
 * Attaches a unique request ID to each incoming request and sets
 * the X-Request-Id header on the response for end-to-end distributed tracing.
 */
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

module.exports = requestIdMiddleware;
