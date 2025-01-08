import express from 'express';
import { 
  register, 
  login, 
  logout,
  registerTrainer,
  updateTrainer,
  updatePassword,
  updateProfile,
  deleteUser,
  getAllUsers,
  getUserById,
  getLoggedInUser
} from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);

// Admin only routes
router.post('/trainer/register', authenticate, authorize('ADMIN'), registerTrainer);
router.get('/users', authenticate, authorize('ADMIN'), getAllUsers);
router.put('/trainer/:trainerId', authenticate, authorize('ADMIN'), updateTrainer);
router.delete('/user/:userId', authenticate, authorize('ADMIN'), deleteUser);
router.get('/user/:userId', authenticate, authorize('ADMIN'), getUserById);

// Protected routes
router.put('/change-password', authenticate, updatePassword);
router.get('/profile', authenticate, getLoggedInUser);

// Trainee or Admin only routes
router.put('/update-profile', authenticate, authorize('TRAINEE', 'ADMIN'), updateProfile);

export default router;
