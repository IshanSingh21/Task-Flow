const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  deleteOrganization,
  addMember,
  getMembers,
  removeMember,
  changeRole,
  leaveOrganization
} = require('../controllers/org.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireOrgRole } = require('../middleware/org.middleware');
const { validateRequest } = require('../validators/auth.validator');
const { createOrgSchema, addMemberSchema, changeRoleSchema } = require('../validators/org.validator');

// All organization routes require authentication
router.use(protect);

router.post('/', validateRequest(createOrgSchema), createOrganization);
router.get('/', getOrganizations);

router.get('/:id', requireOrgRole(['OWNER', 'ADMIN', 'MEMBER']), getOrganizationById);
router.delete('/:id', requireOrgRole(['OWNER']), deleteOrganization);

router.post('/:id/members', requireOrgRole(['OWNER', 'ADMIN']), validateRequest(addMemberSchema), addMember);
router.get('/:id/members', requireOrgRole(['OWNER', 'ADMIN', 'MEMBER']), getMembers);
router.delete('/:id/members/:userId', requireOrgRole(['OWNER', 'ADMIN']), removeMember);
router.patch('/:id/members/:userId/role', requireOrgRole(['OWNER']), validateRequest(changeRoleSchema), changeRole);

router.delete('/:id/leave', requireOrgRole(['OWNER', 'ADMIN', 'MEMBER']), leaveOrganization);

module.exports = router;
