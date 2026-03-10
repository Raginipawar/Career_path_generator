// src/middleware/logger.ts
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      user: req.user?.userId ?? 'anonymous',
      ip: req.ip,
    };
    
    // Color code by status
    const color =
      res.statusCode >= 500 ? '\x1b[31m' :   // red
      res.statusCode >= 400 ? '\x1b[33m' :   // yellow
      res.statusCode >= 200 ? '\x1b[32m' :   // green
      '\x1b[0m';

    console.log(
      `${color}[${log.timestamp}] ${log.method} ${log.path} → ${log.status} (${duration}ms)\x1b[0m`,
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('  └─', JSON.stringify(log));
    }
  });

  next();
}

// Zod error handler — returns clean validation messages
export function zodErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
    const zodErr = err as { errors: Array<{ path: string[]; message: string }> };
    res.status(400).json({
      error: 'Validation failed',
      details: zodErr.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }
  next(err);
}

// Generic error handler
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`❌ Unhandled error: ${error.message}`, error.stack);
  
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: error.message }),
  });
}
