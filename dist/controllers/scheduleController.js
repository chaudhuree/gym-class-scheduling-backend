"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrainerSchedules = exports.getSchedules = exports.createSchedule = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const createSchedule = async (req, res) => {
    try {
        const { startTime, trainerId } = req.body;
        // Convert startTime to Date
        const scheduleDate = new Date(startTime);
        const endTime = new Date(scheduleDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
        // Check if trainer exists
        const trainer = await prisma_1.default.user.findFirst({
            where: { id: trainerId, role: 'TRAINER' },
        });
        if (!trainer) {
            throw new errorHandler_1.AppError('Trainer not found', 404);
        }
        // Count existing schedules for the day
        const existingSchedules = await prisma_1.default.classSchedule.count({
            where: {
                startTime: {
                    gte: new Date(scheduleDate.setHours(0, 0, 0, 0)),
                    lt: new Date(scheduleDate.setHours(24, 0, 0, 0)),
                },
            },
        });
        if (existingSchedules >= 5) {
            throw new errorHandler_1.AppError('Maximum daily schedule limit (5) reached', 400);
        }
        // Check for trainer schedule conflict
        const trainerConflict = await prisma_1.default.classSchedule.findFirst({
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
            throw new errorHandler_1.AppError('Trainer has conflicting schedule', 400);
        }
        const schedule = await prisma_1.default.classSchedule.create({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error creating schedule', 500);
    }
};
exports.createSchedule = createSchedule;
const getSchedules = async (req, res) => {
    try {
        const schedules = await prisma_1.default.classSchedule.findMany({
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Error retrieving schedules', 500);
    }
};
exports.getSchedules = getSchedules;
const getTrainerSchedules = async (req, res) => {
    var _a;
    try {
        const trainerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const schedules = await prisma_1.default.classSchedule.findMany({
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Error retrieving trainer schedules', 500);
    }
};
exports.getTrainerSchedules = getTrainerSchedules;
