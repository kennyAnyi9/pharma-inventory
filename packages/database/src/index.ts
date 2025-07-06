import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

export function createDatabaseClient(databaseUrl: string) {
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

// Export schema and types
export * from './schema'
export type { NeonQueryFunction } from '@neondatabase/serverless'