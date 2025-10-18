import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, users, User } from '../db';
import { eq, and } from 'drizzle-orm';
import { authConfig, JWTPayload, RefreshTokenPayload, validatePassword } from '../config/auth.config';
import { 
  ValidationError, 
  ConflictError, 
  UnauthorizedError, 
  WeakPasswordError,
  AccountLockedError,
  NotFoundError
} from '../utils/auth.errors';
import { userService } from './user.service';

interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

interface LoginAttempt {
  userId: string;
  attempts: number;
  lockedUntil: Date | null;
}

// In-memory store for login attempts (in production, use Redis or database)
const loginAttempts = new Map<string, LoginAttempt>();

class AuthService {
  // Generate JWT access token
  private generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
      algorithm: 'HS256'
    });
  }

  // Generate refresh token
  private generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.refreshTokenExpiresIn,
      algorithm: 'HS256'
    });
  }

  // Verify JWT token
  public verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, authConfig.jwtSecret) as JWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  // Verify refresh token
  public verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, authConfig.jwtSecret) as RefreshTokenPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  // Check if account is locked
  private checkAccountLock(email: string): void {
    const attempt = loginAttempts.get(email.toLowerCase());
    if (attempt && attempt.lockedUntil) {
      if (attempt.lockedUntil > new Date()) {
        throw new AccountLockedError(attempt.lockedUntil);
      }
      // Lock period expired, reset attempts
      loginAttempts.delete(email.toLowerCase());
    }
  }

  // Record failed login attempt
  private recordFailedAttempt(email: string): void {
    const key = email.toLowerCase();
    const attempt = loginAttempts.get(key) || {
      userId: '',
      attempts: 0,
      lockedUntil: null
    };

    attempt.attempts++;

    if (attempt.attempts >= authConfig.maxLoginAttempts) {
      attempt.lockedUntil = new Date(Date.now() + authConfig.lockoutDuration);
      loginAttempts.set(key, attempt);
      throw new AccountLockedError(attempt.lockedUntil);
    }

    loginAttempts.set(key, attempt);
  }

  // Clear failed attempts on successful login
  private clearFailedAttempts(email: string): void {
    loginAttempts.delete(email.toLowerCase());
  }

  // User registration
  public async register(email: string, password: string, username?: string): Promise<AuthResult> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(['Invalid email format']);
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new WeakPasswordError(passwordValidation.errors);
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check username uniqueness if provided
    if (username) {
      const existingUsername = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUsername.length > 0) {
        throw new ConflictError('Username already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds);

    // Create user
    const [newUser] = await db.insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        username
      })
      .returning();

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username || undefined
    });

    const refreshToken = this.generateRefreshToken({
      userId: newUser.id,
      tokenVersion: 0
    });

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  // User login
  public async login(email: string, password: string): Promise<AuthResult> {
    // Check if account is locked
    this.checkAccountLock(email);

    // Get user by email
    const user = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (user.length === 0) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedError('Invalid credentials');
    }

    const foundUser = user[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isValidPassword) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Clear failed attempts
    this.clearFailedAttempts(email);

    // Update last login timestamp
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, foundUser.id));

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: foundUser.id,
      email: foundUser.email,
      username: foundUser.username || undefined
    });

    const refreshToken = this.generateRefreshToken({
      userId: foundUser.id,
      tokenVersion: 0
    });

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = foundUser;
    
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  // Refresh access token
  public async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = this.verifyRefreshToken(refreshToken);
    
    const user = await userService.getUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username || undefined
    });

    return { accessToken };
  }

  // Verify if token is valid
  public async verifyToken(token: string): Promise<boolean> {
    try {
      const payload = this.verifyAccessToken(token);
      const user = await userService.getUserById(payload.userId);
      return !!user;
    } catch {
      return false;
    }
  }

  // Change password
  public async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new NotFoundError('User not found');
    }

    const foundUser = user[0];

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, foundUser.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid current password');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new WeakPasswordError(passwordValidation.errors);
    }

    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, authConfig.bcryptRounds);
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Request password reset (basic structure)
  public async requestPasswordReset(email: string): Promise<{ resetToken: string }> {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return { resetToken: '' };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      authConfig.jwtSecret,
      { expiresIn: '1h' }
    );

    // In production, send this token via email
    // For now, return it (development only)
    return { resetToken };
  }

  // Reset password with token
  public async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    let payload: any;
    try {
      payload = jwt.verify(resetToken, authConfig.jwtSecret);
    } catch (error: any) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    if (payload.type !== 'password-reset') {
      throw new UnauthorizedError('Invalid reset token');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new WeakPasswordError(passwordValidation.errors);
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, authConfig.bcryptRounds);
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, payload.userId));
  }

  // Logout (clear session if using sessions)
  public async logout(sessionId?: string): Promise<void> {
    // If using sessions, destroy the session
    // This would be handled by the route handler
    // For JWT-only auth, logout is handled client-side
  }
}

export const authService = new AuthService();