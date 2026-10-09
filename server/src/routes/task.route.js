const express = require('express');
const router = express.Router();
const {
  getTaskById,
  updateTask,
  deleteTask
} = require('../controllers/task.controller');

const { protect } = require('../middleware/auth.middleware');
const { requireTaskAccess } = require('../middleware/task.middleware');
const { validateRequest } = require('../validators/auth.validator');
const { updateTaskSchema } = require('../validators/task.validator');

router.use(protect);

router.get('/:id', requireTaskAccess(['OWNER', 'ADMIN', 'MEMBER']), getTaskById);
router.patch('/:id', requireTaskAccess(['OWNER', 'ADMIN', 'MEMBER']), validateRequest(updateTaskSchema), updateTask);
router.delete('/:id', requireTaskAccess(['OWNER', 'ADMIN', 'MEMBER']), deleteTask);

module.exports = router;
