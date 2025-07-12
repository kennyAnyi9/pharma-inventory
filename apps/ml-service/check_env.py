#!/usr/bin/env python3

import sys
print("Python executable:", sys.executable)
print("Python version:", sys.version)
print("Python path:")
for path in sys.path:
    print(f"  {path}")

print("\nTesting imports:")
try:
    import pandas as pd
    print("✅ pandas imported successfully")
except ImportError as e:
    print(f"❌ pandas import failed: {e}")

try:
    import numpy as np
    print("✅ numpy imported successfully")
except ImportError as e:
    print(f"❌ numpy import failed: {e}")

try:
    import sqlalchemy
    print("✅ sqlalchemy imported successfully")
except ImportError as e:
    print(f"❌ sqlalchemy import failed: {e}")

try:
    from src.config import DATABASE_URL, HISTORICAL_DAYS
    print("✅ config imported successfully")
    print(f"DATABASE_URL configured: {bool(DATABASE_URL)}")
    print(f"HISTORICAL_DAYS: {HISTORICAL_DAYS}")
except ImportError as e:
    print(f"❌ config import failed: {e}")