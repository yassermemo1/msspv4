#!/usr/bin/env -S npx tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { contracts } from '../shared/schema';
import { desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:mssp123@localhost/msspv2');
  const db = drizzle(sql);
  try {
    const rows = await db.select().from(contracts).orderBy(desc(contracts.createdAt));
    console.log('Contracts:', rows.length, rows.slice(0, 5));
  } catch (err) {
    console.error('Error querying contracts:', err);
  } finally {
    await sql.end();
  }
}

main(); 