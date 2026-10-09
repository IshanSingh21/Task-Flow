const { z } = require('zod');

const createProjectSchema = z.object({
  organizationId: z.string().uuid('Valid organization ID is required'),
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional().nullable()
});

const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').optional(),
  description: z.string().optional().nullable()
});

module.exports = { createProjectSchema, updateProjectSchema };
