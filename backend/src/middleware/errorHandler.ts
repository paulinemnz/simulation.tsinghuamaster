import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:16',message:'Error handler invoked',data:{hypothesisId:'C',errorMessage:err?.message,errorCode:err?.code,errorStack:err?.stack,statusCode:err?.statusCode || 500},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
  // #endregion
  
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Handle database connection errors
  let errorMessage = err.message || 'Internal server error';
  const errorCode = err.code;
  
  if (errorCode === 'ECONNREFUSED') {
    errorMessage = 'Database connection error: Unable to connect to the database. Please ensure PostgreSQL is running and DATABASE_URL is configured correctly.';
  } else if (errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
    errorMessage = 'Database connection error: Unable to reach the database server. Please check your DATABASE_URL configuration.';
  } else if (err.name === 'AggregateError' || (!errorMessage || errorMessage === 'Internal server error')) {
    // Extract message from AggregateError
    const aggregateErr = err as any;
    if (aggregateErr.errors && aggregateErr.errors.length > 0) {
      const firstError = aggregateErr.errors[0];
      if (firstError.code === 'ECONNREFUSED') {
        errorMessage = 'Database connection error: Unable to connect to the database. Please ensure PostgreSQL is running and DATABASE_URL is configured correctly.';
      } else if (firstError.code === 'ENOTFOUND' || firstError.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection error: Unable to reach the database server. Please check your DATABASE_URL configuration.';
      } else {
        errorMessage = firstError.message || 'Database connection error';
      }
    } else if (errorCode === 'ECONNREFUSED') {
      errorMessage = 'Database connection error: Unable to connect to the database. Please ensure PostgreSQL is running and DATABASE_URL is configured correctly.';
    }
  }

  res.status(statusCode).json({
    status,
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};