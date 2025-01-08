import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { startTime, trainerId } = req.body;

    // Convert startTime to Date
    const scheduleDate = new Date(startTime);
    const endTime = new Date(scheduleDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours

    // Check if trainer exists
    const trainer = await prisma.user.findFirst({
      where: { id: trainerId, role: 'TRAINER' },
    });
    if (!trainer) {
      throw new AppError('Trainer not found', 404);
    }

    // Count existing schedules for the day
    const existingSchedules = await prisma.classSchedule.count({
      where: {
        startTime: {
          gte: new Date(scheduleDate.setHours(0, 0, 0, 0)),
          lt: new Date(scheduleDate.setHours(24, 0, 0, 0)),
        },
      },
    });

    if (existingSchedules >= 5) {
      throw new AppError('Maximum daily schedule limit (5) reached', 400);
    }

    // Check for trainer schedule conflict
    const trainerConflict = await prisma.classSchedule.findFirst({
      where: {
        trainerId,
        OR: [
          {
            AND: [
              { startTime: { lte: scheduleDate } },
              { endTime: { gt: scheduleDate } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    if (trainerConflict) {
      throw new AppError('Trainer has conflicting schedule', 400);
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        startTime: scheduleDate,
        endTime,
        trainerId,
      },
      include: {
        trainer: {
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
      message: 'Class schedule created successfully',
      data: schedule,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Error creating schedule', 500);
  }
};

export const getSchedules = async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.classSchedule.findMany({
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookings: {
          select: {
            id: true,
            trainee: {
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
      message: 'Schedules retrieved successfully',
      data: schedules,
    });
  } catch (error) {
    throw new AppError('Error retrieving schedules', 500);
  }
};

export const getTrainerSchedules = async (req: Request, res: Response) => {
  try {
    const trainerId = req.user?.userId;
    
    const schedules = await prisma.classSchedule.findMany({
      where: { trainerId },
      include: {
        bookings: {
          select: {
            id: true,
            trainee: {
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
      message: 'Trainer schedules retrieved successfully',
      data: schedules,
    });
  } catch (error) {
    throw new AppError('Error retrieving trainer schedules', 500);
  }
};
