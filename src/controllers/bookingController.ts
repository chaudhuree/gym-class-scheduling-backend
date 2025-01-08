import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.body;
    const traineeId = req.user?.userId;

    if (!traineeId) {
      throw new AppError('User not authenticated', 401);
    }

    // Check if schedule exists and get its time details
    const schedule = await prisma.classSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        bookings: true,
      },
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    // Check booking limit
    if (schedule.bookings.length >= 10) {
      throw new AppError('Class schedule is full. Maximum 10 trainees allowed per schedule.', 400);
    }

    // Check for time conflict
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        traineeId,
        classSchedule: {
          startTime: {
            lte: schedule.endTime,
          },
          endTime: {
            gte: schedule.startTime,
          },
        },
      },
    });

    if (conflictingBooking) {
      throw new AppError('You already have a booking during this time slot', 400);
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        traineeId,
        classScheduleId: scheduleId,
      },
      include: {
        classSchedule: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        trainee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Class booked successfully',
      data: booking,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Error booking class', 500);
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const traineeId = req.user?.userId;

    if (!traineeId) {
      throw new AppError('User not authenticated', 401);
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        traineeId,
      },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Error cancelling booking', 500);
  }
};

export const getTraineeBookings = async (req: Request, res: Response) => {
  try {
    const traineeId = req.user?.userId;

    if (!traineeId) {
      throw new AppError('User not authenticated', 401);
    }

    const bookings = await prisma.booking.findMany({
      where: { traineeId },
      include: {
        classSchedule: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Bookings retrieved successfully',
      data: bookings,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Error retrieving bookings', 500);
  }
};
