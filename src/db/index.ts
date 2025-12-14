import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail fast with a clear message so tests and devs know how to proceed.
  throw new Error(
    'DATABASE_URL environment variable is not set. Set it to a PostgreSQL connection string for tests (e.g. postgres://user:pass@host:5432/dbname). See README.md for details.'
  );
}

export const pool = new Pool({
  connectionString
});

// Note: we deliberately do not call pool.connect() here. Tests or callers should
// acquire clients as-needed; this keeps the module test-friendly and avoids
// eager connections during unit tests.
