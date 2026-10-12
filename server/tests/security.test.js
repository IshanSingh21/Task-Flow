const request = require('supertest');
const app = require('../src/app');
const prismaMock = require('./prismaMock');
const { redisClient } = require('../src/config/redis');

jest.mock('../src/config/prisma', () => require('./prismaMock'));

describe('Production API Hardening & Security Tests', () => {
  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit().catch(() => {});
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request ID & Traceability', () => {
    it('should inject X-Request-Id header in responses', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const res = await request(app).get('/api/v1/health');
      expect(res.headers).toHaveProperty('x-request-id');
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('should propagate incoming X-Request-Id if provided by upstream proxy', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const customId = 'upstream-proxy-uuid-1234';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', customId);

      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('should include standard security headers', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const res = await request(app).get('/api/v1/health');
      
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers).not.toHaveProperty('x-powered-by');
    });
  });

  describe('API Versioning', () => {
    it('should successfully serve endpoints on /api/v1/*', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const res = await request(app).get('/api/v1/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should maintain backward compatibility on /api/*', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Request Size Limits', () => {
    it('should reject payloads exceeding 50KB with status 413', async () => {
      // Create a payload string that exceeds 50KB
      const largeString = 'a'.repeat(60 * 1024);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: largeString });

      expect(res.statusCode).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/payload too large/i);
      expect(res.body.error).toHaveProperty('requestId');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits and return 429 when threshold exceeded', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      // Fire multiple rapid requests with testing flag
      let rateLimited = false;
      for (let i = 0; i < 7; i++) {
        const res = await request(app)
          .get('/api/v1/health')
          .set('X-Test-Rate-Limit', 'true');

        if (res.statusCode === 429) {
          rateLimited = true;
          expect(res.body.success).toBe(false);
          expect(res.body.error.message).toMatch(/too many requests/i);
          break;
        }
      }

      expect(rateLimited).toBe(true);
    });
  });

  describe('Centralized Error Handling', () => {
    it('should return 404 with requestId on unknown routes', async () => {
      const res = await request(app).get('/api/v1/non-existent-route');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('requestId');
      expect(res.body.error.message).toMatch(/not found/i);
    });
  });
});
