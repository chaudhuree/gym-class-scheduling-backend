import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import moment from 'moment';

// Create schedule
export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { startTime, trainerId } = req.body;

    // Convert startTime to Date, ensuring it uses the exact input time
    const scheduleDate = new Date(startTime);
    // Check if startTime is not past
    if (scheduleDate < new Date()) {
      throw new AppError('Start time cannot be in the past', 400);
    }
    
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

// Get all schedules
export const getSchedules = async (req: Request, res: Response) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const totalCount = await prisma.classSchedule.count();

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
      orderBy: {
        startTime: 'asc'
      },
      skip,
      take: limit
    });

    // Format schedules with moment
    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule.id,
      startTime: {
        time: moment(schedule.startTime).format('h:mm A'),
        date: moment(schedule.startTime).format('YYYY-MM-DD')
      },
      endTime: {
        time: moment(schedule.endTime).format('h:mm A'),
        date: moment(schedule.endTime).format('YYYY-MM-DD')
      },
      trainer: schedule.trainer,
      maxTrainees: schedule.maxTrainees,
      currentBookings: schedule.bookings.length,
      availableSlots: schedule.maxTrainees - schedule.bookings.length,
      isPast: moment(schedule.endTime).isBefore(new Date()),
      createdAt: moment(schedule.createdAt).format(),
      updatedAt: moment(schedule.updatedAt).format()
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Schedules retrieved successfully',
      data: {
        schedules: formattedSchedules,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get Schedules Error:', error);
    
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
      message: 'Unexpected error occurred while retrieving schedules',
    });
  }
};

// Get trainer schedules
export const getTrainerSchedules = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const trainerId = req.user.userId;

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const totalCount = await prisma.classSchedule.count({
      where: { trainerId }
    });

    const schedules = await prisma.classSchedule.findMany({
      where: { trainerId },
      include: {
        bookings: {
          select: {
            id: true,
            traineeId: false,
          },
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      skip,
      take: limit
    });

    // Format schedules with moment
    const formattedSchedules = schedules.map(schedule => ({
      _id: schedule.id,
      startTime: {
        time: moment(schedule.startTime).format('h:mm A'),
        date: moment(schedule.startTime).format('YYYY-MM-DD')
      },
      endTime: {
        time: moment(schedule.endTime).format('h:mm A'),
        date: moment(schedule.endTime).format('YYYY-MM-DD')
      },
      maxTrainees: schedule.maxTrainees,
      currentBookings: schedule.bookings.length,
      availableSlots: schedule.maxTrainees - schedule.bookings.length,
      isPast: moment(schedule.endTime).isBefore(new Date()),
      createdAt: moment(schedule.createdAt).format(),
      updatedAt: moment(schedule.updatedAt).format()
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Trainer schedules retrieved successfully',
      data: {
        schedules: formattedSchedules,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get Trainer Schedules Error:', error);
    
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
      message: 'Unexpected error occurred while retrieving trainer schedules',
    });
  }
};

// Delete schedule
export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = req.params.id;
    // check if schedule exists
    const schedule = await prisma.classSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }
    await prisma.classSchedule.delete({
      where: { id: scheduleId },
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete Schedule Error:', error);
    
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
      message: 'Unexpected error occurred while deleting schedule',
    });
  }
};

// Update schedule
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = req.params.id;
    const { startTime } = req.body;

    if (startTime) {
      const startTimeDate = new Date(startTime);
      // Validate if start time is in the past
      if (startTimeDate < new Date()) {
        throw new AppError('Start time cannot be in the past', 400);
      }

      // Calculate end time (2 hours after start time)
      const endTimeDate = new Date(startTimeDate.getTime() + 2 * 60 * 60 * 1000);

      // Check for overlapping schedules
      const existingSchedule = await prisma.classSchedule.findFirst({
        where: {
          AND: [
            { id: { not: scheduleId } }, // Exclude current schedule
            {
              OR: [
                // New schedule starts during an existing schedule
                {
                  AND: [
                    { startTime: { lte: startTimeDate } },
                    { endTime: { gt: startTimeDate } }
                  ]
                },
                // New schedule ends during an existing schedule
                {
                  AND: [
                    { startTime: { lt: endTimeDate } },
                    { endTime: { gte: endTimeDate } }
                  ]
                },
                // New schedule completely contains an existing schedule
                {
                  AND: [
                    { startTime: { gte: startTimeDate } },
                    { endTime: { lte: endTimeDate } }
                  ]
                }
              ]
            }
          ]
        }
      });

      if (existingSchedule) {
        throw new AppError('Schedule overlaps with an existing schedule', 400);
      }

      // Add end time to request body
      req.body.endTime = endTimeDate;
    }
    
    const updatedSchedule = await prisma.classSchedule.update({
      where: { id: scheduleId },
      data: req.body,
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

    // Format the response
    const formattedSchedule = {
      _id: updatedSchedule.id,
      startTime: {
        time: moment(updatedSchedule.startTime).format('h:mm A'),
        date: moment(updatedSchedule.startTime).format('YYYY-MM-DD')
      },
      endTime: {
        time: moment(updatedSchedule.endTime).format('h:mm A'),
        date: moment(updatedSchedule.endTime).format('YYYY-MM-DD')
      },
      trainer: updatedSchedule.trainer,
      maxTrainees: updatedSchedule.maxTrainees,
      currentBookings: updatedSchedule.bookings.length,
      availableSlots: updatedSchedule.maxTrainees - updatedSchedule.bookings.length,
      isPast: moment(updatedSchedule.endTime).isBefore(new Date()),
      createdAt: moment(updatedSchedule.createdAt).format(),
      updatedAt: moment(updatedSchedule.updatedAt).format()
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Schedule updated successfully',
      data: formattedSchedule,
    });
  } catch (error) {
    console.error('Update Schedule Error:', error);
    
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
      message: 'Unexpected error occurred while updating schedule',
    });
  }
};