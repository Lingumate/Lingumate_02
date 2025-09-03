import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { env } from './config/env.js';

// Debug: Log environment variables
console.log('Environment variables check:');
console.log('DATABASE_URL:', env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', env.NODE_ENV);

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please check your .env file.');
  console.error('Expected format: DATABASE_URL=postgresql://username:password@localhost:5432/lingumate');
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });