#!/bin/bash

# Move to project directory
cd /Users/yoshitaka.yamagishi/Documents/projects/my-board-app

# Check if we're in the correct directory
if [ ! -f package.json ]; then
    echo "Error: package.json not found in current directory"
    exit 1
fi

# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the development server
echo "Starting development server on port 3000..."
npm run dev