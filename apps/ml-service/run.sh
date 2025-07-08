#!/bin/bash
source venv/bin/activate
python3 -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000