# FastAPI ML Service - Usage Guide

## Quick Start

### 1. Setup Environment

```bash
cd apps/ml-service

# Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and API key

# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Service

```bash
# Method 1: Using run script
./run.sh

# Method 2: Direct uvicorn
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Method 3: From project root
pnpm run ml:dev
```

### 3. Test the API

```bash
# Test the API endpoints
python3 test_api.py

# Or from project root
pnpm run ml:test-api
```

## API Endpoints

### Public Endpoints

- **GET /**: Service information
- **GET /health**: Health check
- **GET /docs**: Interactive API documentation

### Protected Endpoints (require X-API-Key header)

- **GET /models**: List all loaded ML models
- **POST /forecast/{drug_id}**: Get forecast for specific drug
- **POST /forecast/all**: Get forecasts for all drugs
- **POST /train**: Trigger model retraining (placeholder)

## Example Usage

### Health Check
```bash
curl http://localhost:8000/health
```

### Get All Models
```bash
curl -H "X-API-Key: your-secret-api-key" \
     http://localhost:8000/models
```

### Forecast Single Drug
```bash
curl -X POST \
     -H "X-API-Key: your-secret-api-key" \
     -H "Content-Type: application/json" \
     -d '{"days": 7}' \
     http://localhost:8000/forecast/1
```

### Forecast All Drugs
```bash
curl -X POST \
     -H "X-API-Key: your-secret-api-key" \
     -H "Content-Type: application/json" \
     -d '{"days": 7}' \
     http://localhost:8000/forecast/all
```

## Response Examples

### Forecast Response
```json
{
  "drug_id": 1,
  "drug_name": "Paracetamol 500mg",
  "unit": "tablets",
  "current_stock": 500,
  "reorder_level": 100,
  "forecasts": [
    {
      "date": "2025-07-09",
      "predicted_demand": 45.2,
      "day_of_week": "Wednesday"
    }
  ],
  "total_predicted_7_days": 312.4,
  "recommendation": "✅ Good: Stock sufficient for 11 days.",
  "generated_at": "2025-07-08T12:00:00"
}
```

## API Key Configuration

Set your API key in `.env`:
```bash
ML_API_KEY=your-secret-api-key-change-this
```

## Interactive Documentation

Visit http://localhost:8000/docs for Swagger UI documentation where you can:
- Explore all endpoints
- Test requests directly in the browser
- See request/response schemas
- Authenticate with your API key

## Error Handling

- **401 Unauthorized**: Invalid or missing API key
- **404 Not Found**: Model not found for drug_id
- **500 Internal Server Error**: Prediction or database error

## Integration with Next.js

The API is configured with CORS to allow requests from:
- http://localhost:3000 (development)
- https://*.vercel.app (production)

Example fetch from Next.js:
```javascript
const response = await fetch('http://localhost:8000/forecast/all', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.ML_API_KEY
  },
  body: JSON.stringify({ days: 7 })
});

const forecasts = await response.json();
```