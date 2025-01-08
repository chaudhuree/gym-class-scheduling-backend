"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.login = exports.updateTrainer = exports.registerTrainer = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
// Register trainee (public route)
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Check if user already exists
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new errorHandler_1.AppError('User already exists with this email', 400);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create trainee user
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'TRAINEE', // Auto-assign TRAINEE role
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: '24h',
        });
        return res.status(201).json({
            success: true,
            statusCode: 201,
            message: 'User registered successfully',
            data: { user, token },
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error registering user', 500);
    }
};
exports.register = register;
// Register trainer (admin only)
const registerTrainer = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Check if user already exists
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new errorHandler_1.AppError('User already exists with this email', 400);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create trainer user
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'TRAINER',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        return res.status(201).json({
            success: true,
            statusCode: 201,
            message: 'Trainer registered successfully',
            data: { user },
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error registering trainer', 500);
    }
};
exports.registerTrainer = registerTrainer;
// Update trainer (admin only)
const updateTrainer = async (req, res) => {
    try {
        const { trainerId } = req.params;
        const { name, email } = req.body;
        // Check if trainer exists and is actually a trainer
        const existingTrainer = await prisma_1.default.user.findFirst({
            where: {
                id: trainerId,
                role: 'TRAINER',
            },
        });
        if (!existingTrainer) {
            throw new errorHandler_1.AppError('Trainer not found', 404);
        }
        // Update trainer
        const updatedTrainer = await prisma_1.default.user.update({
            where: { id: trainerId },
            data: {
                name,
                email,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Trainer updated successfully',
            data: { user: updatedTrainer },
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error updating trainer', 500);
    }
};
exports.updateTrainer = updateTrainer;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid credentials', 401);
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            throw new errorHandler_1.AppError('Invalid credentials', 401);
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: '24h',
        });
        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                token,
            },
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError)
            throw error;
        throw new errorHandler_1.AppError('Error logging in', 500);
    }
};
exports.login = login;
// Logout (invalidate token)
const logout = async (req, res) => {
    try {
        // Note: Since we're using JWT, we don't need to do anything server-side
        // The client should remove the token from their storage
        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        throw new errorHandler_1.AppError('Error logging out', 500);
    }
};
exports.logout = logout;
