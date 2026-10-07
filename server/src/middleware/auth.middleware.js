const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { errorResponse } = require('../utils/response.util');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbechanged');
    
    // Find user, excluding password
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return errorResponse(res, 401, 'Not authorized, user not found');
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 401, 'Not authorized, token failed');
  }
};

module.exports = { protect };
