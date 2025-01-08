import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError | PrismaClientKnownRequestError | PrismaClientValidationError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode
    });
  }

  // Handle Prisma Errors
  if (err instanceof PrismaClientKnownRequestError) {
    // Handle specific Prisma errors
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'A record with this value already exists',
          statusCode: 400
        });
      case 'P2025': // Record not found
        return res.status(404).json({
          success: false,
          message: 'Record not found',
          statusCode: 404
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Database operation failed',
          statusCode: 400
        });
    }
  }

  if (err instanceof PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
      statusCode: 400
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      statusCode: 400
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      statusCode: 401
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      statusCode: 401
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    statusCode: 500
  });
};
