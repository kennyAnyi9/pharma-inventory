import { pgTable, serial, integer, timestamp, decimal, varchar, text, boolean, index } from 'drizzle-orm/pg-core'
import { drugs } from './drugs'

// Store ML predictions for future evaluation
export const mlPredictions = pgTable('ml_predictions', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'cascade' }),
  predictionDate: timestamp('prediction_date').notNull(),
  forecastPeriodDays: integer('forecast_period_days').notNull().default(7),
  predictedConsumption: decimal('predicted_consumption', { precision: 10, scale: 2 }).notNull(),
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }), // 0.0000 - 1.0000
  modelVersion: varchar('model_version', { length: 50 }),
  algorithm: varchar('algorithm', { length: 50 }).notNull(), // 'xgboost', 'linear_regression', etc.
  features: text('features'), // JSON string of features used
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    drugDateIdx: index('ml_predictions_drug_date_idx').on(table.drugId, table.predictionDate),
    predictionDateIdx: index('ml_predictions_date_idx').on(table.predictionDate),
    algorithmIdx: index('ml_predictions_algorithm_idx').on(table.algorithm),
  }
})

// Store actual consumption data for evaluation
export const actualConsumption = pgTable('actual_consumption', {
  id: serial('id').primaryKey(),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  actualConsumption: decimal('actual_consumption', { precision: 10, scale: 2 }).notNull(),
  dataSource: varchar('data_source', { length: 50 }).notNull().default('drug_activity_log'), // 'drug_activity_log', 'inventory_change', etc.
  isVerified: boolean('is_verified').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    drugPeriodIdx: index('actual_consumption_drug_period_idx').on(table.drugId, table.periodStart, table.periodEnd),
    periodIdx: index('actual_consumption_period_idx').on(table.periodStart, table.periodEnd),
  }
})

// Store evaluation results comparing predictions to actuals
export const modelEvaluations = pgTable('model_evaluations', {
  id: serial('id').primaryKey(),
  predictionId: integer('prediction_id')
    .notNull()
    .references(() => mlPredictions.id, { onDelete: 'cascade' }),
  actualConsumptionId: integer('actual_consumption_id')
    .notNull()
    .references(() => actualConsumption.id, { onDelete: 'cascade' }),
  drugId: integer('drug_id')
    .notNull()
    .references(() => drugs.id, { onDelete: 'cascade' }),
  evaluationDate: timestamp('evaluation_date').notNull(),
  
  // Individual metrics
  absoluteError: decimal('absolute_error', { precision: 10, scale: 2 }).notNull(),
  squaredError: decimal('squared_error', { precision: 12, scale: 4 }).notNull(),
  percentageError: decimal('percentage_error', { precision: 8, scale: 4 }), // Can be null if actual is 0
  
  // Categorical performance
  accuracyCategory: varchar('accuracy_category', { length: 20 }).notNull(), // 'excellent', 'good', 'fair', 'poor'
  
  // Evaluation metadata
  evaluationMethod: varchar('evaluation_method', { length: 50 }).notNull().default('automated'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    predictionIdx: index('model_evaluations_prediction_idx').on(table.predictionId),
    drugDateIdx: index('model_evaluations_drug_date_idx').on(table.drugId, table.evaluationDate),
    evaluationDateIdx: index('model_evaluations_date_idx').on(table.evaluationDate),
    accuracyCategoryIdx: index('model_evaluations_accuracy_idx').on(table.accuracyCategory),
  }
})

// Aggregate performance metrics by time period and algorithm
export const performanceMetrics = pgTable('performance_metrics', {
  id: serial('id').primaryKey(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  algorithm: varchar('algorithm', { length: 50 }).notNull(),
  drugId: integer('drug_id').references(() => drugs.id, { onDelete: 'cascade' }), // null for overall metrics
  
  // Core metrics
  totalPredictions: integer('total_predictions').notNull(),
  rSquared: decimal('r_squared', { precision: 6, scale: 4 }), // -1.0000 to 1.0000
  rmse: decimal('rmse', { precision: 10, scale: 4 }).notNull(),
  mae: decimal('mae', { precision: 10, scale: 4 }).notNull(), // Mean Absolute Error
  mape: decimal('mape', { precision: 8, scale: 4 }), // Mean Absolute Percentage Error
  
  // Performance categories
  excellentPredictions: integer('excellent_predictions').notNull().default(0), // <5% error
  goodPredictions: integer('good_predictions').notNull().default(0), // 5-15% error
  fairPredictions: integer('fair_predictions').notNull().default(0), // 15-30% error
  poorPredictions: integer('poor_predictions').notNull().default(0), // >30% error
  
  // Threshold achievements
  meetsRSquaredThreshold: boolean('meets_r_squared_threshold').notNull().default(false), // >= 0.85
  meetsRmseThreshold: boolean('meets_rmse_threshold').notNull().default(false), // < 0.10
  overallPerformanceGrade: varchar('overall_performance_grade', { length: 10 }).notNull(), // 'A', 'B', 'C', 'D', 'F'
  
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
}, (table) => {
  return {
    periodAlgorithmIdx: index('performance_metrics_period_algorithm_idx').on(table.periodStart, table.periodEnd, table.algorithm),
    drugAlgorithmIdx: index('performance_metrics_drug_algorithm_idx').on(table.drugId, table.algorithm),
    thresholdIdx: index('performance_metrics_threshold_idx').on(table.meetsRSquaredThreshold, table.meetsRmseThreshold),
  }
})

export type MLPrediction = typeof mlPredictions.$inferSelect
export type NewMLPrediction = typeof mlPredictions.$inferInsert
export type ActualConsumption = typeof actualConsumption.$inferSelect  
export type NewActualConsumption = typeof actualConsumption.$inferInsert
export type ModelEvaluation = typeof modelEvaluations.$inferSelect
export type NewModelEvaluation = typeof modelEvaluations.$inferInsert
export type PerformanceMetrics = typeof performanceMetrics.$inferSelect
export type NewPerformanceMetrics = typeof performanceMetrics.$inferInsert