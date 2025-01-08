import express from 'express';
import { createSchedule, getSchedules, getTrainerSchedules,deleteSchedule, updateSchedule } from '../controllers/scheduleController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Admin routes
router.post('/', authenticate, authorize('ADMIN'), createSchedule);
router.put('/:id', authenticate, authorize('ADMIN'), updateSchedule);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSchedule);
// Protected routes (for TRAINEE)
router.get('/', authenticate, getSchedules);

// Trainer routes
router.get('/trainer', authenticate, authorize('TRAINER'), getTrainerSchedules);

export default router;
