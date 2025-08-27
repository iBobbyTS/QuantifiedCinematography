import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

// Database connection configuration
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/quantified_cinematography';

// Create postgres client
const client = postgres(connectionString, {
  max: 1, // Use connection pooling
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client);

// Export client for manual operations if needed
export { client };

console.log('Database connection established');
