import { z } from 'zod';

// Database configuration schema
const databaseConfigSchema = z.object({
  connectionString: z.string().url(),
  maxConnections: z.number().min(1).max(100),
  idleTimeout: z.number().min(0),
  connectionTimeout: z.number().min(1000),
  enableLogging: z.boolean(),
  ssl: z.object({
    rejectUnauthorized: z.boolean()
  }).optional()
});

// Type for database configuration
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// Load and validate configuration from environment variables
function loadDatabaseConfig(): DatabaseConfig {
  const config = {
    connectionString: process.env.DATABASE_URL || '',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    enableLogging: process.env.DB_ENABLE_LOGGING === 'true' || process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false }
      : undefined
  };

  try {
    return databaseConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Database configuration error:', error.errors);
      throw new Error(`Invalid database configuration: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Export the configuration
export const databaseConfig = loadDatabaseConfig();

// Helper to check if database is configured
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Get connection pool settings for production
export function getPoolSettings() {
  return {
    max: databaseConfig.maxConnections,
    idleTimeoutMillis: databaseConfig.idleTimeout,
    connectionTimeoutMillis: databaseConfig.connectionTimeout,
    ...(databaseConfig.ssl && { ssl: databaseConfig.ssl })
  };
}

// Get database URL with connection parameters
export function getDatabaseUrl(options?: {
  sslmode?: string;
  poolTimeout?: number;
}): string {
  const url = new URL(databaseConfig.connectionString);
  
  if (options?.sslmode) {
    url.searchParams.set('sslmode', options.sslmode);
  }
  
  if (options?.poolTimeout) {
    url.searchParams.set('pool_timeout', options.poolTimeout.toString());
  }
  
  return url.toString();
}