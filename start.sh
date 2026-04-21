#!/bin/bash

# ╔══════════════════════════════════════════════════════╗
# ║              QueryVault — How to Run                 ║
# ╚══════════════════════════════════════════════════════╝
#
#  STEP 1 — Open Terminal 1 (Backend)
#  ─────────────────────────────────
#  cd /home/hr/Documents/QueryVault/backend
#  source venv/bin/activate
#  uvicorn main:app --reload --port 8000
#
#  STEP 2 — Open Terminal 2 (Frontend)
#  ─────────────────────────────────────
#  cd /home/hr/Documents/QueryVault/frontend
#  npm run dev
#
#  STEP 3 — Open Site in Browser
#  ──────────────────────────────
#  http://localhost:5173
#
# ══════════════════════════════════════════════════════
#  OR — Run both together with this script:
#  cd /home/hr/Documents/QueryVault
#  bash start.sh
# ══════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ┌─────────────────────────────────┐"
echo "  │   QueryVault is starting...     │"
echo "  └─────────────────────────────────┘"
echo ""

# Start Backend
cd "$ROOT/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  ✔ Backend  →  http://localhost:8000"

# Start Frontend
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  ✔ Frontend →  http://localhost:5173"

echo ""
echo "  Open in browser: http://localhost:5173"
echo "  Press Ctrl+C to stop both servers."
echo ""

trap "echo ''; echo '  Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
