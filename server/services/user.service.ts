import { db, users, User } from '../db';
import { eq } from 'drizzle-orm';
import { NotFoundError, ValidationError, ConflictError } from '../utils/auth.errors';

export interface UpdateUserProfile {
  username?: string;
  email?: string;
}

export interface UserPublicInfo {
  id: string;
  email: string;
  username?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

class UserService {
  // Get user by ID
  public async getUserById(userId: string): Promise<UserPublicInfo | null> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    return result[0] || null;
  }

  // Get user by email
  public async getUserByEmail(email: string): Promise<UserPublicInfo | null> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

    return result[0] || null;
  }

  // Get user by username
  public async getUserByUsername(username: string): Promise<UserPublicInfo | null> {
    const result = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

    return result[0] || null;
  }

  // Update user profile
  public async updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<UserPublicInfo> {
    // Get current user
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    const updateData: any = { updatedAt: new Date() };

    // Validate and check email uniqueness
    if (updates.email && updates.email !== currentUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        throw new ValidationError(['Invalid email format']);
      }

      const existingEmail = await this.getUserByEmail(updates.email);
      if (existingEmail) {
        throw new ConflictError('Email already in use');
      }

      updateData.email = updates.email.toLowerCase();
    }

    // Validate and check username uniqueness
    if (updates.username && updates.username !== currentUser.username) {
      if (updates.username.length < 3 || updates.username.length > 255) {
        throw new ValidationError(['Username must be between 3 and 255 characters']);
      }

      // Check for valid username characters (alphanumeric, underscore, dash)
      if (!/^[a-zA-Z0-9_-]+$/.test(updates.username)) {
        throw new ValidationError(['Username can only contain letters, numbers, underscores, and dashes']);
      }

      const existingUsername = await this.getUserByUsername(updates.username);
      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }

      updateData.username = updates.username;
    }

    // Update user
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt
      });

    return updatedUser;
  }

  // Delete user (soft delete could be implemented)
  public async deleteUser(userId: string): Promise<void> {
    const result = await db.delete(users)
      .where(eq(users.id, userId));

    if (result.rowCount === 0) {
      throw new NotFoundError('User not found');
    }
  }

  // Get total user count
  public async getUserCount(): Promise<number> {
    const result = await db.select({ count: users.id })
      .from(users);
    
    return result.length;
  }

  // Check if user exists
  public async userExists(userId: string): Promise<boolean> {
    const result = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result.length > 0;
  }

  // Update last login timestamp
  public async updateLastLogin(userId: string): Promise<void> {
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Get user with password (internal use only)
  public async getUserWithPassword(email: string): Promise<User | null> {
    const result = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return result[0] || null;
  }

  // Batch get users by IDs
  public async getUsersByIds(userIds: string[]): Promise<UserPublicInfo[]> {
    if (userIds.length === 0) {
      return [];
    }

    const result = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt
    })
    .from(users)
    .where(db.sql`${users.id} = ANY(${userIds})`);

    return result;
  }
}

export const userService = new UserService();