const prisma = require('../config/prisma');
const { errorResponse } = require('../utils/response.util');

const requireProjectAccess = (roles = []) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id;
      const userId = req.user.id;

      if (!projectId) {
         return errorResponse(res, 400, 'Project ID is required');
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, organizationId: true }
      });

      if (!project) {
        return errorResponse(res, 404, 'Project not found');
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: project.organizationId
          }
        }
      });

      if (!member) {
        // Obfuscate existence for security
        return errorResponse(res, 404, 'Project not found or access denied');
      }

      if (roles.length && !roles.includes(member.role)) {
        return errorResponse(res, 403, 'Forbidden: Insufficient role permissions for this project');
      }

      req.project = project;
      req.member = member;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireProjectAccess };
