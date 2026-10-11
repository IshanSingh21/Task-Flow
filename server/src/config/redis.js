const Redis = require('ioredis');

let redisClient = null;
let isRedisConnected = false;

try {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // Reconnect with cap at 3000ms
      return Math.min(times * 200, 3000);
    },
    // Fail immediately if disconnected rather than queueing commands
    enableOfflineQueue: false,
    connectTimeout: 5000,
    lazyConnect: true // Explicitly connect when needed
  });

  redisClient.on('ready', () => {
    console.log('Redis connected and ready to accept commands.');
    isRedisConnected = true;
  });

  redisClient.on('error', (err) => {
    // Graceful logging without crashing
    if (isRedisConnected) {
      console.warn('[Redis] Connection degraded:', err.message);
    }
    isRedisConnected = false;
  });

  redisClient.on('close', () => {
    isRedisConnected = false;
  });

  // Initiate connection in background
  redisClient.connect().catch((err) => {
    console.warn('[Redis] Initial connection failed. Operating in cache-bypass mode:', err.message);
  });
} catch (error) {
  console.warn('[Redis] Initialization failed:', error.message);
}

module.exports = {
  redisClient,
  isRedisAvailable: () => isRedisConnected && redisClient && redisClient.status === 'ready',
};
