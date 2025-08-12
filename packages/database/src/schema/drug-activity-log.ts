import { pgTable, serial, integer, varchar, text, timestamp, decimal, jsonb, index } from 'drizzle-orm/pg-core'

export const drugActivityLog = pgTable('drug_activity_log', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id').notNull(),
  drugName: varchar('drug_name', { length: 200 }).notNull(),
  date: timestamp('date').notNull(),
  activityType: varchar('activity_type', { length: 50 }).notNull(), // 'stock_add', 'stock_use', 'reorder_update', 'ml_calculation', 'alert_generated', 'system_update'
  description: text('description').notNull(),
  
  // Stock Changes
  previousStock: integer('previous_stock'),
  newStock: integer('current_stock'),
  stockChange: integer('stock_change'), // +/- amount
  
  // Reorder Level Changes  
  previousReorderLevel: integer('previous_reorder_level'),
  newReorderLevel: integer('new_reorder_level'),
  reorderLevelChange: integer('reorder_level_change'),
  
  // Additional Context
  quantity: integer('quantity'), // Amount added/used
  unit: varchar('unit', { length: 20 }),
  notes: text('notes'), // User notes or system generated notes
  source: varchar('source', { length: 50 }).notNull(), // 'user_manual', 'ml_system', 'cron_job', 'api_update'
  userId: varchar('user_id', { length: 50 }), // If user-initiated
  
  // ML/System Data
  mlConfidence: decimal('ml_confidence', { precision: 5, scale: 2 }),
  calculationMethod: varchar('calculation_method', { length: 100 }),
  
  // Status Changes
  previousStatus: varchar('previous_status', { length: 20 }), // 'critical', 'low', 'normal', 'good'
  newStatus: varchar('new_status', { length: 20 }),
  
  // Metadata
  metadata: jsonb('metadata'), // Flexible field for additional context
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  drugDateIdx: index('idx_drug_activity_drug_date').on(table.drugId, table.date),
  activityTypeIdx: index('idx_drug_activity_type').on(table.activityType),
  dateIdx: index('idx_drug_activity_date').on(table.date),
  drugIdx: index('idx_drug_activity_drug').on(table.drugId),
}))

export type DrugActivityLog = typeof drugActivityLog.$inferSelect
export type NewDrugActivityLog = typeof drugActivityLog.$inferInsert