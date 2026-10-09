const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Routes
const healthRoute = require('./routes/health.route');
const authRoute = require('./routes/auth.route');
const orgRoute = require('./routes/org.route');
const projectRoute = require('./routes/project.route');
const taskRoute = require('./routes/task.route');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Routes
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api/organizations', orgRoute);
app.use('/api/projects', projectRoute);
app.use('/api/tasks', taskRoute);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
