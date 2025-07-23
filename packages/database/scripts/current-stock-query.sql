-- Query to check current stock levels for all drugs
-- This shows the most recent closing_stock for each drug

WITH latest_inventory AS (
  SELECT DISTINCT ON (drug_id) 
    drug_id,
    date,
    closing_stock,
    opening_stock,
    quantity_received,
    quantity_used,
    stockout_flag,
    created_at
  FROM inventory 
  ORDER BY drug_id, date DESC, created_at DESC
),
inventory_counts AS (
  SELECT 
    drug_id,
    COUNT(*) as total_records
  FROM inventory
  GROUP BY drug_id
)
SELECT 
  d.id as drug_id,
  d.name as drug_name,
  d.category,
  d.unit,
  d.reorder_level,
  d.calculated_reorder_level,
  COALESCE(li.closing_stock, 0) as current_stock,
  li.date as last_inventory_date,
  li.opening_stock,
  li.quantity_received,
  li.quantity_used,
  li.stockout_flag,
  COALESCE(ic.total_records, 0) as inventory_records_count,
  CASE 
    WHEN COALESCE(li.closing_stock, 0) = 0 THEN '❌ ZERO STOCK'
    WHEN COALESCE(li.closing_stock, 0) <= d.reorder_level THEN '🔴 LOW STOCK'
    ELSE '🟢 ADEQUATE'
  END as stock_status
FROM drugs d
LEFT JOIN latest_inventory li ON d.id = li.drug_id
LEFT JOIN inventory_counts ic ON d.id = ic.drug_id
ORDER BY d.name;

-- Summary query
SELECT 
  COUNT(*) as total_drugs,
  COUNT(CASE WHEN COALESCE(li.closing_stock, 0) > 0 THEN 1 END) as drugs_with_stock,
  COUNT(CASE WHEN COALESCE(li.closing_stock, 0) = 0 THEN 1 END) as drugs_with_zero_stock,
  COUNT(CASE WHEN COALESCE(li.closing_stock, 0) <= d.reorder_level THEN 1 END) as drugs_below_reorder_level,
  COUNT(CASE WHEN ic.total_records = 0 THEN 1 END) as drugs_without_inventory_records
FROM drugs d
LEFT JOIN (
  SELECT DISTINCT ON (drug_id) 
    drug_id,
    closing_stock
  FROM inventory 
  ORDER BY drug_id, date DESC, created_at DESC
) li ON d.id = li.drug_id
LEFT JOIN (
  SELECT drug_id, COUNT(*) as total_records
  FROM inventory
  GROUP BY drug_id
) ic ON d.id = ic.drug_id;