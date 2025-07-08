import httpx
import json
import os

# API configuration
BASE_URL = "http://localhost:8000"
API_KEY = os.getenv("ML_API_KEY", "ml-service-dev-key-2025")

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = httpx.get(f"{BASE_URL}/health")
    print("Health Check:", json.dumps(response.json(), indent=2))
    return response.status_code == 200

def test_models():
    """Test models endpoint"""
    print("\nTesting models endpoint...")
    headers = {"X-API-Key": API_KEY}
    response = httpx.get(f"{BASE_URL}/models", headers=headers)
    
    if response.status_code == 200:
        print("Loaded Models:", json.dumps(response.json(), indent=2))
        return True
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False

def test_forecast_single():
    """Test single drug forecast"""
    print("\nTesting single drug forecast...")
    headers = {"X-API-Key": API_KEY}
    response = httpx.post(
        f"{BASE_URL}/forecast/1",
        headers=headers,
        json={"days": 7}
    )
    
    if response.status_code == 200:
        print("Forecast for Drug 1:", json.dumps(response.json(), indent=2))
        return True
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False

def test_forecast_all():
    """Test all drugs forecast"""
    print("\nTesting all drugs forecast...")
    headers = {"X-API-Key": API_KEY}
    response = httpx.post(
        f"{BASE_URL}/forecast/all",
        headers=headers,
        json={"days": 7}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Forecasts for all {len(data['forecasts'])} drugs generated")
        if data['forecasts']:
            print("First drug forecast:", json.dumps(data['forecasts'][0], indent=2))
        return True
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return False

def test_unauthorized():
    """Test unauthorized access"""
    print("\nTesting unauthorized access...")
    response = httpx.get(f"{BASE_URL}/models")
    
    if response.status_code == 401:
        print("✅ Unauthorized access properly blocked")
        return True
    else:
        print(f"❌ Expected 401, got {response.status_code}")
        return False

if __name__ == "__main__":
    print("Testing ML API...")
    print("="*50)
    
    try:
        # Test basic functionality
        health_ok = test_health()
        if not health_ok:
            print("❌ Health check failed")
            exit(1)
        
        # Test auth
        auth_ok = test_unauthorized()
        if not auth_ok:
            print("❌ Auth test failed")
        
        # Test authenticated endpoints
        models_ok = test_models()
        if not models_ok:
            print("❌ Models test failed")
            exit(1)
        
        forecast_single_ok = test_forecast_single()
        if not forecast_single_ok:
            print("❌ Single forecast test failed")
        
        forecast_all_ok = test_forecast_all()
        if not forecast_all_ok:
            print("❌ All forecasts test failed")
        
        print("\n" + "="*50)
        print("✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        print("Make sure the ML service is running on http://localhost:8000")
        exit(1)