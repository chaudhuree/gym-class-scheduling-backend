import express from 'express';
import { createBooking, cancelBooking, getTraineeBookings } from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Trainee routes
router.post('/', authenticate, authorize('TRAINEE'), createBooking);
router.delete('/:bookingId', authenticate, authorize('TRAINEE'), cancelBooking);
router.get('/my-bookings', authenticate, authorize('TRAINEE'), getTraineeBookings);

export default router;
