#!/bin/bash
echo "════════════════════════════════════"
echo "  🌌 EduPredict AI v2 — Aurora"
echo "════════════════════════════════════"
cd "$(dirname "$0")/backend"
npm install --silent
echo ""
echo "  http://localhost:5000"
echo ""
echo "  admin@school.edu  / admin123"
echo "  sarah@school.edu  / teacher123"
echo "  alice@school.edu  / student123"
echo ""
node server.js
