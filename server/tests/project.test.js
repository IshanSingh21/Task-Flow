const request = require('supertest');
const app = require('../src/app');
const prismaMock = require('./prismaMock');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/prisma', () => require('./prismaMock'));

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechanged', { expiresIn: '1h' });

describe('Project & Task Management API Endpoints', () => {
  let token;
  const user = { id: 'u1', name: 'Test User', email: 'test@example.com' };
  const orgId = '123e4567-e89b-12d3-a456-426614174000';
  const projectId = '123e4567-e89b-12d3-a456-426614174001';
  const taskId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateToken(user.id);
    prismaMock.user.findUnique.mockResolvedValue(user);
  });

  describe('Project Endpoints', () => {
    describe('POST /api/projects', () => {
      it('should create a project successfully for an org member', async () => {
        prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'ADMIN' });
        prismaMock.project.create.mockResolvedValue({ id: projectId, name: 'New Proj', organizationId: orgId });

        const res = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'New Proj', organizationId: orgId });

        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBe(true);
      });

      it('should block project creation for unauthorized orgs', async () => {
        prismaMock.organizationMember.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'New Proj', organizationId: '123e4567-e89b-12d3-a456-426614174003' });

        expect(res.statusCode).toEqual(403);
      });
    });

    describe('GET /api/projects/:id', () => {
      it('should allow access to projects within users organization', async () => {
        prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
        prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });

        const res = await request(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
      });

      it('should deny access to projects outside users organization', async () => {
        prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: 'other-org' });
        prismaMock.organizationMember.findUnique.mockResolvedValue(null); // Not a member of other-org

        const res = await request(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(404);
      });
    });
  });

  describe('Task Endpoints', () => {
    describe('POST /api/projects/:id/tasks', () => {
      it('should create a task in a project', async () => {
        prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
        prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });
        prismaMock.task.create.mockResolvedValue({ id: taskId, title: 'New Task', projectId });

        const res = await request(app)
          .post(`/api/projects/${projectId}/tasks`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'New Task', status: 'TODO', priority: 'HIGH' });

        expect(res.statusCode).toEqual(201);
      });
    });

    describe('GET /api/projects/:id/tasks (Filtering & Pagination)', () => {
      it('should retrieve tasks with filters', async () => {
        prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
        prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });
        
        prismaMock.task.findMany.mockResolvedValue([{ id: taskId, title: 'Task 1' }]);
        prismaMock.task.count.mockResolvedValue(1);

        const res = await request(app)
          .get(`/api/projects/${projectId}/tasks?status=TODO&priority=HIGH&page=1&limit=5`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.pagination.total).toBe(1);
        expect(prismaMock.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({ status: 'TODO', priority: 'HIGH' })
        }));
      });
    });

    describe('GET /api/tasks/:id', () => {
      it('should allow accessing tasks from own organization', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ id: taskId, project: { organizationId: orgId } });
        prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });

        const res = await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
      });

      it('should prevent accessing tasks from other organizations', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ id: taskId, project: { organizationId: 'other-org' } });
        prismaMock.organizationMember.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(404);
      });
    });
  });
});
