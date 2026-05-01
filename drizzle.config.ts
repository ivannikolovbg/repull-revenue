import type { Config } from 'drizzle-kit';

const url =
  process.env.DATABASE_URL ?? 'postgres://repull:repull@localhost:5432/repull_rev';

const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

export default {
  schema: './core/db/schema.ts',
  out: './core/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  },
  strict: true,
  verbose: true,
} satisfies Config;
