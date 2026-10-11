const CacheService = require('../src/services/cache.service');
const { redisClient } = require('../src/config/redis');

describe('CacheService Fault Tolerance & Operations', () => {
  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit().catch(() => {});
    }
  });
  it('should safely return null when redis is offline or in bypass mode', async () => {
    const val = await CacheService.get('non-existent-key');
    expect(val).toBeNull();
  });

  it('should safely return false on set when redis is offline', async () => {
    const success = await CacheService.set('some-key', { test: true });
    expect(success).toBe(false);
  });

  it('should safely return false on delete operations when redis is offline', async () => {
    const success = await CacheService.del('some-key');
    expect(success).toBe(false);
  });

  it('should safely return false on pattern delete operations when redis is offline', async () => {
    const success = await CacheService.delPattern('user:*');
    expect(success).toBe(false);
  });
});
