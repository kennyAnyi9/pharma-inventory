import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from config import DATABASE_URL

def test_model_predictions():
    """Test loading and using a trained model"""
    MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'trained')
    
    # Check if models directory exists
    if not os.path.exists(MODEL_DIR):
        print("Models directory not found! Run training first.")
        return
    
    # List available models
    models = [f for f in os.listdir(MODEL_DIR) if f.endswith('.pkl')]
    print(f"Found {len(models)} trained models:")
    for model_file in models:
        print(f"  - {model_file}")
    
    if not models:
        print("No models found! Run training first.")
        return
    
    # Load first model as example
    model_path = os.path.join(MODEL_DIR, models[0])
    model = joblib.load(model_path)
    print(f"\nLoaded model: {models[0]}")
    
    # Create sample features for tomorrow's prediction
    tomorrow = datetime.now().date() + timedelta(days=1)
    
    # Sample feature vector (you'd normally calculate these from real data)
    sample_features = pd.DataFrame({
        'day_of_week': [tomorrow.weekday()],
        'day_of_month': [tomorrow.day],
        'month': [tomorrow.month],
        'week_of_month': [(tomorrow.day - 1) // 7 + 1],
        'is_weekend': [1 if tomorrow.weekday() >= 5 else 0],
        'is_month_end': [1 if tomorrow.day > 25 else 0],
        'is_rainy_season': [1 if tomorrow.month in [4,5,6,7,9,10,11] else 0],
        'usage_lag_1': [45],  # Yesterday's usage
        'usage_lag_3': [43],  # 3 days ago
        'usage_lag_7': [48],  # Week ago
        'usage_lag_14': [46], # 2 weeks ago
        'usage_mean_7d': [45.5],
        'usage_std_7d': [5.2],
        'usage_mean_14d': [44.8],
        'usage_std_14d': [6.1],
        'stock_level_ratio': [1.2],
        'recent_stockout': [0]
    })
    
    # Make prediction
    prediction = model.predict(sample_features)[0]
    
    print(f"\nPrediction for {tomorrow}:")
    print(f"Expected demand: {prediction:.1f} units")
    print(f"Confidence range: {prediction*0.8:.1f} - {prediction*1.2:.1f} units")
    
    # Test multiple models if available
    if len(models) > 1:
        print(f"\nTesting all {len(models)} models:")
        print("-" * 50)
        
        for model_file in models:
            try:
                model_path = os.path.join(MODEL_DIR, model_file)
                model = joblib.load(model_path)
                prediction = model.predict(sample_features)[0]
                
                # Extract drug name from filename
                drug_name = model_file.replace('model_', '').replace('.pkl', '').replace('_', ' ').title()
                
                print(f"{drug_name:<30} {prediction:>6.1f} units")
                
            except Exception as e:
                print(f"Error testing {model_file}: {str(e)}")

def load_recent_data_for_prediction(drug_id, days_back=14):
    """Load recent data to make realistic predictions"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                quantity_used,
                opening_stock,
                stockout_flag,
                date
            FROM inventory 
            WHERE drug_id = :drug_id 
            ORDER BY date DESC 
            LIMIT :days_back
        """), {'drug_id': drug_id, 'days_back': days_back})
        
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
    return df

def make_realistic_prediction():
    """Make a prediction using real recent data"""
    MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'trained')
    
    # Check if models exist
    models = [f for f in os.listdir(MODEL_DIR) if f.endswith('.pkl')]
    if not models:
        print("No models found! Run training first.")
        return
    
    # Use first model and extract drug_id
    model_file = models[0]
    model_path = os.path.join(MODEL_DIR, model_file)
    model = joblib.load(model_path)
    
    # Extract drug_id from filename (format: model_{drug_id}_{name}.pkl)
    try:
        drug_id = int(model_file.split('_')[1])
    except:
        print("Could not extract drug_id from model filename")
        return
    
    print(f"\nMaking realistic prediction using recent data...")
    print(f"Drug ID: {drug_id}")
    
    # Load recent data
    recent_data = load_recent_data_for_prediction(drug_id)
    
    if len(recent_data) < 7:
        print("Not enough recent data for realistic prediction")
        return
    
    # Calculate features from recent data
    tomorrow = datetime.now().date() + timedelta(days=1)
    
    # Use actual recent values
    recent_usage = recent_data['quantity_used'].iloc[:14].tolist()
    recent_stock = recent_data['opening_stock'].mean()
    recent_stockout = recent_data['stockout_flag'].iloc[:7].max()
    
    # Create feature vector with real data
    features = pd.DataFrame({
        'day_of_week': [tomorrow.weekday()],
        'day_of_month': [tomorrow.day],
        'month': [tomorrow.month],
        'week_of_month': [(tomorrow.day - 1) // 7 + 1],
        'is_weekend': [1 if tomorrow.weekday() >= 5 else 0],
        'is_month_end': [1 if tomorrow.day > 25 else 0],
        'is_rainy_season': [1 if tomorrow.month in [4,5,6,7,9,10,11] else 0],
        'usage_lag_1': [recent_usage[0] if len(recent_usage) > 0 else 20],
        'usage_lag_3': [recent_usage[2] if len(recent_usage) > 2 else 20],
        'usage_lag_7': [recent_usage[6] if len(recent_usage) > 6 else 20],
        'usage_lag_14': [recent_usage[13] if len(recent_usage) > 13 else 20],
        'usage_mean_7d': [np.mean(recent_usage[:7])],
        'usage_std_7d': [np.std(recent_usage[:7])],
        'usage_mean_14d': [np.mean(recent_usage[:14])],
        'usage_std_14d': [np.std(recent_usage[:14])],
        'stock_level_ratio': [recent_stock / (recent_stock + 1)],
        'recent_stockout': [recent_stockout]
    })
    
    # Make prediction
    prediction = model.predict(features)[0]
    
    print(f"\nRealistic prediction for {tomorrow}:")
    print(f"Expected demand: {prediction:.1f} units")
    print(f"Based on recent usage: {recent_usage[:7]}")
    print(f"7-day average: {np.mean(recent_usage[:7]):.1f} units")

if __name__ == "__main__":
    print("="*50)
    print("Testing Trained XGBoost Models")
    print("="*50)
    
    test_model_predictions()
    
    print("\n" + "="*50)
    print("Making Realistic Prediction")
    print("="*50)
    
    make_realistic_prediction()