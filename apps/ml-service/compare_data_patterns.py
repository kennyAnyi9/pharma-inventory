import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append('src')
from data.generate_synthetic_data import DRUG_PATTERNS, generate_usage
from config import HISTORICAL_DAYS

def compare_real_vs_synthetic():
    """Compare patterns between real and synthetic data"""
    
    print("=== Real vs Synthetic Data Comparison ===")
    
    # Load real data
    real_df = pd.read_csv('processed_real_consumption_data.csv')
    real_df['date'] = pd.to_datetime(real_df['date'])
    
    # Generate synthetic data for comparison
    print("Generating synthetic data for comparison...")
    end_date = datetime.now().date() - timedelta(days=1)
    start_date = end_date - timedelta(days=89)  # Match real data timeframe
    
    synthetic_data = []
    for current_date in pd.date_range(start_date, end_date):
        for drug_name, pattern in DRUG_PATTERNS.items():
            usage = generate_usage(drug_name, current_date, pattern)
            synthetic_data.append({
                'date': current_date.date(),
                'drug_name': drug_name,
                'quantity_used': usage
            })
    
    synthetic_df = pd.DataFrame(synthetic_data)
    synthetic_df['date'] = pd.to_datetime(synthetic_df['date'])
    
    print(f"Real data: {len(real_df)} records over {real_df['date'].nunique()} days")
    print(f"Synthetic data: {len(synthetic_df)} records over {synthetic_df['date'].nunique()} days")
    
    # Compare consumption patterns by drug
    comparison_results = {}
    
    for drug in real_df['drug_name'].unique():
        real_drug = real_df[real_df['drug_name'] == drug]['quantity_used']
        
        # Find matching synthetic drug
        synthetic_drug = synthetic_df[synthetic_df['drug_name'] == drug]['quantity_used']
        if synthetic_drug.empty:
            print(f"Warning: {drug} not found in synthetic data")
            continue
            
        comparison_results[drug] = {
            'real_mean': real_drug.mean(),
            'real_std': real_drug.std(),
            'real_max': real_drug.max(),
            'real_min': real_drug.min(),
            'synthetic_mean': synthetic_drug.mean(),
            'synthetic_std': synthetic_drug.std(),
            'synthetic_max': synthetic_drug.max(),
            'synthetic_min': synthetic_drug.min(),
        }
    
    # Print comparison table
    print(f"\n{'='*100}")
    print(f"{'Drug Name':<30} | {'Real Mean':<10} | {'Synth Mean':<10} | {'Real Std':<10} | {'Synth Std':<10} | {'Variance Ratio':<12}")
    print(f"{'='*100}")
    
    total_real = 0
    total_synthetic = 0
    
    for drug, stats in comparison_results.items():
        real_mean = stats['real_mean']
        synth_mean = stats['synthetic_mean']
        real_std = stats['real_std']
        synth_std = stats['synthetic_std']
        
        # Calculate variance ratio (real/synthetic)
        variance_ratio = (real_std / synth_std) if synth_std > 0 else float('inf')
        
        print(f"{drug:<30} | {real_mean:<10.1f} | {synth_mean:<10.1f} | {real_std:<10.1f} | {synth_std:<10.1f} | {variance_ratio:<12.2f}")
        
        total_real += real_mean
        total_synthetic += synth_mean
    
    print(f"{'='*100}")
    print(f"{'TOTAL DAILY AVERAGE':<30} | {total_real:<10.1f} | {total_synthetic:<10.1f}")
    print(f"{'='*100}")
    
    # Analyze temporal patterns
    print(f"\n=== Temporal Pattern Analysis ===")
    
    # Group real data by day of week
    real_df_copy = real_df.copy()
    real_df_copy['day_of_week'] = real_df_copy['date'].dt.day_name()
    real_df_copy['is_weekend'] = real_df_copy['date'].dt.dayofweek >= 5
    
    synthetic_df_copy = synthetic_df.copy()
    synthetic_df_copy['day_of_week'] = synthetic_df_copy['date'].dt.day_name()
    synthetic_df_copy['is_weekend'] = synthetic_df_copy['date'].dt.dayofweek >= 5
    
    # Weekend vs weekday comparison
    real_weekend = real_df_copy[real_df_copy['is_weekend']]['quantity_used'].mean()
    real_weekday = real_df_copy[~real_df_copy['is_weekend']]['quantity_used'].mean()
    
    synthetic_weekend = synthetic_df_copy[synthetic_df_copy['is_weekend']]['quantity_used'].mean()
    synthetic_weekday = synthetic_df_copy[~synthetic_df_copy['is_weekend']]['quantity_used'].mean()
    
    print(f"Weekend vs Weekday Patterns:")
    print(f"  Real data - Weekend: {real_weekend:.1f}, Weekday: {real_weekday:.1f} (ratio: {real_weekend/real_weekday:.2f})")
    print(f"  Synthetic - Weekend: {synthetic_weekend:.1f}, Weekday: {synthetic_weekday:.1f} (ratio: {synthetic_weekend/synthetic_weekday:.2f})")
    
    # Volatility analysis
    print(f"\n=== Volatility Analysis ===")
    
    # Calculate daily total consumption
    real_daily = real_df.groupby('date')['quantity_used'].sum()
    synthetic_daily = synthetic_df.groupby('date')['quantity_used'].sum()
    
    real_volatility = real_daily.std() / real_daily.mean()
    synthetic_volatility = synthetic_daily.std() / synthetic_daily.mean()
    
    print(f"Daily consumption volatility (coefficient of variation):")
    print(f"  Real data: {real_volatility:.3f}")
    print(f"  Synthetic data: {synthetic_volatility:.3f}")
    print(f"  Real data is {real_volatility/synthetic_volatility:.1f}x more volatile")
    
    # Drug-specific insights
    print(f"\n=== Key Insights ===")
    
    high_variance_drugs = []
    low_variance_drugs = []
    
    for drug, stats in comparison_results.items():
        if stats['real_std'] > stats['synthetic_std'] * 1.5:
            high_variance_drugs.append(drug)
        elif stats['real_std'] < stats['synthetic_std'] * 0.7:
            low_variance_drugs.append(drug)
    
    if high_variance_drugs:
        print(f"✅ High variance drugs (real > synthetic): {', '.join(high_variance_drugs)}")
        print("   → Models will benefit from real data's higher volatility patterns")
    
    if low_variance_drugs:
        print(f"⚠️  Low variance drugs (real < synthetic): {', '.join(low_variance_drugs)}")
        print("   → Synthetic data may have overestimated volatility")
    
    # Consumption level differences
    consumption_differences = []
    for drug, stats in comparison_results.items():
        ratio = stats['real_mean'] / stats['synthetic_mean']
        if ratio > 1.5 or ratio < 0.67:
            consumption_differences.append((drug, ratio))
    
    if consumption_differences:
        print(f"\n📊 Significant consumption level differences:")
        for drug, ratio in consumption_differences:
            if ratio > 1:
                print(f"   • {drug}: Real consumption is {ratio:.1f}x higher than synthetic")
            else:
                print(f"   • {drug}: Real consumption is {1/ratio:.1f}x lower than synthetic")
    
    return comparison_results

if __name__ == "__main__":
    results = compare_real_vs_synthetic()