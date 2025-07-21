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
                    SELECT id, name, unit, reorder_level, reorder_quantity
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
                result = conn.execute(text(f"""
                    SELECT quantity_used
                    FROM inventory
                    WHERE drug_id = :drug_id
                    AND date >= CURRENT_DATE - INTERVAL '{days} days'
                    ORDER BY date DESC
                    LIMIT :days
                """), {'drug_id': drug_id, 'days': days})
                
                usage_values = [row[0] for row in result]
                return usage_values
        except Exception as e:
            print(f"Error getting recent usage: {e}")
            return []
    
    def get_recent_usage_batch(self, days: int = 14) -> Dict[int, pd.DataFrame]:
        """Get recent usage data for ALL drugs at once"""
        engine = create_engine(DATABASE_URL)
        
        try:
            query = f"""
            SELECT drug_id, date, quantity_used, opening_stock, closing_stock
            FROM inventory
            WHERE date >= CURRENT_DATE - INTERVAL '{days} days'
            ORDER BY drug_id, date DESC
            """
            
            df = pd.read_sql(query, engine)
            df['date'] = pd.to_datetime(df['date'])
            
            # Group by drug_id
            usage_by_drug = {}
            for drug_id, group in df.groupby('drug_id'):
                usage_by_drug[drug_id] = group.sort_values('date', ascending=False)
            
            return usage_by_drug
        except Exception as e:
            print(f"Error getting batch usage data: {e}")
            return {}
    
    def get_all_current_stock(self) -> Dict[int, int]:
        """Get current stock levels for all drugs in one query"""
        engine = create_engine(DATABASE_URL)
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT DISTINCT ON (drug_id) 
                        drug_id, 
                        closing_stock
                    FROM inventory
                    ORDER BY drug_id, date DESC
                """))
                
                return {row[0]: row[1] for row in result}
        except Exception as e:
            print(f"Error getting all current stock: {e}")
            return {}
    
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
    
    def predict_all_drugs(self, days: int = 7) -> Dict[int, Dict]:
        """Optimized method to predict all drugs at once"""
        # Get all recent usage data in ONE query
        all_usage = self.get_recent_usage_batch()
        
        # Get all current stock in ONE query
        all_stock = self.get_all_current_stock()
        
        predictions = {}
        
        for drug_id, model in self.models.items():
            # Use cached usage data
            recent_usage = all_usage.get(drug_id, pd.DataFrame())
            
            # Generate predictions for this drug
            drug_predictions = []
            start_date = datetime.now().date() + timedelta(days=1)
            
            # Prepare usage values once
            if len(recent_usage) == 0:
                usage_values = [30] * 14
            else:
                usage_values = recent_usage['quantity_used'].tolist()[:14]
                mean_usage = recent_usage['quantity_used'].mean()
                while len(usage_values) < 14:
                    usage_values.append(mean_usage)
            
            # Batch prepare features for all days
            for i in range(days):
                forecast_date = start_date + timedelta(days=i)
                
                features = pd.DataFrame({
                    'day_of_week': [forecast_date.weekday()],
                    'day_of_month': [forecast_date.day],
                    'month': [forecast_date.month],
                    'week_of_month': [(forecast_date.day - 1) // 7 + 1],
                    'is_weekend': [1 if forecast_date.weekday() >= 5 else 0],
                    'is_month_end': [1 if forecast_date.day > 25 else 0],
                    'is_rainy_season': [1 if forecast_date.month in [4, 5, 6, 7, 9, 10, 11] else 0],
                    'usage_lag_1': [usage_values[0]],
                    'usage_lag_3': [usage_values[2] if len(usage_values) > 2 else 30],
                    'usage_lag_7': [usage_values[6] if len(usage_values) > 6 else 30],
                    'usage_lag_14': [usage_values[13] if len(usage_values) > 13 else 30],
                    'usage_mean_7d': [np.mean(usage_values[:7])],
                    'usage_std_7d': [np.std(usage_values[:7]) if len(usage_values) >= 7 else 5],
                    'usage_mean_14d': [np.mean(usage_values[:14])],
                    'usage_std_14d': [np.std(usage_values[:14]) if len(usage_values) >= 14 else 5],
                    'stock_level_ratio': [1.0]
                })
                
                pred = model.predict(features)[0]
                pred = max(0, pred)
                
                drug_predictions.append({
                    'date': forecast_date.isoformat(),
                    'predicted_demand': round(float(pred), 1),
                    'day_of_week': forecast_date.strftime('%A')
                })
            
            predictions[drug_id] = {
                'predictions': drug_predictions,
                'current_stock': all_stock.get(drug_id, 0)
            }
        
        return predictions
    
    def calculate_trend_adjustment(self, drug_id: int, days: int = 7) -> float:
        """Calculate trend adjustment factor based on recent usage patterns"""
        try:
            # Get recent usage data (last 30 days)
            recent_usage = self.get_recent_usage(drug_id, days=30)
            
            if len(recent_usage) < 14:
                return 1.0  # No adjustment if insufficient data
            
            # Split into recent (last 7 days) and older (8-14 days ago)
            recent_7_days = recent_usage[:7]
            older_7_days = recent_usage[7:14]
            
            recent_avg = np.mean(recent_7_days) if recent_7_days else 0
            older_avg = np.mean(older_7_days) if older_7_days else 0
            
            # Avoid division by zero
            if older_avg == 0:
                return 1.0
            
            # Calculate trend ratio
            trend_ratio = recent_avg / older_avg
            
            # Cap the adjustment to prevent extreme changes
            # Allow 50% increase/decrease max
            trend_ratio = max(0.5, min(1.5, trend_ratio))
            
            # Smooth the adjustment (don't change too drastically)
            smoothed_ratio = 0.7 * trend_ratio + 0.3 * 1.0
            
            return smoothed_ratio
            
        except Exception as e:
            print(f"Error calculating trend adjustment for drug {drug_id}: {e}")
            return 1.0
    
    def calculate_seasonality_adjustment(self, forecast_date: datetime, drug_id: int) -> float:
        """Calculate seasonal adjustment based on day of week patterns (fast version)"""
        try:
            # Use cached historical data if available
            if not hasattr(self, '_seasonal_cache'):
                self._seasonal_cache = {}
            
            # Check cache first
            cache_key = f"{drug_id}_{forecast_date.weekday()}"
            if cache_key in self._seasonal_cache:
                return self._seasonal_cache[cache_key]
            
            # Get recent usage data (already optimized batch query)
            recent_usage = self.get_recent_usage(drug_id, days=21)  # 3 weeks
            
            if len(recent_usage) < 14:
                return 1.0  # Not enough data
            
            # Simple day-of-week analysis using available data
            dow = forecast_date.weekday()  # 0=Monday, 6=Sunday
            
            # Find usage on same day of week
            dow_usage = []
            for i, usage in enumerate(recent_usage):
                # Approximate day calculation (rough but fast)
                if (len(recent_usage) - 1 - i) % 7 == (6 - dow):  # Rough weekday match
                    dow_usage.append(usage)
            
            if len(dow_usage) >= 2:
                dow_avg = np.mean(dow_usage)
                overall_avg = np.mean(recent_usage)
                
                if overall_avg > 0:
                    seasonal_factor = dow_avg / overall_avg
                    # Cap adjustment to prevent extreme values
                    seasonal_factor = max(0.8, min(1.2, seasonal_factor))
                    
                    # Cache result
                    self._seasonal_cache[cache_key] = seasonal_factor
                    return seasonal_factor
            
            return 1.0
            
        except Exception as e:
            print(f"Error calculating seasonality adjustment for drug {drug_id}: {e}")
            return 1.0
    
    def get_adaptive_predictions(self, drug_id: int, days: int = 7) -> List[Dict]:
        """Get XGBoost predictions with adaptive adjustments"""
        # Get base XGBoost predictions
        base_predictions = self.predict_demand(drug_id, days)
        
        # Calculate trend adjustment
        trend_factor = self.calculate_trend_adjustment(drug_id, days)
        
        # Apply adaptive adjustments
        adaptive_predictions = []
        
        for pred in base_predictions:
            forecast_date = datetime.fromisoformat(pred['date'])
            
            # Calculate seasonality adjustment for this specific day
            seasonal_factor = self.calculate_seasonality_adjustment(forecast_date, drug_id)
            
            # Combine adjustments
            base_demand = pred['predicted_demand']
            adjusted_demand = base_demand * trend_factor * seasonal_factor
            
            # Ensure non-negative and reasonable
            adjusted_demand = max(0, adjusted_demand)
            
            adaptive_predictions.append({
                'date': pred['date'],
                'predicted_demand': round(float(adjusted_demand), 1),
                'day_of_week': pred['day_of_week'],
                'base_prediction': base_demand,
                'trend_factor': round(trend_factor, 2),
                'seasonal_factor': round(seasonal_factor, 2),
                'adjustment_applied': round(trend_factor * seasonal_factor, 2)
            })
        
        return adaptive_predictions
    
    def predict_all_drugs_adaptive(self, days: int = 7) -> Dict[int, Dict]:
        """Optimized adaptive predictions for all drugs"""
        # Get all recent usage data and current stock (existing optimization)
        all_usage = self.get_recent_usage_batch(days=30)  # Get more data for trend analysis
        all_stock = self.get_all_current_stock()
        
        predictions = {}
        
        for drug_id, model in self.models.items():
            # Calculate trend adjustment for this drug
            recent_usage = all_usage.get(drug_id, pd.DataFrame())
            trend_factor = 1.0
            
            if len(recent_usage) >= 14:
                # Calculate trend from cached data
                recent_7 = recent_usage['quantity_used'].head(7).mean()
                older_7 = recent_usage['quantity_used'].iloc[7:14].mean()
                
                if older_7 > 0:
                    trend_factor = recent_7 / older_7
                    trend_factor = max(0.5, min(1.5, trend_factor))
                    trend_factor = 0.7 * trend_factor + 0.3 * 1.0  # Smooth
            
            # Generate base predictions
            drug_predictions = []
            start_date = datetime.now().date() + timedelta(days=1)
            
            # Prepare usage values once
            if len(recent_usage) == 0:
                usage_values = [30] * 14
            else:
                usage_values = recent_usage['quantity_used'].tolist()[:14]
                mean_usage = recent_usage['quantity_used'].mean()
                while len(usage_values) < 14:
                    usage_values.append(mean_usage)
            
            # Generate predictions with adaptive adjustments
            for i in range(days):
                forecast_date = start_date + timedelta(days=i)
                
                # Base XGBoost prediction (existing logic)
                features = pd.DataFrame({
                    'day_of_week': [forecast_date.weekday()],
                    'day_of_month': [forecast_date.day],
                    'month': [forecast_date.month],
                    'week_of_month': [(forecast_date.day - 1) // 7 + 1],
                    'is_weekend': [1 if forecast_date.weekday() >= 5 else 0],
                    'is_month_end': [1 if forecast_date.day > 25 else 0],
                    'is_rainy_season': [1 if forecast_date.month in [4, 5, 6, 7, 9, 10, 11] else 0],
                    'usage_lag_1': [usage_values[0]],
                    'usage_lag_3': [usage_values[2] if len(usage_values) > 2 else 30],
                    'usage_lag_7': [usage_values[6] if len(usage_values) > 6 else 30],
                    'usage_lag_14': [usage_values[13] if len(usage_values) > 13 else 30],
                    'usage_mean_7d': [np.mean(usage_values[:7])],
                    'usage_std_7d': [np.std(usage_values[:7]) if len(usage_values) >= 7 else 5],
                    'usage_mean_14d': [np.mean(usage_values[:14])],
                    'usage_std_14d': [np.std(usage_values[:14]) if len(usage_values) >= 14 else 5],
                    'stock_level_ratio': [1.0]
                })
                
                base_pred = model.predict(features)[0]
                base_pred = max(0, base_pred)
                
                # Apply adaptive adjustments (simplified for batch operations)
                seasonal_factor = 1.0  # Disable seasonal for batch to avoid timeouts
                adjusted_pred = base_pred * trend_factor * seasonal_factor
                adjusted_pred = max(0, adjusted_pred)
                
                drug_predictions.append({
                    'date': forecast_date.isoformat(),
                    'predicted_demand': round(float(adjusted_pred), 1),
                    'day_of_week': forecast_date.strftime('%A'),
                    'base_prediction': round(float(base_pred), 1),
                    'trend_factor': round(trend_factor, 2),
                    'seasonal_factor': round(seasonal_factor, 2)
                })
            
            predictions[drug_id] = {
                'predictions': drug_predictions,
                'current_stock': all_stock.get(drug_id, 0)
            }
        
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