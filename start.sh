#!/bin/bash

# Kill any existing processes on ports 3000 and 5000
echo "Killing any existing processes on ports 3000 and 5000..."
kill -9 $(lsof -t -i:3000) 2>/dev/null || true
kill -9 $(lsof -t -i:5000) 2>/dev/null || true

# Function to handle cleanup on script exit
cleanup() {
    echo "Cleaning up..."
    kill -9 $(lsof -t -i:3000) 2>/dev/null || true
    kill -9 $(lsof -t -i:5000) 2>/dev/null || true
    exit
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM

# Start backend server
echo "Starting backend server..."
cd backend
npm install
npm start &

# Wait for backend to start
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm install
npm start &

# Keep script running
wait
