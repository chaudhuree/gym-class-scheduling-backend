import express from 'express';
import { 
  register, 
  login, 
  logout,
  registerTrainer,
  updateTrainer,
  updatePassword
} from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);

// Admin only routes
router.post('/trainer/register', authenticate, authorize('ADMIN'), registerTrainer);
router.put('/trainer/:trainerId', authenticate, authorize('ADMIN'), updateTrainer);

// Protected routes
router.put('/change-password', authenticate, updatePassword);
export default router;
