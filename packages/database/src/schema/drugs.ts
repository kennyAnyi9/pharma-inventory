import { pgTable, serial, varchar, integer, decimal, timestamp, boolean } from 'drizzle-orm/pg-core'

export const drugs = pgTable('drugs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  genericName: varchar('generic_name', { length: 255 }),
  category: varchar('category', { length: 100 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(), // e.g., "tablets", "ml", "vials"
  packSize: integer('pack_size').notNull().default(1),
  reorderLevel: integer('reorder_level').notNull().default(100), // Manual/fallback reorder level
  calculatedReorderLevel: integer('calculated_reorder_level'), // ML-calculated optimal reorder level
  reorderQuantity: integer('reorder_quantity').notNull().default(500),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
  supplier: varchar('supplier', { length: 255 }),
  requiresPrescription: boolean('requires_prescription').notNull().default(false),
  storageCondition: varchar('storage_condition', { length: 100 }), // e.g., "Cool & Dry", "Refrigerated"
  lastReorderCalculation: timestamp('last_reorder_calculation'),
  reorderCalculationConfidence: decimal('reorder_calculation_confidence', { precision: 2, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Drug = typeof drugs.$inferSelect
export type NewDrug = typeof drugs.$inferInsert