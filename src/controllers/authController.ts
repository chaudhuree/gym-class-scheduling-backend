import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma, Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Register trainee (public route)
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create trainee user
    const user = await prisma.user.create({
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
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '24h',
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'User registered successfully',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// Register trainer (admin only)
export const registerTrainer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create trainer user
    const user = await prisma.user.create({
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
  } catch (error) {
    next(error);
  }
};

// Update trainer (admin only)
export const updateTrainer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trainerId } = req.params;
    const { name, email } = req.body;

    // Validate input
    if (!trainerId || (!name && !email)) {
      throw new AppError('Trainer ID and at least one update field are required', 400);
    }

    // Check if trainer exists and is actually a trainer
    const existingTrainer = await prisma.user.findFirst({
      where: {
        id: trainerId,
        role: 'TRAINER',
      },
    });

    if (!existingTrainer) {
      throw new AppError('Trainer not found', 404);
    }

    // Check if new email already exists
    if (email && email !== existingTrainer.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        throw new AppError('Email already in use', 400);
      }
    }

    // Update trainer
    const updatedTrainer = await prisma.user.update({
      where: { id: trainerId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
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
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
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
  } catch (error) {
    next(error);
  }
};

// Logout (invalidate token)
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Since we're using JWT, we just need to send a success response
    // The client should remove the token from their storage
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update Password (logged in user only)
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      throw new AppError('Old password and new password are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid old password', 401);
    } else {
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Update password
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
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
        message: 'Password updated successfully',
        data: { user: updatedUser },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Update Profile (logged in trainee or admin) 
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if new email already exists
    if (email && email !== user.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        throw new AppError('Email already in use', 400);
      }
    }
    // Update profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        email: email || user.email,
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
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Delete user
    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get all users with pagination and optional role filter (admin only)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause based on role, ensuring type safety
    const whereClause = role ? { 
      role: role.toString().toUpperCase() as Role // Cast to Role enum
    } : {};

    const [users, count] = await Promise.all([
      prisma.user.findMany({
        where: whereClause as Prisma.UserWhereInput, // Cast to proper Prisma type
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where: whereClause as Prisma.UserWhereInput })
    ]);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Users${role ? ` with role ${role}` : ''} fetched successfully`,
      data: { users, count }
    });
  } catch (error) {
    next(error);
  }
};

// Get User by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'User fetched successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Get logged in user
export const getLoggedInUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: false,
      },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'User fetched successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};