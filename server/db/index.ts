import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../shared/schema';
import { databaseConfig } from '../config/database.config';

// Create database connection
const sql = neon(databaseConfig.connectionString);

// Create Drizzle ORM instance with schema
export const db = drizzle(sql, { schema });

// Re-export schema types and tables for convenience
export * from '../../shared/schema';

// Database helper functions
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Database connected successfully at:', result[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx);
  });
}

// Utility function to ensure tables are created
export async function ensureTablesExist() {
  try {
    // Test queries to verify tables exist
    await db.select().from(schema.users).limit(0);
    await db.select().from(schema.gameSaves).limit(0);
    await db.select().from(schema.sessions).limit(0);
    console.log('All database tables verified successfully');
    return true;
  } catch (error) {
    console.error('Error verifying database tables:', error);
    console.log('Please run migrations: npm run db:migrate');
    return false;
  }
}