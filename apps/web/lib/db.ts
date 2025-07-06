import { createDatabaseClient } from '@workspace/database'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

export const db = createDatabaseClient(process.env.DATABASE_URL)