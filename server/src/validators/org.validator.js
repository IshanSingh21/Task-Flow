const { z } = require('zod');

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters')
});

const addMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

const changeRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER'])
});

module.exports = {
  createOrgSchema,
  addMemberSchema,
  changeRoleSchema
};
