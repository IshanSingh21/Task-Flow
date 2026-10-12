const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Handle request entity too large (payload limits)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Payload too large. Maximum allowed size is 50KB.',
        requestId: req.id
      }
    });
  }

  const status = err.status || 500;
  // Mask 500 errors in production to avoid leaking database or internal details
  const message = (status === 500 && process.env.NODE_ENV === 'production')
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  // Structured error logging
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status,
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  };

  if (process.env.NODE_ENV !== 'test') {
    console.error(JSON.stringify(errorLog));
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      requestId: req.id,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
