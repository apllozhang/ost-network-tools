#!/bin/bash
# start.sh - Start OST Network Tools

echo "Starting OST Network Tools..."
echo ""

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Please install Node.js >= 22"
    exit 1
fi

if ! command -v python &> /dev/null; then
    echo "Error: Python not found. Please install Python 3.8+"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    pnpm install
fi

if [ ! -d "python/textfsm_templates" ]; then
    echo "Installing Python dependencies..."
    cd python && pip install -r requirements.txt && cd ..
fi

# Start Python backend
echo "Starting Python backend on port 8001..."
cd python && python main.py &
PYTHON_PID=$!
cd ..

# Wait for Python backend to start
sleep 2

# Start TypeScript dev server
echo "Starting TypeScript dev server..."
pnpm dev &
TS_PID=$!

echo ""
echo "OST Network Tools is running!"
echo "   Frontend: http://localhost:5173"
echo "   Python backend: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop"

# Handle shutdown
trap "echo 'Shutting down...'; kill $PYTHON_PID $TS_PID 2>/dev/null; exit" INT TERM

wait
