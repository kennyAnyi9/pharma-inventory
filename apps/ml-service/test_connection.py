from sqlalchemy import create_engine, text
from config import DATABASE_URL

print(f"Testing database connection...")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM drugs"))
        count = result.scalar()
        print(f"✅ Connected! Found {count} drugs in database.")
except Exception as e:
    print(f"❌ Connection failed: {e}")