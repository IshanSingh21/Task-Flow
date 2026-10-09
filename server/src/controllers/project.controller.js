const prisma = require('../config/prisma');
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

    return successResponse(res, 201, 'Project created', { project });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const { organizationId } = req.query;
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

    return successResponse(res, 200, 'Projects retrieved', { projects });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.project.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } }
      }
    });

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

    return successResponse(res, 200, 'Project updated', { project });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.project.id } });
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
