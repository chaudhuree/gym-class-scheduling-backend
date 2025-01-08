"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTraineeBookings = exports.cancelBooking = exports.createBooking = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const createBooking = async (req, res) => {
    var _a;
    try {
        const { scheduleId } = req.body;
        const traineeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!traineeId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        // Check if schedule exists and get its time details
        const schedule = await prisma_1.default.classSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                bookings: true,
            },
        });
        if (!schedule) {
            throw new errorHandler_1.AppError('Schedule not found', 404);
        }
        // Check booking limit
        if (schedule.bookings.length >= 10) {
            throw new errorHandler_1.AppError('Class schedule is full. Maximum 10 trainees allowed per schedule.', 400);
        }
        // Check for time conflict
        const conflictingBooking = await prisma_1.default.booking.findFirst({
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
            throw new errorHandler_1.AppError('You already have a booking during this time slot', 400);
        }
        // Create the booking
        const booking = await prisma_1.default.booking.create({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error booking class', 500);
    }
};
exports.createBooking = createBooking;
const cancelBooking = async (req, res) => {
    var _a;
    try {
        const { bookingId } = req.params;
        const traineeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!traineeId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const booking = await prisma_1.default.booking.findFirst({
            where: {
                id: bookingId,
                traineeId,
            },
        });
        if (!booking) {
            throw new errorHandler_1.AppError('Booking not found', 404);
        }
        await prisma_1.default.booking.delete({
            where: { id: bookingId },
        });
        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Booking cancelled successfully',
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error cancelling booking', 500);
    }
};
exports.cancelBooking = cancelBooking;
const getTraineeBookings = async (req, res) => {
    var _a;
    try {
        const traineeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!traineeId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const bookings = await prisma_1.default.booking.findMany({
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
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error retrieving bookings', 500);
    }
};
exports.getTraineeBookings = getTraineeBookings;
