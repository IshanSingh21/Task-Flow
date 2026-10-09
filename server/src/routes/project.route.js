const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
} = require('../controllers/project.controller');
const { createTask, getTasks } = require('../controllers/task.controller');

const { protect } = require('../middleware/auth.middleware');
const { requireProjectAccess } = require('../middleware/project.middleware');
const { validateRequest } = require('../validators/auth.validator');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');
const { createTaskSchema } = require('../validators/task.validator');

router.use(protect);

router.post('/', validateRequest(createProjectSchema), createProject);
router.get('/', getProjects);

router.get('/:id', requireProjectAccess(['OWNER', 'ADMIN', 'MEMBER']), getProjectById);
router.patch('/:id', requireProjectAccess(['OWNER', 'ADMIN']), validateRequest(updateProjectSchema), updateProject);
router.delete('/:id', requireProjectAccess(['OWNER', 'ADMIN']), deleteProject);

// Nested routes for Tasks
router.post('/:id/tasks', requireProjectAccess(['OWNER', 'ADMIN', 'MEMBER']), validateRequest(createTaskSchema), createTask);
router.get('/:id/tasks', requireProjectAccess(['OWNER', 'ADMIN', 'MEMBER']), getTasks);

module.exports = router;
