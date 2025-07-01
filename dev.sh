#!/bin/bash

# PersonaPulse Development Script
# Starts the full development environment

echo "🚀 Starting PersonaPulse Development Environment..."
echo ""
echo "This will:"
echo "  1. Start TypeScript compilation in watch mode"
echo "  2. Start Vite dev server on http://localhost:3000"
echo "  3. Launch Electron app when ready"
echo ""
echo "Press Ctrl+C to stop all processes"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
fi

# Start the development environment
npm run start 