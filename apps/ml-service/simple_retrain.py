#!/usr/bin/env python3
"""
Simple script to test model retraining with existing data
"""

import sys
import os

# Add src directory to path (file-relative)
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from models.train import retrain_models_with_recent_data
def main():
    """Simple retraining test"""
    print("🚀 Testing Model Retraining with Current Data")
    print("=" * 50)
    
    try:
        # Use existing training infrastructure
        results = retrain_models_with_recent_data()
        
        print(f"\n✅ Training Results:")
        print(f"   Total drugs: {results['total_drugs']}")
        print(f"   Successful models: {results['successful_models']}")
        print(f"   Failed models: {results['failed_models']}")
        
        if 'results' in results:
            print(f"\n📊 Individual Results:")
            for result in results['results']:
                if result['status'] == 'success':
                    print(f"   ✅ {result['drug_name']}: MAE={result['mae']:.2f}, MAPE={result['mape']:.1f}%")
                else:
                    print(f"   ❌ {result['drug_name']}: Failed")
        
        print(f"\n🎯 Model training completed using existing data!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()