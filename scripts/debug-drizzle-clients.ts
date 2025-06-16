#!/usr/bin/env -S npx tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { clients } from '../shared/schema';
import { desc, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:mssp123@localhost/msspv2');
  const db = drizzle(sql);
  try {
    const rows = await db.select().from(clients).where(isNull(clients.deletedAt)).orderBy(desc(clients.createdAt));
    console.log('Clients:', rows.length, rows.slice(0, 5));
  } catch (err) {
    console.error('Error querying clients:', err);
  } finally {
    await sql.end();
  }
}

main(); 