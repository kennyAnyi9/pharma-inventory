#!/usr/bin/env python3
"""
Test script for the Adaptive ML System
This script tests the key functionality of the adaptive predictions system
"""

import sys
import os
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from models.predict import get_prediction_service
from config import DATABASE_URL
from sqlalchemy import create_engine, text

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_subheader(title: str):
    """Print a formatted subheader"""
    print(f"\n🔍 {title}")
    print("-" * 40)

def test_service_initialization():
    """Test if the prediction service initializes correctly"""
    print_header("TESTING SERVICE INITIALIZATION")
    
    try:
        service = get_prediction_service()
        print(f"✅ Service initialized successfully")
        print(f"✅ Loaded {len(service.models)} XGBoost models")
        print(f"✅ Loaded {len(service.drug_info)} drug records")
        
        # List available drugs
        print("\n📋 Available drugs:")
        for drug_id, info in service.drug_info.items():
            print(f"  {drug_id}: {info['name']} ({info['unit']})")
        
        return service
    except Exception as e:
        print(f"❌ Service initialization failed: {e}")
        return None

def test_database_connection():
    """Test database connectivity"""
    print_header("TESTING DATABASE CONNECTION")
    
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            # Test basic query
            result = conn.execute(text("SELECT COUNT(*) FROM drugs"))
            drug_count = result.fetchone()[0]
            print(f"✅ Database connected successfully")
            print(f"✅ Found {drug_count} drugs in database")
            
            # Test inventory data
            result = conn.execute(text("SELECT COUNT(*) FROM inventory"))
            inventory_count = result.fetchone()[0]
            print(f"✅ Found {inventory_count} inventory records")
            
            # Test recent data
            result = conn.execute(text("""
                SELECT COUNT(*) FROM inventory 
                WHERE date >= CURRENT_DATE - INTERVAL '7 days'
            """))
            recent_count = result.fetchone()[0]
            print(f"✅ Found {recent_count} recent inventory records (last 7 days)")
            
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_trend_calculation(service, drug_id: int = 4):
    """Test trend calculation functionality"""
    print_header("TESTING TREND CALCULATION")
    
    try:
        drug_name = service.drug_info[drug_id]['name']
        print(f"Testing with drug: {drug_name} (ID: {drug_id})")
        
        # Get recent usage data
        recent_usage = service.get_recent_usage(drug_id, days=30)
        print(f"✅ Retrieved {len(recent_usage)} days of usage data")
        
        if len(recent_usage) >= 14:
            print(f"  Recent 7 days: {recent_usage[:7]}")
            print(f"  Older 7 days: {recent_usage[7:14]}")
            
            # Calculate trend
            trend_factor = service.calculate_trend_adjustment(drug_id)
            print(f"✅ Trend factor: {trend_factor:.3f}")
            
            if trend_factor > 1.1:
                print("  📈 Trending UP - Usage increasing")
            elif trend_factor < 0.9:
                print("  📉 Trending DOWN - Usage decreasing")
            else:
                print("  ➡️  Stable - No significant trend")
        else:
            print(f"⚠️  Insufficient data for trend calculation ({len(recent_usage)} days)")
            
        return True
    except Exception as e:
        print(f"❌ Trend calculation failed: {e}")
        return False

def test_seasonal_adjustment(service, drug_id: int = 4):
    """Test seasonal adjustment functionality"""
    print_header("TESTING SEASONAL ADJUSTMENT")
    
    try:
        drug_name = service.drug_info[drug_id]['name']
        print(f"Testing with drug: {drug_name} (ID: {drug_id})")
        
        # Test for next 7 days
        for i in range(7):
            test_date = datetime.now() + timedelta(days=i+1)
            seasonal_factor = service.calculate_seasonality_adjustment(test_date, drug_id)
            day_name = test_date.strftime('%A')
            
            print(f"  {day_name}: {seasonal_factor:.3f}")
            
        print("✅ Seasonal adjustment calculation completed")
        return True
    except Exception as e:
        print(f"❌ Seasonal adjustment failed: {e}")
        return False

def test_adaptive_predictions(service, drug_id: int = 4):
    """Test adaptive predictions vs base predictions"""
    print_header("TESTING ADAPTIVE PREDICTIONS")
    
    try:
        drug_name = service.drug_info[drug_id]['name']
        print(f"Testing with drug: {drug_name} (ID: {drug_id})")
        
        # Get base XGBoost predictions
        print_subheader("Base XGBoost Predictions")
        base_predictions = service.predict_demand(drug_id, days=3)
        for pred in base_predictions:
            print(f"  {pred['date']}: {pred['predicted_demand']} {service.drug_info[drug_id]['unit']}")
        
        # Get adaptive predictions
        print_subheader("Adaptive Predictions (with adjustments)")
        adaptive_predictions = service.get_adaptive_predictions(drug_id, days=3)
        for pred in adaptive_predictions:
            print(f"  {pred['date']}: {pred['predicted_demand']} {service.drug_info[drug_id]['unit']}")
            print(f"    Base: {pred['base_prediction']}, Trend: {pred['trend_factor']}, Seasonal: {pred['seasonal_factor']}")
        
        # Compare differences
        print_subheader("Comparison")
        total_base = sum(p['predicted_demand'] for p in base_predictions)
        total_adaptive = sum(p['predicted_demand'] for p in adaptive_predictions)
        difference = total_adaptive - total_base
        
        print(f"  Total base prediction (3 days): {total_base:.1f}")
        print(f"  Total adaptive prediction (3 days): {total_adaptive:.1f}")
        print(f"  Difference: {difference:+.1f} ({difference/total_base*100:+.1f}%)")
        
        if abs(difference) > 0.1:
            print("✅ Adaptive system is making adjustments!")
        else:
            print("⚠️  Adaptive system shows minimal adjustments")
            
        return True
    except Exception as e:
        print(f"❌ Adaptive predictions failed: {e}")
        return False

def test_batch_predictions(service):
    """Test batch predictions for all drugs"""
    print_header("TESTING BATCH PREDICTIONS")
    
    try:
        # Test adaptive batch predictions
        all_predictions = service.predict_all_drugs_adaptive(days=3)
        
        print(f"✅ Generated predictions for {len(all_predictions)} drugs")
        
        # Show sample results
        print_subheader("Sample Results")
        for drug_id, data in list(all_predictions.items())[:3]:  # Show first 3
            drug_name = service.drug_info[drug_id]['name']
            predictions = data['predictions']
            current_stock = data['current_stock']
            
            total_predicted = sum(p['predicted_demand'] for p in predictions)
            
            print(f"  {drug_name}:")
            print(f"    Current stock: {current_stock}")
            print(f"    3-day prediction: {total_predicted:.1f}")
            print(f"    Days of stock: {current_stock/total_predicted*3:.1f}" if total_predicted > 0 else "    Days of stock: ∞")
        
        return True
    except Exception as e:
        print(f"❌ Batch predictions failed: {e}")
        return False

def test_stock_levels_and_recommendations(service):
    """Test current stock levels and recommendations"""
    print_header("TESTING STOCK LEVELS & RECOMMENDATIONS")
    
    try:
        # Get current stock for all drugs
        all_stock = service.get_all_current_stock()
        
        print(f"✅ Retrieved stock levels for {len(all_stock)} drugs")
        
        # Test recommendations
        print_subheader("Sample Recommendations")
        for drug_id, stock_level in list(all_stock.items())[:5]:  # Show first 5
            drug_name = service.drug_info[drug_id]['name']
            reorder_level = service.drug_info[drug_id]['reorder_level']
            
            # Get predictions for recommendation
            predictions = service.get_adaptive_predictions(drug_id, days=7)
            recommendation = service.get_recommendation(drug_id, stock_level, predictions)
            
            print(f"  {drug_name}:")
            print(f"    Current: {stock_level}, Reorder at: {reorder_level}")
            print(f"    {recommendation}")
        
        return True
    except Exception as e:
        print(f"❌ Stock levels test failed: {e}")
        return False

def test_data_freshness():
    """Test if we have recent data for testing"""
    print_header("TESTING DATA FRESHNESS")
    
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            # Check latest inventory date
            result = conn.execute(text("SELECT MAX(date) FROM inventory"))
            latest_date = result.fetchone()[0]
            
            # Check how many days old
            if latest_date:
                days_old = (datetime.now().date() - latest_date).days
                print(f"✅ Latest inventory data: {latest_date}")
                print(f"✅ Data age: {days_old} days old")
                
                if days_old <= 1:
                    print("  🟢 Data is fresh (≤1 day old)")
                elif days_old <= 7:
                    print("  🟡 Data is recent (≤7 days old)")
                else:
                    print("  🔴 Data is old (>7 days old)")
                    
                # Check data distribution
                result = conn.execute(text("""
                    SELECT drug_id, COUNT(*) as days_of_data
                    FROM inventory
                    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY drug_id
                    ORDER BY drug_id
                """))
                
                print(f"\n📊 Data coverage (last 30 days):")
                for row in result:
                    drug_id, days = row
                    drug_name = "Unknown"
                    if drug_id in get_prediction_service().drug_info:
                        drug_name = get_prediction_service().drug_info[drug_id]['name']
                    print(f"  {drug_name} (ID {drug_id}): {days} days")
                
                return True
            else:
                print("❌ No inventory data found")
                return False
                
    except Exception as e:
        print(f"❌ Data freshness test failed: {e}")
        return False

def run_comprehensive_test():
    """Run all tests"""
    print_header("ADAPTIVE ML SYSTEM COMPREHENSIVE TEST")
    print(f"Started at: {datetime.now().isoformat()}")
    
    # Track test results
    test_results = {}
    
    # Test 1: Service initialization
    service = test_service_initialization()
    test_results['service_init'] = service is not None
    
    if not service:
        print("\n❌ Cannot proceed without service initialization")
        return
    
    # Test 2: Database connection
    test_results['database'] = test_database_connection()
    
    # Test 3: Data freshness
    test_results['data_freshness'] = test_data_freshness()
    
    # Test 4: Trend calculation
    test_results['trend_calculation'] = test_trend_calculation(service)
    
    # Test 5: Seasonal adjustment
    test_results['seasonal_adjustment'] = test_seasonal_adjustment(service)
    
    # Test 6: Adaptive predictions
    test_results['adaptive_predictions'] = test_adaptive_predictions(service)
    
    # Test 7: Batch predictions
    test_results['batch_predictions'] = test_batch_predictions(service)
    
    # Test 8: Stock levels and recommendations
    test_results['stock_recommendations'] = test_stock_levels_and_recommendations(service)
    
    # Summary
    print_header("TEST SUMMARY")
    passed = sum(test_results.values())
    total = len(test_results)
    
    print(f"Tests passed: {passed}/{total}")
    print(f"Success rate: {passed/total*100:.1f}%")
    
    print("\nDetailed results:")
    for test_name, passed in test_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Your adaptive ML system is working correctly.")
    else:
        print(f"\n⚠️  {total-passed} tests failed. Please review the errors above.")
    
    print(f"\nCompleted at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    run_comprehensive_test()