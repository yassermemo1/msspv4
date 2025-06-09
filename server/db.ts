import { config } from 'dotenv';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Load environment variables
config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine if we're using Neon (serverless) or local PostgreSQL
const isNeon = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon.database');

// SSL configuration - only enable if explicitly set to true
const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

let pool;
let db;

if (isNeon) {
  // Use Neon serverless
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // Use local PostgreSQL with optional SSL
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig
  };
  
  pool = new PgPool(dbConfig);
  db = drizzlePg(pool, { schema });
}

// Add query method to db object for backward compatibility
(db as any).query = async (query: string, params: any[] = []) => {
  const result = await pool.query(query, params);
  return result;
};

export { pool, db };