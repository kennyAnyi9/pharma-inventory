import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
import xgboost as xgb
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
import joblib
import json
import os
import sys
import warnings
warnings.filterwarnings('ignore')

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_URL

# Create directories for models
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'trained')
os.makedirs(MODEL_DIR, exist_ok=True)

def load_historical_data():
    """Load historical inventory data from database"""
    print("Loading historical data from database...")
    
    engine = create_engine(DATABASE_URL)
    
    query = """
    SELECT 
        i.drug_id,
        d.name as drug_name,
        i.date,
        i.quantity_used,
        i.opening_stock,
        i.closing_stock,
        i.quantity_received,
        i.stockout_flag
    FROM inventory i
    JOIN drugs d ON d.id = i.drug_id
    WHERE i.date < CURRENT_DATE
    ORDER BY i.drug_id, i.date
    """
    
    df = pd.read_sql(query, engine)
    df['date'] = pd.to_datetime(df['date'])
    
    print(f"Loaded {len(df)} records for {df['drug_id'].nunique()} drugs")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    
    return df

def create_features(df, drug_id):
    """Create features for a specific drug"""
    # Filter for specific drug
    drug_data = df[df['drug_id'] == drug_id].copy()
    drug_data = drug_data.sort_values('date')
    
    # Basic time features
    drug_data['day_of_week'] = drug_data['date'].dt.dayofweek
    drug_data['day_of_month'] = drug_data['date'].dt.day
    drug_data['month'] = drug_data['date'].dt.month
    drug_data['week_of_month'] = (drug_data['date'].dt.day - 1) // 7 + 1
    
    # Is weekend
    drug_data['is_weekend'] = (drug_data['day_of_week'] >= 5).astype(int)
    
    # Is month end (last 5 days)
    drug_data['is_month_end'] = (drug_data['day_of_month'] > 25).astype(int)
    
    # Lag features (previous usage)
    for lag in [1, 3, 7, 14]:
        drug_data[f'usage_lag_{lag}'] = drug_data['quantity_used'].shift(lag)
    
    # Rolling statistics
    for window in [7, 14]:
        drug_data[f'usage_mean_{window}d'] = drug_data['quantity_used'].rolling(window=window, min_periods=1).mean()
        drug_data[f'usage_std_{window}d'] = drug_data['quantity_used'].rolling(window=window, min_periods=1).std()
    
    # Stock level features
    drug_data['stock_level_ratio'] = drug_data['opening_stock'] / (drug_data['opening_stock'].mean() + 1)
    # Removed recent_stockout feature as it showed zero importance across all models
    
    # Ghana-specific features
    # Rainy season indicator (April-July, Sept-Nov)
    drug_data['is_rainy_season'] = drug_data['month'].isin([4, 5, 6, 7, 9, 10, 11]).astype(int)
    
    # Drop rows with NaN in features (from lag/rolling)
    drug_data = drug_data.dropna()
    
    return drug_data

def train_model_for_drug(df, drug_id, drug_name):
    """Train XGBoost model for a specific drug"""
    print(f"\nTraining model for {drug_name}...")
    
    # Create features
    drug_data = create_features(df, drug_id)
    
    if len(drug_data) < 30:
        print(f"⚠️  Not enough data for {drug_name} (only {len(drug_data)} records)")
        return None, None
    
    # Define features and target
    feature_columns = [
        'day_of_week', 'day_of_month', 'month', 'week_of_month',
        'is_weekend', 'is_month_end', 'is_rainy_season',
        'usage_lag_1', 'usage_lag_3', 'usage_lag_7', 'usage_lag_14',
        'usage_mean_7d', 'usage_std_7d', 'usage_mean_14d', 'usage_std_14d',
        'stock_level_ratio'
    ]
    
    X = drug_data[feature_columns]
    y = drug_data['quantity_used']
    
    # Split data (use last 20% for testing, maintaining time order)
    split_index = int(len(X) * 0.8)
    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]
    
    # Train XGBoost model with simple parameters
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    # Fit model
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        early_stopping_rounds=10,
        verbose=False
    )
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # Calculate MAPE with protection against zero/near-zero values
    # Filter out cases where y_test is zero or near-zero to avoid division by zero
    epsilon = 1e-8
    non_zero_mask = np.abs(y_test) > epsilon
    
    if np.sum(non_zero_mask) > 0:
        # Calculate MAPE only for non-zero true values
        y_test_filtered = y_test[non_zero_mask]
        y_pred_filtered = y_pred[non_zero_mask]
        mape = mean_absolute_percentage_error(y_test_filtered, y_pred_filtered) * 100
    else:
        # If all true values are zero/near-zero, use MAE as fallback
        mape = mae  # or set to a reasonable default like 100.0
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"✅ Model trained successfully!")
    print(f"   MAE: {mae:.2f} units")
    print(f"   RMSE: {rmse:.2f} units")
    print(f"   MAPE: {mape:.1f}%")
    print(f"   Top 3 features: {', '.join(feature_importance.head(3)['feature'].tolist())}")
    
    # Save model
    model_filename = f"model_{drug_id}_{drug_name.lower().replace(' ', '_').replace('/', '_')}.pkl"
    model_path = os.path.join(MODEL_DIR, model_filename)
    joblib.dump(model, model_path)
    print(f"   Model saved to: {model_filename}")
    
    # Return metrics
    metrics = {
        'drug_id': int(drug_id),
        'drug_name': drug_name,
        'mae': float(mae),
        'rmse': float(rmse),
        'mape': float(mape),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'model_path': model_filename,
        'feature_importance': feature_importance.to_dict('records'),
        'trained_at': datetime.now().isoformat()
    }
    
    return model, metrics

def visualize_predictions(df, drug_id, drug_name, model):
    """Create a simple visualization of predictions vs actual"""
    try:
        import matplotlib.pyplot as plt
        
        # Get test data
        drug_data = create_features(df, drug_id)
        
        feature_columns = [
            'day_of_week', 'day_of_month', 'month', 'week_of_month',
            'is_weekend', 'is_month_end', 'is_rainy_season',
            'usage_lag_1', 'usage_lag_3', 'usage_lag_7', 'usage_lag_14',
            'usage_mean_7d', 'usage_std_7d', 'usage_mean_14d', 'usage_std_14d',
            'stock_level_ratio'
        ]
        
        X = drug_data[feature_columns]
        y = drug_data['quantity_used']
        dates = drug_data['date']
        
        # Use last 30 days for visualization
        last_30 = -30
        X_vis = X.iloc[last_30:]
        y_vis = y.iloc[last_30:]
        dates_vis = dates.iloc[last_30:]
        
        # Make predictions
        y_pred = model.predict(X_vis)
        
        # Create plot
        plt.figure(figsize=(12, 6))
        plt.plot(dates_vis, y_vis, 'b-', label='Actual', linewidth=2)
        plt.plot(dates_vis, y_pred, 'r--', label='Predicted', linewidth=2)
        plt.fill_between(dates_vis, y_pred * 0.8, y_pred * 1.2, alpha=0.3, color='red', label='20% Error Band')
        
        plt.title(f'{drug_name} - Actual vs Predicted Usage (Last 30 Days)')
        plt.xlabel('Date')
        plt.ylabel('Quantity Used')
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save plot
        plot_filename = f"forecast_{drug_id}_{drug_name.lower().replace(' ', '_').replace('/', '_')}.png"
        plot_path = os.path.join(os.path.dirname(MODEL_DIR), plot_filename)
        plt.savefig(plot_path)
        plt.close()
        
        print(f"   Visualization saved to: {plot_filename}")
        
    except Exception as e:
        print(f"   Could not create visualization: {str(e)}")

def main():
    """Main training function"""
    print("="*60)
    print("XGBoost Model Training for Pharmaceutical Inventory")
    print("="*60)
    
    try:
        # Load data
        df = load_historical_data()
        
        # Get unique drugs
        drugs = df[['drug_id', 'drug_name']].drop_duplicates().sort_values('drug_id')
        
        print(f"\nTraining models for {len(drugs)} drugs...")
        
        all_metrics = []
        successful_models = 0
        
        # Train model for each drug
        for _, drug in drugs.iterrows():
            drug_id = drug['drug_id']
            drug_name = drug['drug_name']
            
            model, metrics = train_model_for_drug(df, drug_id, drug_name)
            
            if model is not None and metrics is not None:
                all_metrics.append(metrics)
                successful_models += 1
                
                # Create visualization
                visualize_predictions(df, drug_id, drug_name, model)
        
        # Save metrics summary
        metrics_path = os.path.join(os.path.dirname(MODEL_DIR), 'training_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump(all_metrics, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("TRAINING SUMMARY")
        print("="*60)
        print(f"Successfully trained: {successful_models}/{len(drugs)} models")
        
        if all_metrics:
            avg_mae = np.mean([m['mae'] for m in all_metrics])
            avg_mape = np.mean([m['mape'] for m in all_metrics])
            
            print(f"Average MAE: {avg_mae:.2f} units")
            print(f"Average MAPE: {avg_mape:.1f}%")
            
            print("\nModel Performance by Drug:")
            print("-" * 40)
            for m in sorted(all_metrics, key=lambda x: x['mape']):
                print(f"{m['drug_name']:<30} MAPE: {m['mape']:>5.1f}%")
        
        print(f"\nModels saved to: {MODEL_DIR}")
        print(f"Metrics saved to: {metrics_path}")
        print("\n✅ Training complete!")
        
    except Exception as e:
        print(f"\n❌ Error during training: {str(e)}")
        import traceback
        traceback.print_exc()

def retrain_models_with_recent_data():
    """Retrain XGBoost models with recent data - called from API endpoint"""
    print("Starting model retraining with recent data...")
    
    try:
        # Load data
        df = load_historical_data()
        
        # Get unique drugs
        drugs = df[['drug_id', 'drug_name']].drop_duplicates().sort_values('drug_id')
        
        training_results = []
        successful_models = 0
        
        # Train model for each drug
        for _, drug in drugs.iterrows():
            drug_id = drug['drug_id']
            drug_name = drug['drug_name']
            
            model, metrics = train_model_for_drug(df, drug_id, drug_name)
            
            if model is not None and metrics is not None:
                training_results.append({
                    'drug_id': drug_id,
                    'drug_name': drug_name,
                    'mae': metrics['mae'],
                    'mape': metrics['mape'],
                    'status': 'success'
                })
                successful_models += 1
            else:
                training_results.append({
                    'drug_id': drug_id,
                    'drug_name': drug_name,
                    'status': 'failed',
                    'reason': 'insufficient_data'
                })
        
        return {
            'total_drugs': len(drugs),
            'successful_models': successful_models,
            'failed_models': len(drugs) - successful_models,
            'results': training_results
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'total_drugs': 0,
            'successful_models': 0,
            'failed_models': 0
        }

if __name__ == "__main__":
    main()