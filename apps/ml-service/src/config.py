import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy.pool import NullPool

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Database
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Add pooling parameters for better performance
DATABASE_CONFIG = {
    'poolclass': NullPool,  # Disable pooling for now to avoid connection issues
    'connect_args': {
        'connect_timeout': 10,
        'options': '-c statement_timeout=30000'  # 30 second statement timeout
    }
}

# Environment
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Date range for synthetic data
HISTORICAL_DAYS = 180  # 6 months of data