import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy import create_engine, text
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_URL

class PredictionService:
    def __init__(self):
        self.models = {}
        self.drug_info = {}
        self.model_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'trained')
        self.load_models()
        self.load_drug_info()
    
    def load_models(self):
        """Load all trained models"""
        print("Loading trained models...")
        
        if not os.path.exists(self.model_dir):
            print(f"Model directory not found: {self.model_dir}")
            return
        
        for filename in os.listdir(self.model_dir):
            if filename.endswith('.pkl'):
                try:
                    # Extract drug_id from filename
                    parts = filename.split('_')
                    if len(parts) >= 2 and parts[0] == 'model':
                        drug_id = int(parts[1])
                        model_path = os.path.join(self.model_dir, filename)
                        self.models[drug_id] = joblib.load(model_path)
                        print(f"  Loaded model for drug_id {drug_id}")
                except Exception as e:
                    print(f"  Failed to load model {filename}: {e}")
                    continue
        
        print(f"Loaded {len(self.models)} models")
    
    def load_drug_info(self):
        """Load drug information from database"""
        engine = create_engine(DATABASE_URL)
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT id, name, unit, reorderlevel, reorderquantity
                    FROM drugs
                    ORDER BY id
                """))
                
                for row in result:
                    self.drug_info[row[0]] = {
                        'name': row[1],
                        'unit': row[2],
                        'reorder_level': row[3],
                        'reorder_quantity': row[4]
                    }
                
                print(f"Loaded {len(self.drug_info)} drug records")
        except Exception as e:
            print(f"Error loading drug info: {e}")
    
    def get_current_stock(self, drug_id: int) -> int:
        """Get current stock level for a drug"""
        engine = create_engine(DATABASE_URL)
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT closing_stock 
                    FROM inventory 
                    WHERE drug_id = :drug_id 
                    ORDER BY date DESC 
                    LIMIT 1
                """), {'drug_id': drug_id})
                
                row = result.fetchone()
                return row[0] if row else 0
        except Exception as e:
            print(f"Error getting current stock: {e}")
            return 0
    
    def get_recent_usage(self, drug_id: int, days: int = 14) -> List[float]:
        """Get recent usage data for feature calculation"""
        engine = create_engine(DATABASE_URL)
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT quantity_used
                    FROM inventory
                    WHERE drug_id = :drug_id
                    AND date >= CURRENT_DATE - INTERVAL '1 day' * :days
                    ORDER BY date DESC
                    LIMIT :days
                """), {'drug_id': drug_id, 'days': days})
                
                usage_values = [row[0] for row in result]
                return usage_values
        except Exception as e:
            print(f"Error getting recent usage: {e}")
            return []
    
    def prepare_features(self, drug_id: int, forecast_date: datetime) -> pd.DataFrame:
        """Prepare features for prediction"""
        # Get recent usage for lag features
        usage_values = self.get_recent_usage(drug_id)
        
        if len(usage_values) == 0:
            # Use default values if no recent data
            usage_values = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
        else:
            # Pad with mean if not enough data
            mean_usage = np.mean(usage_values)
            while len(usage_values) < 14:
                usage_values.append(mean_usage)
        
        # Calculate features
        features = pd.DataFrame({
            'day_of_week': [forecast_date.weekday()],
            'day_of_month': [forecast_date.day],
            'month': [forecast_date.month],
            'week_of_month': [(forecast_date.day - 1) // 7 + 1],
            'is_weekend': [1 if forecast_date.weekday() >= 5 else 0],
            'is_month_end': [1 if forecast_date.day > 25 else 0],
            'is_rainy_season': [1 if forecast_date.month in [4, 5, 6, 7, 9, 10, 11] else 0],
            'usage_lag_1': [usage_values[0] if len(usage_values) > 0 else 30],
            'usage_lag_3': [usage_values[2] if len(usage_values) > 2 else 30],
            'usage_lag_7': [usage_values[6] if len(usage_values) > 6 else 30],
            'usage_lag_14': [usage_values[13] if len(usage_values) > 13 else 30],
            'usage_mean_7d': [np.mean(usage_values[:7]) if len(usage_values) >= 7 else 30],
            'usage_std_7d': [np.std(usage_values[:7]) if len(usage_values) >= 7 else 5],
            'usage_mean_14d': [np.mean(usage_values[:14]) if len(usage_values) >= 14 else 30],
            'usage_std_14d': [np.std(usage_values[:14]) if len(usage_values) >= 14 else 5],
            'stock_level_ratio': [1.0]  # Simplified
        })
        
        return features
    
    def predict_demand(self, drug_id: int, days: int = 7) -> List[Dict]:
        """Predict demand for next N days"""
        if drug_id not in self.models:
            raise ValueError(f"No model found for drug_id {drug_id}")
        
        model = self.models[drug_id]
        predictions = []
        
        start_date = datetime.now().date() + timedelta(days=1)
        
        for i in range(days):
            forecast_date = start_date + timedelta(days=i)
            features = self.prepare_features(drug_id, forecast_date)
            
            # Make prediction
            pred = model.predict(features)[0]
            
            # Ensure non-negative
            pred = max(0, pred)
            
            predictions.append({
                'date': forecast_date.isoformat(),
                'predicted_demand': round(float(pred), 1),
                'day_of_week': forecast_date.strftime('%A')
            })
        
        return predictions
    
    def get_recommendation(self, drug_id: int, current_stock: int, predictions: List[Dict]) -> str:
        """Generate recommendation based on predictions"""
        total_predicted = sum(p['predicted_demand'] for p in predictions)
        days_of_stock = current_stock / (total_predicted / 7) if total_predicted > 0 else 999
        
        if drug_id in self.drug_info:
            reorder_level = self.drug_info[drug_id]['reorder_level']
        else:
            reorder_level = 50  # Default fallback
        
        if current_stock <= reorder_level:
            return "⚠️ URGENT: Stock below reorder level. Order immediately!"
        elif days_of_stock <= 3:
            return "🔴 Critical: Stock will last only {:.0f} days. Order now!".format(days_of_stock)
        elif days_of_stock <= 7:
            return "🟡 Warning: Stock will last {:.0f} days. Consider ordering soon.".format(days_of_stock)
        else:
            return "✅ Good: Stock sufficient for {:.0f} days.".format(min(days_of_stock, 30))

# Global instance
prediction_service = None

def get_prediction_service():
    global prediction_service
    if prediction_service is None:
        prediction_service = PredictionService()
    return prediction_service