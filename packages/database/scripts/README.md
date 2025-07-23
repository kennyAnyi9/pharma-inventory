# Database Stock Check Scripts

This directory contains scripts to help you check and analyze current stock levels in the pharma inventory system.

## Available Scripts

### 1. Comprehensive Stock Check (TypeScript)
```bash
npm run db:check-stock
```

**File:** `/packages/database/src/check-stock-levels.ts`

This script provides a comprehensive analysis of stock levels including:
- Summary of drugs with positive stock vs zero stock
- Drugs without any inventory records
- Detailed listing with stock levels, reorder points, and dates
- Last 10 inventory transactions
- Analysis of potential data issues

### 2. Quick Stock Check (TypeScript)
```bash
npm run db:quick-stock
```

**File:** `/packages/database/src/quick-stock-check.ts`

A simpler, faster script that shows:
- Current stock level for each drug
- Stock status (OK or LOW)
- Clean tabular format

### 3. SQL Query (Direct Database Query)
**File:** `/packages/database/scripts/current-stock-query.sql`

You can run this SQL directly against your database to get:
- Current stock levels with detailed information
- Summary statistics

## What These Scripts Do

The scripts query the `inventory` table to find the **most recent inventory record** for each drug (based on `date` and `created_at` timestamp) and display the `closing_stock` value.

### Key Information Provided:
- **Current Stock:** The `closing_stock` from the most recent inventory record
- **Reorder Status:** Whether current stock is below the reorder level
- **Inventory History:** How many inventory records exist for each drug
- **Data Quality:** Identification of drugs without inventory records

## Understanding the Results

### Stock Status Indicators:
- 🟢 **OK/ADEQUATE:** Stock is above reorder level
- 🔴 **LOW STOCK:** Stock is at or below reorder level
- ❌ **ZERO STOCK:** No stock available

### Common Scenarios:
1. **All drugs showing 0 stock:** No inventory records exist or all closing_stock values are 0
2. **Some drugs missing:** Those drugs don't have any inventory records
3. **Negative stock:** Indicates data inconsistency that needs investigation

## Troubleshooting

### If you see "all drugs showing 0 stock":
1. Check if inventory records exist: Look for "Drugs without any inventory records"
2. Verify recent inventory transactions in the detailed output
3. Check if inventory data was properly seeded or imported

### Environment Setup:
Make sure your `DATABASE_URL` environment variable is set in one of:
- Environment variable `DB_ENV_PATH`
- Monorepo root `.env` file
- `apps/web/.env.local` file
- System environment variables

## Examples

### Expected Output for Healthy System:
```
📈 SUMMARY:
- Drugs with positive stock: 10
- Drugs with zero stock: 0
- Drugs without any inventory records: 0
- Drugs with inventory records: 10
```

### Output When Issues Exist:
```
📈 SUMMARY:
- Drugs with positive stock: 5
- Drugs with zero stock: 3
- Drugs without any inventory records: 2
- Drugs with inventory records: 8
```

This would indicate you have some drugs without inventory data and some with zero stock that need attention.