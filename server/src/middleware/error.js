import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Something went wrong on the server.';
  let details;

  if (error.name === 'ValidationError') {
    statusCode = 422;
    message = 'Please check the submitted fields.';
    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    message =
      field === 'email'
        ? 'A user with this email already exists.'
        : `A record with that ${field} already exists.`;
  } else if (error.name === 'CastError') {
    statusCode = 404;
    message = 'The requested resource was not found.';
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body contains invalid JSON.';
  }

  if (statusCode >= 500) {
    console.error('[TaskPulse] Unhandled error:', error);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}
