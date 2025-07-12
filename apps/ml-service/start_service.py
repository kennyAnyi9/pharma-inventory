#!/usr/bin/env python3
import os
import sys
import subprocess

# Set up environment
os.chdir('/home/kennedy/devmode/final-year-project/pharma-inventory/apps/ml-service')
os.environ['PYTHONPATH'] = '/home/kennedy/devmode/final-year-project/pharma-inventory/apps/ml-service/src'

# Check if ML_API_KEY is set
if not os.getenv('ML_API_KEY'):
    os.environ['ML_API_KEY'] = 'ml-service-dev-key-2025'

print("Starting ML service...")
print(f"Working directory: {os.getcwd()}")
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")
print(f"ML_API_KEY: {'SET' if os.getenv('ML_API_KEY') else 'NOT SET'}")

# Start the service
try:
    subprocess.run([sys.executable, 'src/main.py'], check=True)
except KeyboardInterrupt:
    print("\nShutting down...")
except Exception as e:
    print(f"Error: {e}")