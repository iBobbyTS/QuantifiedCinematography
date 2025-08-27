import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quantified_cinematography',
  },
  verbose: true,
  strict: true,
  studio: {
    port: 4983,
    host: 'localhost'
  }
} satisfies Config;
