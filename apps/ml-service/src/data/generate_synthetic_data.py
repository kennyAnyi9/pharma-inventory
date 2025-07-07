import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
from sqlalchemy import create_engine, text

# Direct import from config module
from config import DATABASE_URL, HISTORICAL_DAYS

# Ghana-specific drug configurations
DRUG_PATTERNS = {
    'Paracetamol 500mg': {
        'base_usage': 50,
        'variance': 10,
        'weekend_multiplier': 1.2,
        'month_end_multiplier': 0.8,
    },
    'Amoxicillin 250mg': {
        'base_usage': 30,
        'variance': 8,
        'weekend_multiplier': 1.1,
        'month_end_multiplier': 0.85,
    },
    'Metformin 500mg': {
        'base_usage': 20,
        'variance': 5,
        'weekend_multiplier': 1.0,  # Chronic medication, stable
        'month_end_multiplier': 0.9,
    },
    'Amlodipine 5mg': {
        'base_usage': 15,
        'variance': 3,
        'weekend_multiplier': 1.0,  # Chronic medication, stable
        'month_end_multiplier': 0.9,
    },
    'Omeprazole 20mg': {
        'base_usage': 18,
        'variance': 4,
        'weekend_multiplier': 1.15,
        'month_end_multiplier': 0.85,
    },
    'Artemether/Lumefantrine 20/120mg': {
        'base_usage': 25,
        'variance': 15,  # High variance
        'weekend_multiplier': 1.0,
        'month_end_multiplier': 0.7,
        'seasonal': True,  # Malaria is seasonal
    },
    'ORS Sachets': {
        'base_usage': 30,
        'variance': 20,  # Very high variance
        'weekend_multiplier': 1.3,
        'month_end_multiplier': 0.75,
        'outbreak_prone': True,
    },
    'Ferrous Sulphate 200mg': {
        'base_usage': 15,
        'variance': 4,
        'weekend_multiplier': 1.05,
        'month_end_multiplier': 0.85,
    },
    'Diclofenac 50mg': {
        'base_usage': 22,
        'variance': 6,
        'weekend_multiplier': 1.25,
        'month_end_multiplier': 0.8,
    },
    'Metronidazole 400mg': {
        'base_usage': 18,
        'variance': 5,
        'weekend_multiplier': 1.1,
        'month_end_multiplier': 0.85,
    }
}

# Ghana-specific calendar events
GHANA_HOLIDAYS = [
    '01-01',  # New Year
    '03-06',  # Independence Day
    '05-01',  # May Day
    '12-25',  # Christmas
    '12-26',  # Boxing Day
]

def is_rainy_season(date):
    """Check if date falls in Ghana's rainy season"""
    month = date.month
    # Major rainy season: April-July
    # Minor rainy season: September-November
    return month in [4, 5, 6, 7, 9, 10, 11]

def is_holiday(date):
    """Check if date is a Ghana public holiday"""
    date_str = date.strftime('%m-%d')
    return date_str in GHANA_HOLIDAYS

def is_month_end(date):
    """Check if date is in the last 5 days of month"""
    days_in_month = (date.replace(month=date.month % 12 + 1, day=1) - timedelta(days=1)).day
    return date.day > days_in_month - 5

def generate_usage(drug_name, date, pattern):
    """Generate daily usage for a drug based on patterns"""
    base = pattern['base_usage']
    variance = pattern['variance']
    
    # Start with base usage plus random variance
    usage = base + np.random.normal(0, variance/3)
    
    # Weekend effect
    if date.weekday() >= 5:  # Saturday = 5, Sunday = 6
        usage *= pattern['weekend_multiplier']
    
    # Month-end effect (reduced purchasing power)
    if is_month_end(date):
        usage *= pattern['month_end_multiplier']
    
    # Holiday effect (clinics may be closed)
    if is_holiday(date):
        usage *= 0.5
    
    # Seasonal effects for specific drugs
    if pattern.get('seasonal') and drug_name == 'Artemether/Lumefantrine 20/120mg':
        if is_rainy_season(date):
            usage *= 1.8  # 80% increase during rainy season
    
    # Outbreak simulation for ORS
    if pattern.get('outbreak_prone') and drug_name == 'ORS Sachets':
        # 5% chance of outbreak on any day
        if random.random() < 0.05:
            usage *= random.uniform(2.5, 4.0)  # 2.5x to 4x spike
    
    # Ensure non-negative
    return max(0, int(round(usage)))

def generate_synthetic_data():
    """Generate 180 days of synthetic drug usage data"""
    print(f"Generating {HISTORICAL_DAYS} days of synthetic data...")
    
    # Calculate date range
    end_date = datetime.now().date() - timedelta(days=1)  # Yesterday
    start_date = end_date - timedelta(days=HISTORICAL_DAYS - 1)
    
    # Connect to database
    engine = create_engine(DATABASE_URL)
    
    # Get drug IDs from database
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, name FROM drugs ORDER BY id"))
        drugs_db = result.fetchall()
    
    # Create mapping of drug names to IDs
    drug_id_map = {row[1]: row[0] for row in drugs_db}
    
    # Generate data
    all_data = []
    
    for current_date in pd.date_range(start_date, end_date):
        for drug_name, pattern in DRUG_PATTERNS.items():
            if drug_name in drug_id_map:
                drug_id = drug_id_map[drug_name]
                
                # Generate usage for this drug on this date
                usage = generate_usage(drug_name, current_date, pattern)
                
                # Calculate stock levels (simplified - will be recalculated properly later)
                # Assume we start with reorder_level * 2 and track changes
                
                all_data.append({
                    'drug_id': drug_id,
                    'date': current_date.date(),
                    'quantity_used': usage,
                    'drug_name': drug_name,  # For reference
                })
    
    # Convert to DataFrame
    df = pd.DataFrame(all_data)
    
    # Display sample data
    print("\nSample of generated data:")
    print(df.head(20))
    
    print(f"\nTotal records to generate: {len(df)}")
    print(f"Date range: {start_date} to {end_date}")
    
    # Summary statistics by drug
    print("\nUsage summary by drug:")
    summary = df.groupby('drug_name')['quantity_used'].agg(['mean', 'std', 'min', 'max'])
    print(summary)
    
    return df

def insert_historical_data(df):
    """Insert synthetic data into the inventory table"""
    print("\nInserting data into database...")
    
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        # First, clear any existing historical data (keep only today's data)
        conn.execute(text("""
            DELETE FROM inventory 
            WHERE date < CURRENT_DATE
        """))
        
        # Group by drug to calculate running stock levels
        for drug_id in df['drug_id'].unique():
            drug_data = df[df['drug_id'] == drug_id].sort_values('date')
            
            # Get initial stock (from current inventory or use default)
            result = conn.execute(text("""
                SELECT closing_stock, reorder_level 
                FROM inventory i
                JOIN drugs d ON d.id = i.drug_id
                WHERE i.drug_id = :drug_id 
                ORDER BY date DESC 
                LIMIT 1
            """), {'drug_id': int(drug_id)})
            
            row = result.fetchone()
            if row:
                current_stock = row[0]
                reorder_level = row[1]
            else:
                # Get reorder level from drugs table
                result = conn.execute(text("""
                    SELECT reorder_level FROM drugs WHERE id = :drug_id
                """), {'drug_id': int(drug_id)})
                reorder_level = result.fetchone()[0]
                current_stock = reorder_level * 2  # Start with double reorder level
            
            # Insert historical records
            for _, record in drug_data.iterrows():
                # Simulate stock management
                opening_stock = current_stock
                quantity_used = int(record['quantity_used'])
                
                # Random receiving (when stock is low)
                quantity_received = 0
                if current_stock <= reorder_level:
                    # Order received (simplified)
                    quantity_received = reorder_level * 3
                
                closing_stock = opening_stock + quantity_received - quantity_used
                closing_stock = max(0, closing_stock)  # Can't go negative
                stockout_flag = closing_stock == 0
                
                # Insert record
                conn.execute(text("""
                    INSERT INTO inventory (
                        drug_id, date, opening_stock, quantity_received,
                        quantity_used, quantity_expired, closing_stock,
                        stockout_flag, created_at, updated_at
                    ) VALUES (
                        :drug_id, :date, :opening_stock, :quantity_received,
                        :quantity_used, 0, :closing_stock,
                        :stockout_flag, NOW(), NOW()
                    )
                """), {
                    'drug_id': int(drug_id),
                    'date': record['date'],
                    'opening_stock': int(opening_stock),
                    'quantity_received': int(quantity_received),
                    'quantity_used': int(quantity_used),
                    'closing_stock': int(closing_stock),
                    'stockout_flag': stockout_flag
                })
                
                current_stock = closing_stock
    
    print("✅ Historical data inserted successfully!")

def main():
    """Main function to generate and insert synthetic data"""
    import sys
    
    try:
        # Generate synthetic data
        df = generate_synthetic_data()
        
        # Check if --confirm flag is passed
        if '--confirm' in sys.argv:
            insert_data = True
        else:
            # Ask for confirmation before inserting
            print("\n" + "="*50)
            print("⚠️  WARNING: This will delete existing historical data!")
            print("="*50)
            print("\nTo insert data, run with --confirm flag:")
            print("python src/data/generate_synthetic_data.py --confirm")
            print("\nOr from project root:")
            print("pnpm run generate-data --confirm")
            return
        
        if insert_data:
            insert_historical_data(df)
            print("\n✅ Synthetic data generation complete!")
            
            # Verify insertion
            engine = create_engine(DATABASE_URL)
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT COUNT(*) as count, 
                           MIN(date) as min_date, 
                           MAX(date) as max_date 
                    FROM inventory
                """))
                row = result.fetchone()
                print(f"\nDatabase now contains:")
                print(f"- Total inventory records: {row[0]}")
                print(f"- Date range: {row[1]} to {row[2]}")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()