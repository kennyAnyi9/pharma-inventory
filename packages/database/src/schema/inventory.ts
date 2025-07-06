import { pgTable, serial, integer, date, varchar, timestamp, index, boolean } from 'drizzle-orm/pg-core'
import { drugs } from './drugs'

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  openingStock: integer('opening_stock').notNull().default(0),
  quantityReceived: integer('quantity_received').notNull().default(0),
  quantityUsed: integer('quantity_used').notNull().default(0),
  quantityExpired: integer('quantity_expired').notNull().default(0),
  closingStock: integer('closing_stock').notNull().default(0),
  stockoutFlag: boolean('stockout_flag').notNull().default(false),
  expiryDate: date('expiry_date'),
  batchNumber: varchar('batch_number', { length: 100 }),
  notes: varchar('notes', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    drugDateIdx: index('drug_date_idx').on(table.drugId, table.date),
  }
})

export type Inventory = typeof inventory.$inferSelect
export type NewInventory = typeof inventory.$inferInsert