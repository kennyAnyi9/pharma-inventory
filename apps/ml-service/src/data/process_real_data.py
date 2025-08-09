import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import re
from typing import Dict, List, Tuple
from sqlalchemy import create_engine, text
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_URL

class RealDataProcessor:
    """Process real consumption CSV data for ML model training"""
    
    def __init__(self):
        self.drug_mapping = self._create_drug_mapping()
        self.csv_files = [
            'CONSUMPTION-D-2.csv',
            'CONSUMPTION-DATA-2.csv', 
            'CONSUMPTION-DATA-3.csv'
        ]
        
    def _create_drug_mapping(self) -> Dict[str, str]:
        """Map CSV drug names to standardized system drug names"""
        return {
            # Paracetamol variations
            'PARACETAMOL 500MG TABLET': 'Paracetamol 500mg',
            'PARACETAMOL SYRUP': 'Paracetamol 500mg',  # Count as equivalent
            'PARACETAMOL 125MG SUPPOSITORY': 'Paracetamol 500mg',  # Count as equivalent
            'PARACETAMOL 250MG SUPPOSITORY': 'Paracetamol 500mg',  # Count as equivalent
            
            # Amoxicillin variations
            'AMOXYCILLIN 250MG CAPSULE': 'Amoxicillin 250mg',
            'AMOXYCILLIN 500MG CAPSULE': 'Amoxicillin 250mg',  # Convert to 250mg equivalent
            'AMOXYCILLIN 125MG/5ML SUSPENSION': 'Amoxicillin 250mg',
            
            # Metformin
            'METFORMIN 500MG TABLET': 'Metformin 500mg',
            
            # Amlodipine variations (note: CSV has 10mg, system expects 5mg)
            'AMLOPINE 10MG TABLET': 'Amlodipine 5mg',  # Map 10mg to 5mg equivalent
            
            # Omeprazole
            'OMEPRAZOLE 20MG CAP': 'Omeprazole 20mg',
            
            # Artemether/Lumefantrine variations
            'ARTEMETHER/LUMEFANTRINE SUSPENSION 20MG/120MG': 'Artemether/Lumefantrine 20/120mg',
            'ARTEMETHER/LUMEF.ADULT 40MG/240MG (DOSES0': 'Artemether/Lumefantrine 20/120mg',
            'ARTEMETHER/LUMEFANTRINE POWDER 20MG/120MG (DOSES)': 'Artemether/Lumefantrine 20/120mg',
            'ARTEMETHER 80MG INJECTION': 'Artemether/Lumefantrine 20/120mg',
            
            # ORS
            'O R S POWDER': 'ORS Sachets',
            
            # Ferrous Sulphate
            'FERROUS SULPHATE TABLET': 'Ferrous Sulphate 200mg',
            
            # Diclofenac variations
            'DICLOFENAC 50MG TABLET': 'Diclofenac 50mg',
            'DICLOFENAC 100MG TABLET': 'Diclofenac 50mg',  # Convert to 50mg equivalent
            'DICLOFENAC 75MG INJECTION': 'Diclofenac 50mg',  # Convert to 50mg equivalent
            'DICLOFENAC 75MG CAPSULE': 'Diclofenac 50mg',  # Convert to 50mg equivalent
            
            # Metronidazole
            'METRONIDAZOLE 400MG TABLET': 'Metronidazole 400mg',
            'METRONIDAZOLE 200MG TABLET': 'Metronidazole 400mg',  # Convert to 400mg equivalent
            'METRONIDAZOLE 200MG/5ML SUSPENSION': 'Metronidazole 400mg',
            'METRONIDAZOLE 500MG INJECTION': 'Metronidazole 400mg',
        }
    
    def _standardize_date(self, date_str: str) -> datetime:
        """Convert various date formats to standard datetime"""
        if pd.isna(date_str) or date_str == '' or date_str == 'NaN':
            return None
            
        date_str = str(date_str).strip()
        
        # Handle various date formats found in the data
        date_formats = [
            '%d-%b-%y',      # 2-Jan-21
            '%d-%m-%y',      # 2-01-21
            '%d/%m/%Y',      # 2/1/2021
            '%Y-%m-%d',      # 2021-01-02
            '%d-%b-%Y',      # 2-Jan-2021
        ]
        
        # Special cases
        if date_str.startswith('(10)'):
            date_str = date_str[4:]  # Remove (10) prefix
        
        # Handle date format variations
        date_str = date_str.replace('11/11/2020', '2020-11-11')
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
                
        print(f"Warning: Could not parse date: {date_str}")
        return None
    
    def _convert_dosage_equivalent(self, drug_csv: str, quantity: float) -> float:
        """Convert different dosages to standard equivalents"""
        conversions = {
            # Convert 500mg amoxicillin to 250mg equivalent (2x quantity)
            'AMOXYCILLIN 500MG CAPSULE': lambda x: x * 2,
            
            # Convert 10mg amlodipine to 5mg equivalent (2x quantity)  
            'AMLOPINE 10MG TABLET': lambda x: x * 2,
            
            # Convert 100mg diclofenac to 50mg equivalent (2x quantity)
            'DICLOFENAC 100MG TABLET': lambda x: x * 2,
            
            # Convert 75mg diclofenac to 50mg equivalent (1.5x quantity)
            'DICLOFENAC 75MG INJECTION': lambda x: x * 1.5,
            'DICLOFENAC 75MG CAPSULE': lambda x: x * 1.5,
            
            # Convert 200mg metronidazole to 400mg equivalent (0.5x quantity)
            'METRONIDAZOLE 200MG TABLET': lambda x: x * 0.5,
            'METRONIDAZOLE 200MG/5ML SUSPENSION': lambda x: x * 0.5,
            
            # Convert 500mg metronidazole to 400mg equivalent (1.25x quantity)
            'METRONIDAZOLE 500MG INJECTION': lambda x: x * 1.25,
        }
        
        if drug_csv in conversions:
            return conversions[drug_csv](quantity)
        return quantity
    
    def process_csv_file(self, filepath: str) -> pd.DataFrame:
        """Process a single CSV file into standardized format"""
        print(f"Processing {filepath}...")
        
        df = pd.read_csv(filepath)
        
        # Get column names
        date_col = df.columns[0]
        opd_col = df.columns[1] if len(df.columns) > 1 else None
        sex_col = df.columns[2] if len(df.columns) > 2 else None
        drug_cols = df.columns[3:]
        
        processed_data = []
        current_date = None
        
        # Process each row, tracking the current date
        for idx, row in df.iterrows():
            # Check if this row contains a date
            date_val = self._standardize_date(row[date_col])
            if date_val is not None:
                current_date = date_val  # Update current date
                continue  # Skip date rows, move to patient data
                
            # If we have a current date and this looks like patient data
            if current_date is not None:
                # Check if this row has drug consumption data
                has_drug_data = False
                
                # Process each drug column for this patient visit
                for drug_csv in drug_cols:
                    if drug_csv in self.drug_mapping:
                        # Get quantity used with robust numeric parsing
                        quantity = pd.to_numeric(row[drug_csv], errors='coerce')
                        
                        if pd.notna(quantity) and quantity > 0:
                            has_drug_data = True
                            # Convert dosage if needed
                            adjusted_quantity = self._convert_dosage_equivalent(drug_csv, quantity)
                            
                            processed_data.append({
                                'date': current_date.date(),
                                'drug_name_standard': self.drug_mapping[drug_csv],
                                'drug_name_csv': drug_csv,
                                'quantity_used': adjusted_quantity,
                                'source_file': os.path.basename(filepath)
                            })
                
                # If no drug data found in this row, it might be end of date section
                if not has_drug_data:
                    # Check if the next few rows are empty - if so, reset current_date
                    empty_rows_ahead = 0
                    for check_idx in range(idx + 1, min(idx + 5, len(df))):
                        check_row = df.iloc[check_idx]
                        row_has_data = False
                        for col in drug_cols:
                            if str(check_row[col]).strip() and str(check_row[col]) != 'nan':
                                row_has_data = True
                                break
                        if not row_has_data:
                            empty_rows_ahead += 1
                        else:
                            break
                    
                    if empty_rows_ahead >= 2:  # Multiple empty rows suggest end of date section
                        current_date = None
        
        return pd.DataFrame(processed_data)
    
    def aggregate_daily_consumption(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aggregate patient visits into daily consumption totals"""
        print("Aggregating daily consumption...")
        
        # Group by date and drug, sum quantities
        daily_consumption = df.groupby(['date', 'drug_name_standard']).agg({
            'quantity_used': 'sum',
            'source_file': 'first'  # Just keep track of source
        }).reset_index()
        
        # Rename columns to match ML service format
        daily_consumption = daily_consumption.rename(columns={
            'drug_name_standard': 'drug_name'
        })
        
        return daily_consumption
    
    def fill_missing_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fill in missing dates with zero consumption using vectorized operations"""
        print("Filling missing dates...")
        
        # Get date range
        min_date = df['date'].min()
        max_date = df['date'].max()
        all_dates = pd.date_range(min_date, max_date).date
        
        # Get all drugs
        all_drugs = df['drug_name'].unique()
        
        # Create complete MultiIndex from cartesian product of dates and drugs
        complete_index = pd.MultiIndex.from_product(
            [all_dates, all_drugs], 
            names=['date', 'drug_name']
        )
        
        # Set MultiIndex on original DataFrame
        df_indexed = df.set_index(['date', 'drug_name'])
        
        # Reindex to complete MultiIndex, filling missing values
        complete_df = df_indexed.reindex(complete_index, fill_value=0)
        
        # Fill missing source_file values
        complete_df['source_file'] = complete_df['source_file'].fillna('filled')
        
        # Reset index to get back to regular DataFrame
        return complete_df.reset_index()
    
    def validate_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """Validate and clean the processed data"""
        print("Validating data...")
        
        validation_report = {
            'total_records': len(df),
            'date_range': (df['date'].min(), df['date'].max()),
            'drugs_found': sorted(df['drug_name'].unique().tolist()),
            'total_consumption': df['quantity_used'].sum(),
            'average_daily_consumption': df.groupby('date')['quantity_used'].sum().mean(),
            'zero_consumption_days': len(df[df['quantity_used'] == 0]),
            'outliers': []
        }
        
        # Check for outliers (consumption > 100 units per day per drug)
        outliers = df[df['quantity_used'] > 100]
        if not outliers.empty:
            validation_report['outliers'] = outliers[['date', 'drug_name', 'quantity_used']].to_dict('records')
        
        # Remove extreme outliers (> 500 units per day per drug)
        df_cleaned = df[df['quantity_used'] <= 500].copy()
        
        print(f"Validation complete:")
        print(f"- Total records: {validation_report['total_records']}")
        print(f"- Date range: {validation_report['date_range'][0]} to {validation_report['date_range'][1]}")
        print(f"- Drugs: {len(validation_report['drugs_found'])}")
        print(f"- Total consumption: {validation_report['total_consumption']:,.0f} units")
        print(f"- Outliers removed: {len(df) - len(df_cleaned)}")
        
        return df_cleaned, validation_report
    
    def get_drug_ids_from_db(self) -> Dict[str, int]:
        """Get drug IDs from database"""
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, name FROM drugs ORDER BY id"))
            drugs_db = result.fetchall()
        
        return {row[1]: row[0] for row in drugs_db}
    
    def process_all_files(self) -> Tuple[pd.DataFrame, Dict]:
        """Process all CSV files and combine into final dataset"""
        print("=== Processing Real Consumption Data ===")
        
        all_processed_data = []
        
        # Process each CSV file
        for csv_file in self.csv_files:
            if os.path.exists(csv_file):
                file_data = self.process_csv_file(csv_file)
                if not file_data.empty:
                    all_processed_data.append(file_data)
                    print(f"✅ {csv_file}: {len(file_data)} records processed")
                else:
                    print(f"⚠️  {csv_file}: No valid data found")
            else:
                print(f"❌ {csv_file}: File not found")
        
        if not all_processed_data:
            raise ValueError("No data was processed from any CSV files")
        
        # Combine all data
        combined_df = pd.concat(all_processed_data, ignore_index=True)
        print(f"\n📊 Combined raw data: {len(combined_df)} records")
        
        # Aggregate by day
        daily_df = self.aggregate_daily_consumption(combined_df)
        print(f"📊 Daily aggregated data: {len(daily_df)} records")
        
        # Fill missing dates
        complete_df = self.fill_missing_dates(daily_df)
        print(f"📊 Complete time series: {len(complete_df)} records")
        
        # Validate and clean
        final_df, validation_report = self.validate_data(complete_df)
        print(f"📊 Final cleaned data: {len(final_df)} records")
        
        return final_df, validation_report
    
    def prepare_for_ml_service(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare data in format expected by ML service"""
        print("Preparing data for ML service...")
        
        # Get drug IDs from database
        try:
            drug_id_map = self.get_drug_ids_from_db()
            print(f"Found {len(drug_id_map)} drugs in database")
        except Exception as e:
            print(f"Warning: Could not connect to database: {e}")
            # Create dummy IDs for testing
            drug_id_map = {drug: idx+1 for idx, drug in enumerate(df['drug_name'].unique())}
        
        # Add drug IDs
        df['drug_id'] = df['drug_name'].map(drug_id_map)
        
        # Filter to only drugs that exist in the system
        df = df[df['drug_id'].notna()].copy()
        
        # Ensure proper data types
        df['date'] = pd.to_datetime(df['date'])
        df['quantity_used'] = df['quantity_used'].astype(int)
        df['drug_id'] = df['drug_id'].astype(int)
        
        # Sort by drug and date
        df = df.sort_values(['drug_id', 'date']).reset_index(drop=True)
        
        print(f"✅ ML-ready data: {len(df)} records for {df['drug_id'].nunique()} drugs")
        
        return df[['drug_id', 'date', 'quantity_used', 'drug_name']]

def main():
    """Main processing function"""
    try:
        processor = RealDataProcessor()
        
        # Process all files
        processed_df, validation_report = processor.process_all_files()
        
        # Prepare for ML service
        ml_ready_df = processor.prepare_for_ml_service(processed_df)
        
        # Save processed data
        output_file = 'processed_real_consumption_data.csv'
        ml_ready_df.to_csv(output_file, index=False)
        print(f"\n✅ Processed data saved to: {output_file}")
        
        # Display summary
        print(f"\n=== FINAL SUMMARY ===")
        print(f"Date range: {ml_ready_df['date'].min().date()} to {ml_ready_df['date'].max().date()}")
        print(f"Total days: {ml_ready_df['date'].nunique()}")
        print(f"Drugs covered: {ml_ready_df['drug_id'].nunique()}")
        print(f"Total consumption: {ml_ready_df['quantity_used'].sum():,.0f} units")
        
        print(f"\nConsumption by drug:")
        drug_summary = ml_ready_df.groupby('drug_name')['quantity_used'].agg(['sum', 'mean', 'std']).round(2)
        print(drug_summary)
        
        print(f"\n🎯 Ready for model retraining!")
        
    except Exception as e:
        print(f"\n❌ Error processing data: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()