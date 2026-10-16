const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const requestIdMiddleware = require('./middleware/requestId.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Route modules
const healthRoute = require('./routes/health.route');
const authRoute = require('./routes/auth.route');
const orgRoute = require('./routes/org.route');
const projectRoute = require('./routes/project.route');
const taskRoute = require('./routes/task.route');

const app = express();

// 1. Traceability: Assign Request ID first to trace through all middlewares
app.use(requestIdMiddleware);

// 2. Security Headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// 3. CORS Configuration
const frontendUrls = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);
const allowedOrigins = frontendUrls.length > 0 ? frontendUrls : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS origin denied'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Test-Rate-Limit']
}));

// 4. Request Size Limits (prevents DoS through large payloads)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 5. Structured Logging
morgan.token('id', (req) => req.id);
morgan.token('client-ip', (req) => req.ip || req.connection.remoteAddress);

if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    // Structured JSON log format for production log forwarders
    app.use(morgan((tokens, req, res) => {
      return JSON.stringify({
        timestamp: tokens.date(req, res, 'iso'),
        requestId: tokens.id(req, res),
        ip: tokens['client-ip'](req, res),
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
        responseTimeMs: Number(tokens['response-time'](req, res)),
        contentLength: tokens.res(req, res, 'content-length')
      });
    }));
  } else {
    // Concise readable format for development
    app.use(morgan(':id :method :url :status :response-time ms - :res[content-length]'));
  }
}

// 6. Global Rate Limiter
app.use('/api', apiLimiter);

// 7. API Versioning (v1 primary, /api backward-compatible alias)
const registerRoutes = (routerPrefix) => {
  app.use(`${routerPrefix}/health`, healthRoute);
  app.use(`${routerPrefix}/auth`, authRoute);
  app.use(`${routerPrefix}/organizations`, orgRoute);
  app.use(`${routerPrefix}/projects`, projectRoute);
  app.use(`${routerPrefix}/tasks`, taskRoute);
};

// Mount version 1 endpoints
registerRoutes('/api/v1');

// Backward compatibility mount
registerRoutes('/api');

// 8. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
