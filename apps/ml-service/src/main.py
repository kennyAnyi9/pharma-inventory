from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import prediction service
from models.predict import get_prediction_service

# API configuration
API_KEY = os.getenv("ML_API_KEY")
if not API_KEY:
    raise ValueError("ML_API_KEY environment variable must be set")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Create FastAPI app
app = FastAPI(
    title="Pharma Inventory ML Service",
    description="Machine Learning service for pharmaceutical inventory demand forecasting",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class HealthResponse(BaseModel):
    status: str
    models_loaded: int
    timestamp: str

class ModelInfo(BaseModel):
    drug_id: int
    drug_name: str
    unit: str
    model_loaded: bool

class ForecastRequest(BaseModel):
    days: Optional[int] = 7

class DemandForecast(BaseModel):
    date: str
    predicted_demand: float
    day_of_week: str

class ForecastResponse(BaseModel):
    drug_id: int
    drug_name: str
    unit: str
    current_stock: int
    reorder_level: int
    forecasts: List[DemandForecast]
    total_predicted_7_days: float
    recommendation: str
    generated_at: str

class AllForecastsResponse(BaseModel):
    forecasts: List[ForecastResponse]
    generated_at: str

# Dependency for API key validation
async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return api_key

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Pharma Inventory ML Service",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Check service health"""
    service = get_prediction_service()
    return HealthResponse(
        status="healthy",
        models_loaded=len(service.models),
        timestamp=datetime.now().isoformat()
    )

@app.get("/models", response_model=List[ModelInfo])
def list_models(api_key: str = Depends(verify_api_key)):
    """List all loaded models"""
    service = get_prediction_service()
    models = []
    
    for drug_id in sorted(service.models.keys()):
        drug_info = service.drug_info.get(drug_id, {})
        models.append(ModelInfo(
            drug_id=drug_id,
            drug_name=drug_info.get('name', 'Unknown'),
            unit=drug_info.get('unit', 'units'),
            model_loaded=True
        ))
    
    return models

@app.post("/forecast/all", response_model=AllForecastsResponse)
def forecast_all_drugs(
    request: Optional[ForecastRequest] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get demand forecast for all drugs"""
    if request is None:
        request = ForecastRequest()
        
    service = get_prediction_service()
    all_forecasts = []
    
    for drug_id in sorted(service.models.keys()):
        try:
            # Get predictions
            predictions = service.predict_demand(drug_id, request.days)
            current_stock = service.get_current_stock(drug_id)
            drug_info = service.drug_info.get(drug_id, {
                'name': f'Drug {drug_id}',
                'unit': 'units',
                'reorder_level': 50
            })
            total_7_days = sum(p['predicted_demand'] for p in predictions[:7])
            recommendation = service.get_recommendation(drug_id, current_stock, predictions)
            
            all_forecasts.append(ForecastResponse(
                drug_id=drug_id,
                drug_name=drug_info['name'],
                unit=drug_info['unit'],
                current_stock=current_stock,
                reorder_level=drug_info['reorder_level'],
                forecasts=[DemandForecast(**p) for p in predictions],
                total_predicted_7_days=round(total_7_days, 1),
                recommendation=recommendation,
                generated_at=datetime.now().isoformat()
            ))
        except Exception as e:
            print(f"Error forecasting drug {drug_id}: {str(e)}")
            continue
    
    return AllForecastsResponse(
        forecasts=all_forecasts,
        generated_at=datetime.now().isoformat()
    )

@app.post("/forecast/{drug_id}", response_model=ForecastResponse)
def forecast_drug(
    drug_id: int,
    request: Optional[ForecastRequest] = None,
    api_key: str = Depends(verify_api_key)
):
    """Get demand forecast for a specific drug"""
    if request is None:
        request = ForecastRequest()
        
    service = get_prediction_service()
    
    # Validate drug_id
    if drug_id not in service.models:
        raise HTTPException(status_code=404, detail=f"No model found for drug_id {drug_id}")
    
    try:
        # Get predictions
        predictions = service.predict_demand(drug_id, request.days)
        
        # Get current stock
        current_stock = service.get_current_stock(drug_id)
        
        # Get drug info
        drug_info = service.drug_info.get(drug_id, {
            'name': 'Unknown',
            'unit': 'units',
            'reorder_level': 50
        })
        
        # Calculate total for 7 days
        total_7_days = sum(p['predicted_demand'] for p in predictions[:7])
        
        # Get recommendation
        recommendation = service.get_recommendation(drug_id, current_stock, predictions)
        
        return ForecastResponse(
            drug_id=drug_id,
            drug_name=drug_info['name'],
            unit=drug_info['unit'],
            current_stock=current_stock,
            reorder_level=drug_info['reorder_level'],
            forecasts=[DemandForecast(**p) for p in predictions],
            total_predicted_7_days=round(total_7_days, 1),
            recommendation=recommendation,
            generated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/train")
def trigger_training(api_key: str = Depends(verify_api_key)):
    """Trigger model retraining (placeholder)"""
    return {
        "message": "Training endpoint not implemented yet",
        "note": "Run python src/models/train.py manually for now"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)