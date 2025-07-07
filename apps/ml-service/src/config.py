import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Database
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Environment
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Date range for synthetic data
HISTORICAL_DAYS = 180  # 6 months of data