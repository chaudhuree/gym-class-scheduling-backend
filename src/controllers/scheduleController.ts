import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import moment from 'moment';

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { startTime, trainerId } = req.body;

    // Convert startTime to Date, ensuring it uses the exact input time
    const scheduleDate = new Date(startTime);
    
    // Calculate end time exactly 2 hours from start time
    const endTime = new Date(scheduleDate.getTime() + 2 * 60 * 60 * 1000);

    // Check if trainer exists
    const trainer = await prisma.user.findFirst({
      where: { 
        id: trainerId, 
        role: 'TRAINER' 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!trainer) {
      throw new AppError(`Trainer not found with ID: ${trainerId}`, 404);
    }

    // Get all schedules for the day to check count and time slots
    const dayStart = moment(scheduleDate).startOf('day').toDate();
    const dayEnd = moment(scheduleDate).endOf('day').toDate();

    const existingSchedules = await prisma.classSchedule.findMany({
      where: {
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      orderBy: {
        startTime: 'asc'
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    // Check if maximum daily schedule limit is reached
    if (existingSchedules.length >= 5) {
      const formattedSchedules = existingSchedules.map(schedule => ({
        startTime: moment(schedule.startTime).format('h:mm A'),
        endTime: moment(schedule.endTime).format('h:mm A')
      }));

      throw new AppError(
        `Maximum daily schedule limit (5) reached for ${moment(scheduleDate).format('YYYY-MM-DD')}. Existing schedules: ${JSON.stringify(formattedSchedules, null, 2)}`,
        400
      );
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
      select: {
        id: true,
        startTime: true,
        endTime: true,
      }
    });

    if (trainerConflict) {
      throw new AppError(
        `Trainer has a conflicting schedule from ${moment(trainerConflict.startTime).format('YYYY-MM-DD HH:mm')} to ${moment(trainerConflict.endTime).format('YYYY-MM-DD HH:mm')}`,
        400
      );
    }

    // Create schedule
    const schedule = await prisma.classSchedule.create({
      data: {
        startTime: scheduleDate,
        endTime: endTime,
        trainerId: trainer.id,
        maxTrainees: 10,
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

    // Get updated count of schedules for the day
    const totalSchedulesForDay = await prisma.classSchedule.count({
      where: {
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    // Format the response with moment
    const formattedSchedule = {
      _id: schedule.id,
      startTime: {
        time: moment(schedule.startTime).format('h:mm A'),
        date: moment(schedule.startTime).format('YYYY-MM-DD'),
        fullDateTime: moment(schedule.startTime).format('YYYY-MM-DD HH:mm:ss')
      },
      endTime: {
        time: moment(schedule.endTime).format('h:mm A'),
        date: moment(schedule.endTime).format('YYYY-MM-DD'),
        fullDateTime: moment(schedule.endTime).format('YYYY-MM-DD HH:mm:ss')
      },
      trainer: schedule.trainer,
      maxTrainees: schedule.maxTrainees,
      schedulesRemainingForDay: 5 - totalSchedulesForDay,
      createdAt: moment(schedule.createdAt).format(),
      updatedAt: moment(schedule.updatedAt).format(),
    };

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Class schedule created successfully',
      data: formattedSchedule,
    });
  } catch (error) {
    console.error('Schedule Creation Error:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Unexpected error occurred while creating schedule',
    });
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
            traineeId: true,
          },
        },
      },
    });

    // Format schedules with moment
    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule.id,
      startTime: moment(schedule.startTime).format('h:mm A'),
      endTime: moment(schedule.endTime).format('h:mm A'),
      trainer: schedule.trainer,
      maxTrainees: schedule.maxTrainees,
      currentBookings: schedule.bookings.length,
      createdAt: moment(schedule.createdAt).format(),
      updatedAt: moment(schedule.updatedAt).format(),
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Schedules retrieved successfully',
      data: formattedSchedules,
    });
  } catch (error) {
    console.error('Get Schedules Error:', error);
    throw new AppError('Error retrieving schedules', 500);
  }
};

export const getTrainerSchedules = async (req: Request, res: Response) => {
  try {
    const { id: trainerId } = req.user;

    const schedules = await prisma.classSchedule.findMany({
      where: { trainerId },
      include: {
        bookings: {
          select: {
            id: true,
            traineeId: true,
          },
        },
      },
    });

    // Format schedules with moment
    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule.id,
      startTime: moment(schedule.startTime).format('h:mm A'),
      endTime: moment(schedule.endTime).format('h:mm A'),
      maxTrainees: schedule.maxTrainees,
      currentBookings: schedule.bookings.length,
      createdAt: moment(schedule.createdAt).format(),
      updatedAt: moment(schedule.updatedAt).format(),
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Trainer schedules retrieved successfully',
      data: formattedSchedules,
    });
  } catch (error) {
    console.error('Get Trainer Schedules Error:', error);
    throw new AppError('Error retrieving trainer schedules', 500);
  }
};
