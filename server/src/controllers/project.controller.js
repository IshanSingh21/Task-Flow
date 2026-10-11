const prisma = require('../config/prisma');
const CacheService = require('../services/cache.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createProject = async (req, res, next) => {
  try {
    const { organizationId, name, description } = req.body;

    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId
        }
      }
    });

    if (!member) {
      return errorResponse(res, 403, 'Forbidden: You are not a member of this organization');
    }

    if (member.role === 'MEMBER') {
      return errorResponse(res, 403, 'Forbidden: Insufficient permissions to create a project');
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        organizationId,
        createdById: req.user.id
      }
    });

    // Invalidate project list and org stats
    await CacheService.del(`org:${organizationId}:projects`);
    await CacheService.del(`org:${organizationId}:details`);

    return successResponse(res, 201, 'Project created', { project });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const { organizationId } = req.query;

    // Cache key specific to org if requested
    const cacheKey = organizationId ? `org:${organizationId}:projects` : null;

    if (cacheKey) {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return successResponse(res, 200, 'Projects retrieved (from cache)', { projects: cached });
      }
    }

    let whereClause = {
      organization: {
        members: {
          some: { userId: req.user.id }
        }
      }
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        _count: { select: { tasks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (cacheKey) {
      await CacheService.set(cacheKey, projects, 600); // 10 minutes
    }

    res.setHeader('X-Cache', 'MISS');
    return successResponse(res, 200, 'Projects retrieved', { projects });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const cacheKey = `project:${req.project.id}:details`;

    const cached = await CacheService.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return successResponse(res, 200, 'Project details (from cache)', { project: cached });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.project.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } }
      }
    });

    await CacheService.set(cacheKey, project, 900); // 15 minutes

    res.setHeader('X-Cache', 'MISS');
    return successResponse(res, 200, 'Project details', { project });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const project = await prisma.project.update({
      where: { id: req.project.id },
      data: { name, description }
    });

    // Invalidate caches
    await CacheService.del(`project:${req.project.id}:details`);
    await CacheService.del(`org:${req.project.organizationId}:projects`);

    return successResponse(res, 200, 'Project updated', { project });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.project.id } });

    // Invalidate caches
    await CacheService.del(`project:${req.project.id}:details`);
    await CacheService.del(`org:${req.project.organizationId}:projects`);
    await CacheService.del(`org:${req.project.organizationId}:details`);

    return successResponse(res, 200, 'Project deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
