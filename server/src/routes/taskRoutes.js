import { Router } from 'express';
import {
  acknowledgeReminder,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from '../controllers/tasksController.js';
import { createComment, getComments } from '../controllers/commentsController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.route('/').post(authorize('admin'), createTask).get(listTasks);
router
  .route('/:id')
  .get(getTask)
  .put(authorize('admin'), updateTask)
  .delete(authorize('admin'), deleteTask);

router.patch('/:id/status', updateTaskStatus);
// Reminders repeat until the assigned client (or the admin) acknowledges them.
router.patch('/:id/acknowledge-reminder', acknowledgeReminder);
router.route('/:id/comments').get(getComments).post(createComment);

export default router;
