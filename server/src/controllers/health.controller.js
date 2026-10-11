const prisma = require('../config/prisma');
const { isRedisAvailable } = require('../config/redis');
const { successResponse, errorResponse } = require('../utils/response.util');

const checkHealth = async (req, res, next) => {
  try {
    // Attempt a simple database query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    
    return successResponse(res, 200, 'TaskFlow API is running optimally.', {
      database: 'connected',
      redis: isRedisAvailable() ? 'connected' : 'degraded/bypass_mode',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    return errorResponse(res, 503, 'API is running but Database connection failed.', {
      database: 'disconnected',
      redis: isRedisAvailable() ? 'connected' : 'degraded/bypass_mode'
    });
  }
};

module.exports = {
  checkHealth
};
