import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './connection.js';
import { seedAvailabilityDefaults } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function migrate() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schemaSql);
  seedAvailabilityDefaults(db);
}
