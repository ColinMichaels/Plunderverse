export class AuthError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AuthError {
  public errors: string[];

  constructor(errors: string[], message = 'Validation failed') {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class ConflictError extends AuthError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends AuthError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class TokenExpiredError extends UnauthorizedError {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class AccountLockedError extends ForbiddenError {
  public lockedUntil: Date;

  constructor(lockedUntil: Date, message = 'Account is locked due to too many failed login attempts') {
    super(message);
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
  }
}

export class WeakPasswordError extends ValidationError {
  constructor(errors: string[]) {
    super(errors, 'Password does not meet requirements');
    this.name = 'WeakPasswordError';
  }
}