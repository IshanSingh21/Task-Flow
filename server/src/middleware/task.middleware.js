const prisma = require('../config/prisma');
const { errorResponse } = require('../utils/response.util');

const requireTaskAccess = (roles = []) => {
  return async (req, res, next) => {
    try {
      const taskId = req.params.id;
      const userId = req.user.id;

      if (!taskId) {
         return errorResponse(res, 400, 'Task ID is required');
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { project: { select: { organizationId: true } } }
      });

      if (!task) {
        return errorResponse(res, 404, 'Task not found');
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: task.project.organizationId
          }
        }
      });

      if (!member) {
        return errorResponse(res, 404, 'Task not found or access denied');
      }

      if (roles.length && !roles.includes(member.role)) {
        return errorResponse(res, 403, 'Forbidden: Insufficient role permissions for this task');
      }

      req.task = task;
      req.member = member;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireTaskAccess };
