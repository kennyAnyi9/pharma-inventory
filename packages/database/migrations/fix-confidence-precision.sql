-- Add check constraint to ensure confidence is between 0.00 and 1.00
-- Keep precision as (3,2) to allow values like 1.00 (100% confidence)
ALTER TABLE drugs 
ADD CONSTRAINT reorder_calculation_confidence_range 
CHECK (reorder_calculation_confidence >= 0.00 AND reorder_calculation_confidence <= 1.00);