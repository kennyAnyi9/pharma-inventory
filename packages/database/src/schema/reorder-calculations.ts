import { pgTable, serial, integer, decimal, timestamp, varchar, date } from 'drizzle-orm/pg-core'
import { drugs } from './drugs'

export const reorderCalculations = pgTable('reorder_calculations', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id').notNull().references(() => drugs.id),
  calculatedLevel: integer('calculated_level').notNull(),
  safetyStock: integer('safety_stock').notNull(),
  avgDailyDemand: decimal('avg_daily_demand', { precision: 10, scale: 2 }).notNull(),
  demandStdDev: decimal('demand_std_dev', { precision: 10, scale: 2 }).notNull(),
  leadTimeDays: integer('lead_time_days').notNull(),
  confidenceLevel: decimal('confidence_level', { precision: 3, scale: 2 }).notNull().default('0.95'),
  calculationMethod: varchar('calculation_method', { length: 100 }).notNull().default('ml_forecast'),
  calculationDate: timestamp('calculation_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // Enhanced intelligent reorder fields
  reorderDate: date('reorder_date'), // When to place the order
  daysUntilReorder: integer('days_until_reorder'), // Days until reorder is needed
  stockSufficiencyDays: integer('stock_sufficiency_days'), // How many days current stock will last
  reorderRecommendation: varchar('reorder_recommendation', { length: 20 }), // 'immediate', 'upcoming', 'sufficient', 'overstocked'
  intelligentReorderLevel: integer('intelligent_reorder_level'), // AI-adjusted reorder level
  preventOverstockingNote: varchar('prevent_overstocking_note', { length: 500 }), // Explanation
})

export type ReorderCalculation = typeof reorderCalculations.$inferSelect
export type NewReorderCalculation = typeof reorderCalculations.$inferInsert