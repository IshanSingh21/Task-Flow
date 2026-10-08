const request = require('supertest');
const app = require('../src/app');
const prismaMock = require('./prismaMock');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/prisma', () => require('./prismaMock'));

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechanged', { expiresIn: '1h' });

describe('Organization API Endpoints', () => {
  let token;
  let user;
  const orgId = 'org-1';

  beforeEach(() => {
    jest.clearAllMocks();
    user = { id: '1', name: 'Test User', email: 'test@example.com' };
    token = generateToken(user.id);

    // Mock auth middleware user fetching
    prismaMock.user.findUnique.mockResolvedValue(user);
  });

  describe('POST /api/organizations', () => {
    it('should create an organization and assign OWNER role', async () => {
      prismaMock.organization.create.mockResolvedValue({
        id: orgId,
        name: 'My Org',
        members: [{ userId: user.id, role: 'OWNER' }]
      });

      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Org' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.name).toBe('My Org');
      expect(prismaMock.organization.create).toHaveBeenCalled();
    });
  });

  describe('GET /api/organizations/:id (Access & Member Restrictions)', () => {
    it('should allow access if user is a member', async () => {
      prismaMock.organizationMember.findUnique.mockResolvedValue({
        userId: user.id,
        organizationId: orgId,
        role: 'MEMBER'
      });
      prismaMock.organization.findUnique.mockResolvedValue({ id: orgId, name: 'My Org' });

      const res = await request(app)
        .get(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });

    it('should prevent access if user is not a member', async () => {
      prismaMock.organizationMember.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not found or access denied/i);
    });
  });

  describe('POST /api/organizations/:id/members (Admin Permissions & Member Restrictions)', () => {
    const newUserEmail = 'new@example.com';
    const newUserId = '2';

    beforeEach(() => {
      prismaMock.user.findUnique.mockImplementation((args) => {
        if (args.where.email === newUserEmail) return Promise.resolve({ id: newUserId, email: newUserEmail });
        return Promise.resolve(user); // Auth middleware call
      });
    });

    it('should allow ADMIN to add a member', async () => {
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'ADMIN' }) // Check caller role
        .mockResolvedValueOnce(null); // Check if new user is already member
      
      prismaMock.organizationMember.create.mockResolvedValue({ userId: newUserId, role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newUserEmail, role: 'MEMBER' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
    });

    it('should prevent MEMBER from adding a member', async () => {
      prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newUserEmail, role: 'MEMBER' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/forbidden/i);
    });
  });

  describe('DELETE /api/organizations/:id/members/:userId (Removing Members)', () => {
    it('should allow OWNER to remove an ADMIN', async () => {
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'OWNER' }) // Caller
        .mockResolvedValueOnce({ userId: '2', organizationId: orgId, role: 'ADMIN' }); // Target

      prismaMock.organizationMember.delete.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .delete(`/api/organizations/${orgId}/members/2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });

    it('should prevent ADMIN from removing another ADMIN or OWNER', async () => {
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'ADMIN' }) // Caller
        .mockResolvedValueOnce({ userId: '2', organizationId: orgId, role: 'OWNER' }); // Target

      const res = await request(app)
        .delete(`/api/organizations/${orgId}/members/2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.message).toMatch(/admins cannot remove owners/i);
    });
  });

  describe('PATCH /api/organizations/:id/members/:userId/role (Role Changes)', () => {
    it('should allow OWNER to change role', async () => {
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'OWNER' }) // Caller
        .mockResolvedValueOnce({ userId: '2', organizationId: orgId, role: 'MEMBER' }); // Target

      prismaMock.organizationMember.update.mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/organizations/${orgId}/members/2/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });

    it('should prevent ADMIN from changing roles', async () => {
      prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'ADMIN' });

      const res = await request(app)
        .patch(`/api/organizations/${orgId}/members/2/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.statusCode).toEqual(403);
    });
  });
});
