import { pgTable, serial, integer, varchar, timestamp, boolean, text, index } from 'drizzle-orm/pg-core'
import { drugs } from './drugs'

export const alertTypeEnum = ['low_stock', 'predicted_stockout', 'overstock', 'expiry_warning'] as const
export const alertStatusEnum = ['active', 'acknowledged', 'resolved', 'dismissed'] as const
export const alertSeverityEnum = ['low', 'medium', 'high', 'critical'] as const

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // low_stock, predicted_stockout, overstock, expiry_warning
  severity: varchar('severity', { length: 20 }).notNull().default('medium'), // low, medium, high, critical
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, acknowledged, resolved, dismissed
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  threshold: integer('threshold'), // The threshold value that triggered the alert
  currentValue: integer('current_value'), // Current stock/days remaining
  recommendedAction: text('recommended_action'),
  isRead: boolean('is_read').notNull().default(false),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: varchar('acknowledged_by', { length: 100 }), // Will be user ID later
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    drugTypeIdx: index('alert_drug_type_idx').on(table.drugId, table.type),
    statusIdx: index('alert_status_idx').on(table.status),
    createdAtIdx: index('alert_created_at_idx').on(table.createdAt),
  }
})

export const alertHistory = pgTable('alert_history', {
  id: serial('id').primaryKey(),
  alertId: integer('alert_id')
    .notNull()
    .references(() => alerts.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(), // created, acknowledged, resolved, dismissed
  performedBy: varchar('performed_by', { length: 100 }), // Will be user ID later
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    alertIdIdx: index('alert_history_alert_id_idx').on(table.alertId),
    createdAtIdx: index('alert_history_created_at_idx').on(table.createdAt),
  }
})

export type Alert = typeof alerts.$inferSelect
export type NewAlert = typeof alerts.$inferInsert
export type AlertHistory = typeof alertHistory.$inferSelect
export type NewAlertHistory = typeof alertHistory.$inferInsert

export type AlertType = typeof alertTypeEnum[number]
export type AlertStatus = typeof alertStatusEnum[number]
export type AlertSeverity = typeof alertSeverityEnum[number]