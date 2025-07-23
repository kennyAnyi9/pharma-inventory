-- Migration: Add intelligent reorder fields to reorder_calculations table
-- This enables date-based reordering and prevents overstocking

ALTER TABLE reorder_calculations 
ADD COLUMN IF NOT EXISTS reorder_date DATE,
ADD COLUMN IF NOT EXISTS days_until_reorder INTEGER,
ADD COLUMN IF NOT EXISTS stock_sufficiency_days INTEGER,
ADD COLUMN IF NOT EXISTS reorder_recommendation VARCHAR(20),
ADD COLUMN IF NOT EXISTS intelligent_reorder_level INTEGER,
ADD COLUMN IF NOT EXISTS prevent_overstocking_note VARCHAR(500);

-- Add helpful comments
COMMENT ON COLUMN reorder_calculations.reorder_date IS 'Date when reorder should be placed';
COMMENT ON COLUMN reorder_calculations.days_until_reorder IS 'Days until reorder is needed';
COMMENT ON COLUMN reorder_calculations.stock_sufficiency_days IS 'How many days current stock will last';
COMMENT ON COLUMN reorder_calculations.reorder_recommendation IS 'AI recommendation: immediate, upcoming, sufficient, overstocked';
COMMENT ON COLUMN reorder_calculations.intelligent_reorder_level IS 'AI-adjusted reorder level to prevent overstocking';
COMMENT ON COLUMN reorder_calculations.prevent_overstocking_note IS 'Explanation of reorder timing and level adjustments';

-- Create index on reorder_date for efficient querying
CREATE INDEX IF NOT EXISTS idx_reorder_calculations_reorder_date ON reorder_calculations(reorder_date);
CREATE INDEX IF NOT EXISTS idx_reorder_calculations_recommendation ON reorder_calculations(reorder_recommendation);