import { 
  pgTable, 
  uuid, 
  varchar, 
  timestamp, 
  json, 
  integer, 
  text,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  username: varchar('username', { length: 255 }).unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  lastLoginAt: timestamp('last_login_at')
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  usernameIdx: index('username_idx').on(table.username)
}));

// Game saves table for storing game state
export const gameSaves = pgTable('game_saves', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slotNumber: integer('slot_number').notNull(),
  saveName: varchar('save_name', { length: 255 }).notNull(),
  gameState: json('game_state').notNull(),
  playTime: integer('play_time').notNull().default(0),
  credits: integer('credits').notNull().default(0),
  location: varchar('location', { length: 255 }).notNull(),
  shipStatus: json('ship_status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date())
}, (table) => ({
  userSlotUnique: uniqueIndex('user_slot_unique').on(table.userId, table.slotNumber),
  userIdIdx: index('user_id_idx').on(table.userId)
}));

// Sessions table for session management (compatible with express-session)
export const sessions = pgTable('session', {
  sid: varchar('sid').primaryKey(),
  sess: json('sess').notNull(),
  expire: timestamp('expire', { precision: 6 }).notNull()
}, (table) => ({
  expireIdx: index('IDX_session_expire').on(table.expire)
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gameSaves: many(gameSaves)
}));

export const gameSavesRelations = relations(gameSaves, ({ one }) => ({
  user: one(users, {
    fields: [gameSaves.userId],
    references: [users.id]
  })
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  passwordHash: z.string().min(8),
  username: z.string().min(3).max(255).optional()
});

export const selectUserSchema = createSelectSchema(users);

export const insertGameSaveSchema = createInsertSchema(gameSaves, {
  slotNumber: z.number().int().min(1).max(3),
  saveName: z.string().min(1).max(255),
  gameState: z.any(),
  playTime: z.number().int().min(0),
  credits: z.number().int().min(0),
  location: z.string().min(1).max(255),
  shipStatus: z.any()
});

export const selectGameSaveSchema = createSelectSchema(gameSaves);

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GameSave = typeof gameSaves.$inferSelect;
export type NewGameSave = typeof gameSaves.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
