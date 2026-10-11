const prisma = require('../config/prisma');
const CacheService = require('../services/cache.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createOrganization = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    const org = await prisma.organization.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: true
      }
    });

    // Invalidate user's organization list cache
    await CacheService.del(`user:${userId}:organizations`);

    return successResponse(res, 201, 'Organization created successfully', { organization: org });
  } catch (error) {
    next(error);
  }
};

const getOrganizations = async (req, res, next) => {
  try {
    const cacheKey = `user:${req.user.id}:organizations`;
    
    // Performance Optimization: Check Redis first
    const cachedOrgs = await CacheService.get(cacheKey);
    if (cachedOrgs) {
      res.setHeader('X-Cache', 'HIT');
      return successResponse(res, 200, 'Organizations retrieved (from cache)', { organizations: cachedOrgs });
    }

    // Cache MISS: Query PostgreSQL
    const orgs = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId: req.user.id
          }
        }
      },
      include: {
        members: {
          where: { userId: req.user.id },
          select: { role: true }
        }
      }
    });

    // Cache result with 15-minute TTL
    await CacheService.set(cacheKey, orgs, 900);

    res.setHeader('X-Cache', 'MISS');
    return successResponse(res, 200, 'Organizations retrieved', { organizations: orgs });
  } catch (error) {
    next(error);
  }
};

const getOrganizationById = async (req, res, next) => {
  try {
    const cacheKey = `org:${req.orgId}:details`;

    const cachedOrg = await CacheService.get(cacheKey);
    if (cachedOrg) {
      res.setHeader('X-Cache', 'HIT');
      return successResponse(res, 200, 'Organization details (from cache)', { organization: cachedOrg });
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.orgId },
      include: {
        _count: { select: { members: true, projects: true } }
      }
    });

    // Cache for 10 minutes
    await CacheService.set(cacheKey, org, 600);

    res.setHeader('X-Cache', 'MISS');
    return successResponse(res, 200, 'Organization details', { organization: org });
  } catch (error) {
    next(error);
  }
};

const deleteOrganization = async (req, res, next) => {
  try {
    await prisma.organization.delete({ where: { id: req.orgId } });

    // Invalidate caches for all members who had this org
    await CacheService.delPattern('user:*:organizations');
    await CacheService.del(`org:${req.orgId}:details`);

    return successResponse(res, 200, 'Organization deleted');
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      return errorResponse(res, 404, 'User with this email not found');
    }

    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: userToAdd.id,
          organizationId: req.orgId
        }
      }
    });

    if (existingMember) {
      return errorResponse(res, 400, 'User is already a member');
    }

    const member = await prisma.organizationMember.create({
      data: {
        userId: userToAdd.id,
        organizationId: req.orgId,
        role
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    // Invalidate caches
    await CacheService.del(`user:${userToAdd.id}:organizations`);
    await CacheService.del(`org:${req.orgId}:details`);

    return successResponse(res, 201, 'Member added', { member });
  } catch (error) {
    next(error);
  }
};

const getMembers = async (req, res, next) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.orgId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    return successResponse(res, 200, 'Members retrieved', { members });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return errorResponse(res, 400, 'Cannot remove yourself. Use leave endpoint instead.');
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: req.orgId } }
    });

    if (!targetMember) {
      return errorResponse(res, 404, 'Member not found');
    }

    if (req.member.role === 'ADMIN' && (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN')) {
      return errorResponse(res, 403, 'Admins cannot remove Owners or other Admins');
    }

    await prisma.organizationMember.delete({
      where: { userId_organizationId: { userId, organizationId: req.orgId } }
    });

    // Invalidate caches
    await CacheService.del(`user:${userId}:organizations`);
    await CacheService.del(`org:${req.orgId}:details`);

    return successResponse(res, 200, 'Member removed');
  } catch (error) {
    next(error);
  }
};

const changeRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (userId === req.user.id) {
      return errorResponse(res, 400, 'Cannot change your own role directly');
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: req.orgId } }
    });

    if (!targetMember) {
      return errorResponse(res, 404, 'Member not found');
    }

    await prisma.organizationMember.update({
      where: { userId_organizationId: { userId, organizationId: req.orgId } },
      data: { role }
    });

    // Invalidate caller org list since roles might be displayed there
    await CacheService.del(`user:${userId}:organizations`);

    return successResponse(res, 200, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
};

const leaveOrganization = async (req, res, next) => {
  try {
    if (req.member.role === 'OWNER') {
      const otherOwners = await prisma.organizationMember.count({
        where: { organizationId: req.orgId, role: 'OWNER', NOT: { userId: req.user.id } }
      });
      if (otherOwners === 0) {
        return errorResponse(res, 400, 'You are the only owner. Delete the organization or transfer ownership first.');
      }
    }

    await prisma.organizationMember.delete({
      where: { userId_organizationId: { userId: req.user.id, organizationId: req.orgId } }
    });

    // Invalidate user's organization list and details
    await CacheService.del(`user:${req.user.id}:organizations`);
    await CacheService.del(`org:${req.orgId}:details`);

    return successResponse(res, 200, 'Successfully left organization');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  deleteOrganization,
  addMember,
  getMembers,
  removeMember,
  changeRole,
  leaveOrganization
};
