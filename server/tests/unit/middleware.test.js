const jwt = require('jsonwebtoken');
const { protect } = require('../../src/middleware/auth.middleware');
const { requireOrgRole } = require('../../src/middleware/org.middleware');
const { errorHandler, notFoundHandler } = require('../../src/middleware/error.middleware');
const prismaMock = require('../prismaMock');

jest.mock('../../src/config/prisma', () => require('../prismaMock'));

describe('Unit Tests: Middleware & Security Rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('protect (Authentication Middleware)', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: expect.stringMatching(/not authorized/i) })
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid or malformed', async () => {
      const req = { headers: { authorization: 'Bearer invalid-token-string' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach req.user and call next when token is valid', async () => {
      const mockUser = { id: 'user-123', name: 'Alice', email: 'alice@example.com' };
      const secret = process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechanged';
      const token = jwt.sign({ id: mockUser.id }, secret);

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await protect(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireOrgRole (Role-Based Access Control)', () => {
    it('should return 403 when user is not a member of the organization', async () => {
      prismaMock.organizationMember.findUnique.mockResolvedValue(null);

      const req = {
        user: { id: 'u1' },
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireOrgRole(['OWNER', 'ADMIN']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user has insufficient role permissions', async () => {
      prismaMock.organizationMember.findUnique.mockResolvedValue({
        userId: 'u1',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'MEMBER'
      });

      const req = {
        user: { id: 'u1' },
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = requireOrgRole(['OWNER', 'ADMIN']);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access and call next when user role is authorized', async () => {
      const mockMember = {
        userId: 'u1',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'ADMIN'
      };
      prismaMock.organizationMember.findUnique.mockResolvedValue(mockMember);

      const req = {
        user: { id: 'u1' },
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireOrgRole(['ADMIN']);
      await middleware(req, res, next);

      expect(req.member).toEqual(mockMember);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handling Middleware', () => {
    it('notFoundHandler should create a 404 error and invoke next', () => {
      const req = { originalUrl: '/unknown-route' };
      const res = {};
      const next = jest.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        status: 404,
        message: expect.stringMatching(/not found/i)
      }));
    });

    it('errorHandler should handle payload too large error with status 413', () => {
      const err = { type: 'entity.too.large' };
      const req = { id: 'req-1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ requestId: 'req-1' })
      }));
    });
  });
});
