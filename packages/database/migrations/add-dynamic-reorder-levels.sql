-- Add dynamic reorder level columns to drugs table
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS calculated_reorder_level INTEGER;
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS last_reorder_calculation TIMESTAMP;
ALTER TABLE drugs ADD COLUMN IF NOT EXISTS reorder_calculation_confidence DECIMAL(3,2);

-- Create reorder_calculations table for audit trail
CREATE TABLE IF NOT EXISTS reorder_calculations (
  id SERIAL PRIMARY KEY,
  drug_id INTEGER NOT NULL REFERENCES drugs(id),
  calculated_level INTEGER NOT NULL,
  safety_stock INTEGER NOT NULL,
  avg_daily_demand DECIMAL(10,2) NOT NULL,
  demand_std_dev DECIMAL(10,2) NOT NULL,
  lead_time_days INTEGER NOT NULL,
  confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0.95,
  calculation_method VARCHAR(100) NOT NULL DEFAULT 'ml_forecast',
  calculation_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reorder_calculations_drug_id ON reorder_calculations(drug_id);
CREATE INDEX IF NOT EXISTS idx_reorder_calculations_date ON reorder_calculations(calculation_date);
CREATE INDEX IF NOT EXISTS idx_drugs_calculated_reorder_level ON drugs(calculated_reorder_level);
CREATE INDEX IF NOT EXISTS idx_drugs_last_reorder_calculation ON drugs(last_reorder_calculation);