const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/response.util');

const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    const projectId = req.project.id; // from requireProjectAccess middleware

    // Validate assignee if provided
    if (assigneeId) {
      const assigneeMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: assigneeId,
            organizationId: req.project.organizationId
          }
        }
      });
      if (!assigneeMember) {
        return errorResponse(res, 400, 'Assignee is not a member of the organization');
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        dueDate,
        projectId,
        assigneeId,
        creatorId: req.user.id
      }
    });

    return successResponse(res, 201, 'Task created', { task });
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const projectId = req.project.id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      assigneeId, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const whereClause = { projectId };

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assigneeId) whereClause.assigneeId = assigneeId;
    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const validSortFields = ['createdAt', 'updatedAt', 'dueDate', 'title'];
    const validSortOrders = ['asc', 'desc'];
    
    const orderBy = {};
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } }
        }
      }),
      prisma.task.count({ where: whereClause })
    ]);

    return successResponse(res, 200, 'Tasks retrieved', {
      tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.task.id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      }
    });

    return successResponse(res, 200, 'Task details', { task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    if (assigneeId) {
      const assigneeMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: assigneeId,
            organizationId: req.task.project.organizationId
          }
        }
      });
      if (!assigneeMember) {
        return errorResponse(res, 400, 'Assignee is not a member of the organization');
      }
    }

    const task = await prisma.task.update({
      where: { id: req.task.id },
      data: { title, description, status, priority, assigneeId, dueDate }
    });

    return successResponse(res, 200, 'Task updated', { task });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.task.id } });
    return successResponse(res, 200, 'Task deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
};
