import { defineConfig } from 'drizzle-kit';

// `pgvector` is enabled by the first migration; the extension has to exist before any `vector`
// column is created, so migrations must always be applied in order on a fresh database.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema',
  out: './src/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
