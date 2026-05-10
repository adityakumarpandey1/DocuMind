#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     DocuMind – RAG Intelligence      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f backend/.env ]; then
  echo "⚙️  Setting up environment..."
  cp backend/.env.example backend/.env
  echo ""
  echo "🔑  IMPORTANT: Add your Groq API key to backend/.env"
  echo "    Get one free at: https://console.groq.com/keys"
  echo ""
  read -p "Paste your Groq API key here (or press Enter to edit manually later): " KEY
  if [ -n "$KEY" ]; then
    sed -i.bak "s/your_groq_api_key_here/$KEY/" backend/.env && rm -f backend/.env.bak
    echo "✅  API key saved."
  else
    echo "⚠️  Remember to add your key to backend/.env before using the app."
  fi
  echo ""
fi

echo "📦  Installing backend dependencies..."
cd backend && npm install --silent
cd ..

echo "📦  Installing frontend dependencies..."
cd frontend && npm install --silent
cd ..

echo ""
echo "🚀  Starting DocuMind..."
echo "    Backend  →  http://localhost:5000"
echo "    Frontend →  http://localhost:3000"
echo ""

# Start backend in background
cd backend && npm start &
BACKEND_PID=$!

# Start frontend
cd ../frontend && npm start

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
