import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePassword, login, me } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    });
  },
});

router.post('/login', loginLimiter, login);
router.get('/me', protect, me);
router.patch('/password', protect, changePassword);

export default router;
