import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

/**
 * Environment Loading Strategy:
 * 1. First try loading from specified DB_ENV_PATH
 * 2. Fall back to monorepo root .env
 * 3. Fall back to web app .env.local (for backward compatibility)
 * 4. Finally rely on system environment variables
 */
const envPaths = [
  process.env.DB_ENV_PATH,
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../apps/web/.env.local'),
].filter(Boolean) as string[]

// Load environment variables from multiple possible locations
for (const envPath of envPaths) {
  dotenv.config({ path: envPath })
}

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required but not found.\n\n' +
    'Please ensure DATABASE_URL is set in one of:\n' +
    `- Environment variable DB_ENV_PATH (currently: ${process.env.DB_ENV_PATH || 'not set'})\n` +
    '- Monorepo root .env file\n' +
    '- apps/web/.env.local file\n' +
    '- System environment variables\n\n' +
    'Example: DATABASE_URL="postgresql://user:password@host:5432/database"'
  )
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})