#!/bin/bash

echo ""
echo "================================"
echo "   MediCare - Starting Server"
echo "================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (npm install)..."
  npm install
  echo ""
fi

echo "Starting MediCare desktop app..."
echo ""
echo "Web app URL: http://https://medicare-clinic-al61.onrender.com"
echo ""
echo "Keep this window open while using the app!"
echo "Press Ctrl+C to stop the app"
echo ""

npm run desktop
