const request = require('supertest');
const app = require('../src/app');
const prismaMock = require('./prismaMock');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/prisma', () => require('./prismaMock'));

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechanged', { expiresIn: '1h' });

describe('Task Management API Endpoints (/api/v1/tasks & /api/v1/projects/:id/tasks)', () => {
  let token;
  const user = { id: '123e4567-e89b-12d3-a456-426614174090', name: 'Task Master', email: 'tasks@example.com' };
  const colleague = { id: '123e4567-e89b-12d3-a456-426614174091', name: 'Colleague', email: 'colleague@example.com' };
  const outsiderId = '123e4567-e89b-12d3-a456-426614174092';
  const orgId = '123e4567-e89b-12d3-a456-426614174000';
  const projectId = '123e4567-e89b-12d3-a456-426614174001';
  const taskId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateToken(user.id);
    prismaMock.user.findUnique.mockResolvedValue(user);
  });

  describe('POST /api/v1/projects/:projectId/tasks', () => {
    it('should create a task with status, priority, and assignee', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'MEMBER' }) // for auth
        .mockResolvedValueOnce({ userId: colleague.id, organizationId: orgId, role: 'MEMBER' }); // for assignee

      const createdTask = {
        id: taskId,
        title: 'Implement Dark Mode',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: colleague.id,
        projectId
      };
      prismaMock.task.create.mockResolvedValue(createdTask);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Implement Dark Mode',
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: colleague.id
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Implement Dark Mode');
    });

    it('should reject task creation when assignee is not an organization member', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'MEMBER' }) // for auth
        .mockResolvedValueOnce(null); // assignee not found in org

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task for outsider',
          priority: 'MEDIUM',
          assigneeId: outsiderId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/assignee is not a member/i);
    });

    it('should return 400 validation error when title is missing', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
      prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          priority: 'HIGH'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:projectId/tasks', () => {
    it('should filter tasks by status, priority, and search keyword', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: projectId, organizationId: orgId });
      prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });

      const mockTasks = [
        { id: taskId, title: 'Search Feature', status: 'IN_PROGRESS', priority: 'URGENT' }
      ];
      prismaMock.task.findMany.mockResolvedValue(mockTasks);
      prismaMock.task.count.mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?status=IN_PROGRESS&priority=URGENT&search=Feature`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tasks).toHaveLength(1);
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          status: 'IN_PROGRESS',
          priority: 'URGENT',
          title: { contains: 'Feature', mode: 'insensitive' }
        })
      }));
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update task status (Kanban drag and drop)', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: taskId,
        project: { organizationId: orgId }
      });
      prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });
      prismaMock.task.update.mockResolvedValue({
        id: taskId,
        status: 'DONE'
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'DONE' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.status).toBe('DONE');
    });

    it('should update task assignee and priority', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: taskId,
        project: { organizationId: orgId }
      });
      prismaMock.organizationMember.findUnique
        .mockResolvedValueOnce({ userId: user.id, organizationId: orgId, role: 'MEMBER' }) // auth check
        .mockResolvedValueOnce({ userId: colleague.id, organizationId: orgId, role: 'MEMBER' }); // assignee check

      prismaMock.task.update.mockResolvedValue({
        id: taskId,
        priority: 'URGENT',
        assigneeId: colleague.id
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ priority: 'URGENT', assigneeId: colleague.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.priority).toBe('URGENT');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task within user organization', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: taskId,
        project: { organizationId: orgId }
      });
      prismaMock.organizationMember.findUnique.mockResolvedValue({ userId: user.id, organizationId: orgId, role: 'MEMBER' });
      prismaMock.task.delete.mockResolvedValue({ id: taskId });

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/task deleted/i);
    });

    it('should deny task deletion if task is in another organization', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: taskId,
        project: { organizationId: 'foreign-org' }
      });
      prismaMock.organizationMember.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
