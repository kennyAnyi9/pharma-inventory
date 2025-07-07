# ML Service - Synthetic Data Generation

This service generates realistic historical drug usage data for the Ghana pharmaceutical inventory system.

## Features

- **180 days** of historical data generation
- **Ghana-specific patterns**:
  - Seasonal effects (rainy seasons affect malaria medication)
  - Weekend usage patterns
  - Month-end effects (reduced purchasing power)
  - Public holidays impact
  - Disease outbreak simulations

## Setup

1. **Create virtual environment:**
   ```bash
   cd apps/ml-service
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install -e .  # Install in development mode
   ```

3. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **VS Code Setup:**
   - Open the `apps/ml-service` folder in VS Code
   - Press `Ctrl+Shift+P` and select "Python: Select Interpreter"
   - Choose `./venv/bin/python` (the virtual environment interpreter)
   - The `.vscode/settings.json` file will configure the Python path automatically

5. **Test setup:**
   ```bash
   python check_env.py  # Verify environment
   python test_connection.py  # Test database connection
   ```

## Usage

### Generate Synthetic Data

```bash
# From project root
pnpm run generate-data

# Or directly
cd apps/ml-service
source venv/bin/activate
python src/data/generate_synthetic_data.py
```

### Drug Usage Patterns

The system generates realistic usage patterns for all 10 drugs with:

- **Paracetamol**: High usage, weekend spikes
- **Amoxicillin**: Moderate usage, consistent demand
- **Metformin**: Chronic medication, stable usage
- **Artemether/Lumefantrine**: Seasonal spikes during rainy season
- **ORS Sachets**: Variable usage with outbreak simulations

### Ghana-Specific Factors

- **Rainy Seasons**: April-July, September-November
- **Public Holidays**: New Year, Independence Day, May Day, Christmas
- **Month-end Effects**: Reduced purchasing power in last 5 days
- **Weekend Patterns**: Increased urgent care usage

## Data Quality

The generated data includes:
- Realistic variance in daily usage
- Seasonal trends for malaria medications
- Economic factors affecting demand
- Disease outbreak simulations
- Stock management patterns

## Safety Features

- Confirms before deleting existing data
- Validates database connection
- Provides detailed logging
- Shows data statistics before insertion

## Output

The system generates approximately **1,800 records** (10 drugs × 180 days) with:
- Daily usage quantities
- Stock level calculations
- Receiving patterns
- Stockout flags
- Historical date stamps