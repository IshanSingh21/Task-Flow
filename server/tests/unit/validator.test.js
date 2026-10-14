const { registerSchema, loginSchema } = require('../../src/validators/auth.validator');
const { createOrgSchema, addMemberSchema, changeRoleSchema } = require('../../src/validators/org.validator');
const { createProjectSchema, updateProjectSchema } = require('../../src/validators/project.validator');
const { createTaskSchema, updateTaskSchema } = require('../../src/validators/task.validator');

describe('Unit Tests: Zod Request Validation Schemas', () => {
  describe('Authentication Validators', () => {
    it('should validate a valid registration payload', () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123'
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject registration with invalid email', () => {
      const payload = {
        name: 'Jane Doe',
        email: 'invalid-email-string',
        password: 'Password123'
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject registration with weak password (< 8 chars or no numbers/letters)', () => {
      const result1 = registerSchema.safeParse({ name: 'Jane', email: 'j@ex.com', password: 'short' });
      expect(result1.success).toBe(false);

      const result2 = registerSchema.safeParse({ name: 'Jane', email: 'j@ex.com', password: 'allletterslong' });
      expect(result2.success).toBe(false);
    });

    it('should reject login payload with missing fields', () => {
      const result = loginSchema.safeParse({ email: 'j@ex.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('Organization Validators', () => {
    it('should validate valid organization creation', () => {
      const result = createOrgSchema.safeParse({ name: 'Acme Corp' });
      expect(result.success).toBe(true);
    });

    it('should reject organization creation with empty or short name', () => {
      const result = createOrgSchema.safeParse({ name: 'A' });
      expect(result.success).toBe(false);
    });

    it('should validate adding member with valid role', () => {
      const result = addMemberSchema.safeParse({ email: 'colleague@example.com', role: 'ADMIN' });
      expect(result.success).toBe(true);
    });

    it('should reject adding member with invalid role', () => {
      const result = addMemberSchema.safeParse({ email: 'colleague@example.com', role: 'SUPERUSER' });
      expect(result.success).toBe(false);
    });

    it('should reject role update with invalid role enum', () => {
      const result = changeRoleSchema.safeParse({ role: 'GUEST' });
      expect(result.success).toBe(false);
    });
  });

  describe('Project Validators', () => {
    it('should validate valid project creation', () => {
      const result = createProjectSchema.safeParse({
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Web Redesign',
        description: 'Frontend overhaul'
      });
      expect(result.success).toBe(true);
    });

    it('should reject project creation with non-uuid organizationId', () => {
      const result = createProjectSchema.safeParse({
        organizationId: 'not-a-valid-uuid',
        name: 'Web Redesign'
      });
      expect(result.success).toBe(false);
    });

    it('should validate project update with optional fields', () => {
      const result = updateProjectSchema.safeParse({ name: 'Renamed Project' });
      expect(result.success).toBe(true);
    });
  });

  describe('Task Validators', () => {
    it('should validate valid task creation', () => {
      const result = createTaskSchema.safeParse({
        title: 'Design API contracts',
        priority: 'HIGH',
        status: 'TODO'
      });
      expect(result.success).toBe(true);
    });

    it('should reject task creation with missing title', () => {
      const result = createTaskSchema.safeParse({
        priority: 'HIGH'
      });
      expect(result.success).toBe(false);
    });

    it('should reject task creation with invalid status enum', () => {
      const result = createTaskSchema.safeParse({
        title: 'Fix bug',
        status: 'IN_TESTING'
      });
      expect(result.success).toBe(false);
    });

    it('should reject task creation with invalid priority enum', () => {
      const result = createTaskSchema.safeParse({
        title: 'Fix bug',
        priority: 'CRITICAL'
      });
      expect(result.success).toBe(false);
    });

    it('should validate partial task updates', () => {
      const result = updateTaskSchema.safeParse({
        status: 'DONE'
      });
      expect(result.success).toBe(true);
    });
  });
});
