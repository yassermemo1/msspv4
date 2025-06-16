#!/usr/bin/env -S npx tsx

import { DatabaseStorage } from '../server/storage';
import * as dotenv from 'dotenv';

dotenv.config();

(async () => {
  const storage = new DatabaseStorage();
  const rows = await storage.getClientsWithStats();
  console.log(rows);
})(); 