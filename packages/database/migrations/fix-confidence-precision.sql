-- Fix reorder_calculation_confidence precision and add check constraint
ALTER TABLE drugs 
ALTER COLUMN reorder_calculation_confidence TYPE DECIMAL(2,2);

-- Add check constraint to ensure confidence is between 0.00 and 1.00
ALTER TABLE drugs 
ADD CONSTRAINT reorder_calculation_confidence_range 
CHECK (reorder_calculation_confidence >= 0.00 AND reorder_calculation_confidence <= 1.00);