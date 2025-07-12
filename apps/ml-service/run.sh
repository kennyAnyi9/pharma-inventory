#!/bin/bash
source venv/bin/activate
python3 -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000