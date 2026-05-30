#!/bin/bash
# Build and start the API server in background
echo "Building API server..."
cd /home/runner/workspace && PORT=3001 pnpm --filter @workspace/api-server run build

echo "Starting API server on port 3001..."
PORT=3001 pnpm --filter @workspace/api-server run start &
API_PID=$!

echo "Starting frontend on port 5000..."
PORT=5000 pnpm --filter @workspace/7dogs run dev

# If frontend exits, kill API server
kill $API_PID 2>/dev/null
