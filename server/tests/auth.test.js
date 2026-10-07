const request = require('supertest');
const app = require('../src/app');
const prismaMock = require('./prismaMock');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/prisma', () => require('./prismaMock'));

describe('Auth API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validRegistrationUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        name: validRegistrationUser.name,
        email: validRegistrationUser.email,
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user.email).toBe(validRegistrationUser.email);
    });

    it('should prevent duplicate email registration', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: validRegistrationUser.email });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationUser);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already exists/i);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationUser, email: 'notanemail' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details[0].message).toMatch(/invalid email/i);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationUser, password: 'weak' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash(validRegistrationUser.password, 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        name: validRegistrationUser.name,
        email: validRegistrationUser.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validRegistrationUser.email,
          password: validRegistrationUser.password
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject login with incorrect password', async () => {
      const hashedPassword = await bcrypt.hash(validRegistrationUser.password, 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: validRegistrationUser.email,
        password: hashedPassword
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validRegistrationUser.email,
          password: 'WrongPassword1'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it('should reject login for nonexistent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data for valid token (protected endpoint)', async () => {
      const token = jwt.sign({ id: '1' }, process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechanged', { expiresIn: '1h' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/no token/i);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/token failed/i);
    });
  });
});
