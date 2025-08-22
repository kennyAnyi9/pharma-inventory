import { pgTable, serial, varchar, boolean, timestamp, integer, text, index } from 'drizzle-orm/pg-core'

export const serviceStatus = pgTable('service_status', {
  id: serial('id').primaryKey(),
  serviceName: varchar('service_name', { length: 100 }).notNull(),
  serviceUrl: varchar('service_url', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'up', 'down', 'degraded'
  responseTime: integer('response_time'), // in milliseconds
  statusCode: integer('status_code'),
  errorMessage: text('error_message'),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serviceNameIdx: index('idx_service_status_name').on(table.serviceName),
  checkedAtIdx: index('idx_service_status_checked_at').on(table.checkedAt),
  statusIdx: index('idx_service_status_status').on(table.status),
}))

export const serviceConfig = pgTable('service_config', {
  id: serial('id').primaryKey(),
  serviceName: varchar('service_name', { length: 100 }).notNull().unique(),
  serviceUrl: varchar('service_url', { length: 500 }).notNull(),
  description: varchar('description', { length: 200 }),
  category: varchar('category', { length: 50 }).notNull(), // 'web', 'api', 'database', 'ml'
  isActive: boolean('is_active').notNull().default(true),
  checkInterval: integer('check_interval').notNull().default(300), // seconds (5 minutes)
  timeout: integer('timeout').notNull().default(10), // seconds
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type ServiceStatus = typeof serviceStatus.$inferSelect
export type NewServiceStatus = typeof serviceStatus.$inferInsert
export type ServiceConfig = typeof serviceConfig.$inferSelect
export type NewServiceConfig = typeof serviceConfig.$inferInsert