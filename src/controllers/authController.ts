import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

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
