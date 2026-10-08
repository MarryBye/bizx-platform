import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export function createDatabaseClient(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/bizx_db';
  const queryClient = postgres(url, { max: 10 });
  return drizzle(queryClient, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
