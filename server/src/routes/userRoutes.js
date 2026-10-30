import { Router } from 'express';
import {
  createClient,
  deactivateClient,
  getClient,
  listClients,
  updateClient,
} from '../controllers/usersController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.route('/').post(createClient).get(listClients);
router.route('/:id').get(getClient).put(updateClient);
router.patch('/:id/deactivate', deactivateClient);

export default router;
