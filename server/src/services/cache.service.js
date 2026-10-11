const { redisClient, isRedisAvailable } = require('../config/redis');

/**
 * CacheService wraps Redis interactions to ensure that any Redis failures
 * (network dropouts, crashes, timeouts) fail silently and safely, allowing
 * the application to immediately fall back to the PostgreSQL database.
 */
class CacheService {
  /**
   * Retrieve cached data.
   * Returns null if key does not exist or if Redis is unavailable.
   */
  static async get(key) {
    if (!isRedisAvailable()) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`[Cache Error] Failed to read key "${key}":`, error.message);
      return null;
    }
  }

  /**
   * Set cached data with a time-to-live (TTL) in seconds.
   */
  static async set(key, value, ttlSeconds = 300) {
    if (!isRedisAvailable()) return false;
    try {
      const serialized = JSON.stringify(value);
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      console.warn(`[Cache Error] Failed to write key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Explicitly delete a cached key.
   */
  static async del(key) {
    if (!isRedisAvailable()) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.warn(`[Cache Error] Failed to delete key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Invalidate multiple keys matching a pattern.
   * Uses SCAN instead of KEYS to prevent blocking the Redis event loop in production.
   */
  static async delPattern(pattern) {
    if (!isRedisAvailable()) return false;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
      return true;
    } catch (error) {
      console.warn(`[Cache Error] Failed to delete pattern "${pattern}":`, error.message);
      return false;
    }
  }
}

module.exports = CacheService;
