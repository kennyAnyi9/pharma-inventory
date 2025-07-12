#!/bin/bash

echo "🚀 Starting Pharma Inventory System..."
echo "======================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check requirements
if ! command_exists pnpm; then
    echo "❌ pnpm is not installed. Please install it first."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ python3 is not installed. Please install it first."
    exit 1
fi

# Start the web application
echo "🌐 Starting web application..."
pnpm dev &
WEB_PID=$!

# Wait a moment for web app to start
sleep 3

# Start the ML service
echo "🤖 Starting ML service..."
cd apps/ml-service
./run.sh &
ML_PID=$!

# Wait for user to stop
echo ""
echo "✅ Both services are starting up..."
echo "   - Web app: http://localhost:3000"
echo "   - ML API:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $WEB_PID 2>/dev/null
    kill $ML_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait