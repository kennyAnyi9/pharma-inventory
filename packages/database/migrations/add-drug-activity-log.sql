-- Create drug activity log table for comprehensive tracking
CREATE TABLE IF NOT EXISTS drug_activity_log (
  id SERIAL PRIMARY KEY,
  drug_id INTEGER NOT NULL,
  drug_name VARCHAR(200) NOT NULL,
  date TIMESTAMP NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'stock_add', 'stock_use', 'reorder_update', 'ml_calculation', 'alert_generated', 'system_update'
  description TEXT NOT NULL,
  
  -- Stock Changes
  previous_stock INTEGER,
  current_stock INTEGER,
  stock_change INTEGER, -- +/- amount
  
  -- Reorder Level Changes  
  previous_reorder_level INTEGER,
  new_reorder_level INTEGER,
  reorder_level_change INTEGER,
  
  -- Additional Context
  quantity INTEGER, -- Amount added/used
  unit VARCHAR(20),
  notes TEXT, -- User notes or system generated notes
  source VARCHAR(50) NOT NULL, -- 'user_manual', 'ml_system', 'cron_job', 'api_update'
  user_id VARCHAR(50), -- If user-initiated
  
  -- ML/System Data
  ml_confidence DECIMAL(5,2),
  calculation_method VARCHAR(100),
  
  -- Status Changes
  previous_status VARCHAR(20), -- 'critical', 'low', 'normal', 'good'
  new_status VARCHAR(20),
  
  -- Metadata
  metadata JSONB, -- Flexible field for additional context
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_drug_activity_drug_date ON drug_activity_log (drug_id, date);
CREATE INDEX IF NOT EXISTS idx_drug_activity_type ON drug_activity_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_drug_activity_date ON drug_activity_log (date);
CREATE INDEX IF NOT EXISTS idx_drug_activity_drug ON drug_activity_log (drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_activity_source ON drug_activity_log (source);

-- Add comments for documentation
COMMENT ON TABLE drug_activity_log IS 'Comprehensive log of all drug-related activities and changes';
COMMENT ON COLUMN drug_activity_log.activity_type IS 'Type of activity: stock_add, stock_use, reorder_update, ml_calculation, alert_generated, system_update';
COMMENT ON COLUMN drug_activity_log.source IS 'Source of the activity: user_manual, ml_system, cron_job, api_update, system_automatic';
COMMENT ON COLUMN drug_activity_log.metadata IS 'Flexible JSON field for storing additional context and details';