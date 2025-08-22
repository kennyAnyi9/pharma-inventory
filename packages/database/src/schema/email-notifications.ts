import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { drugs } from './drugs'

export const emailNotifications = pgTable('email_notifications', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'cascade' }),
  notificationType: varchar('notification_type', { length: 50 }).notNull(), // critical_stock, predicted_stockout
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  subject: varchar('subject', { length: 255 }).notNull(),
}, (table) => {
  return {
    drugTypeIdx: index('email_drug_type_idx').on(table.drugId, table.notificationType),
    sentAtIdx: index('email_sent_at_idx').on(table.sentAt),
  }
})

export type EmailNotification = typeof emailNotifications.$inferSelect
export type NewEmailNotification = typeof emailNotifications.$inferInsert