const prisma = require('../config/prisma');
const { errorResponse } = require('../utils/response.util');

const requireOrgRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      const orgId = req.params.id;
      const userId = req.user.id;

      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: orgId
          }
        }
      });

      if (!member) {
        return errorResponse(res, 404, 'Organization not found or access denied');
      }

      if (roles.length && !roles.includes(member.role)) {
        return errorResponse(res, 403, 'Forbidden: Insufficient role permissions');
      }

      req.member = member;
      req.orgId = orgId;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireOrgRole };
