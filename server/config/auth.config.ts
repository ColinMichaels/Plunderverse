import { z } from 'zod';
import crypto from 'crypto';

// Auth configuration schema
const authConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string(),
  refreshTokenExpiresIn: z.string(),
  sessionSecret: z.string().min(32),
  sessionCookieName: z.string(),
  sessionMaxAge: z.number(),
  bcryptRounds: z.number().min(10).max(15),
  passwordMinLength: z.number().min(8),
  maxLoginAttempts: z.number().min(1),
  lockoutDuration: z.number().min(60000),
  cors: z.object({
    origin: z.string(),
    credentials: z.boolean()
  })
});

// Type for auth configuration
export type AuthConfig = z.infer<typeof authConfigSchema>;

// Generate a default secret if none provided (development only)
function generateDefaultSecret(name: string): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production environment`);
  }
  
  // Generate a consistent secret for development based on the name
  return crypto.createHash('sha256').update(`dev-secret-${name}`).digest('hex');
}

// Load and validate configuration from environment variables
function loadAuthConfig(): AuthConfig {
  const config = {
    jwtSecret: process.env.JWT_SECRET || generateDefaultSecret('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    sessionSecret: process.env.SESSION_SECRET || generateDefaultSecret('SESSION_SECRET'),
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'plunderverse.sid',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours in milliseconds
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes in milliseconds
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
      credentials: true
    }
  };

  try {
    return authConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Auth configuration error:', error.errors);
      throw new Error(`Invalid auth configuration: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Export the configuration
export const authConfig = loadAuthConfig();

// Session configuration for express-session
export function getSessionConfig() {
  return {
    secret: authConfig.sessionSecret,
    name: authConfig.sessionCookieName,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: authConfig.sessionMaxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const
    }
  };
}

// Password validation rules
export function getPasswordRules() {
  return {
    minLength: authConfig.passwordMinLength,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  };
}

// Validate password against rules
export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  const rules = getPasswordRules();

  if (password.length < rules.minLength) {
    errors.push(`Password must be at least ${rules.minLength} characters long`);
  }

  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (rules.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// JWT token payload types
export interface JWTPayload {
  userId: string;
  email: string;
  username?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}