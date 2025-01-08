import express from 'express';
import { createSchedule, getSchedules, getTrainerSchedules } from '../controllers/scheduleController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Admin routes
router.post('/', authenticate, authorize('ADMIN'), createSchedule);
// Protected routes (for TRAINEE)
router.get('/', authenticate, getSchedules);

// Trainer routes
router.get('/trainer', authenticate, authorize('TRAINER'), getTrainerSchedules);

export default router;
