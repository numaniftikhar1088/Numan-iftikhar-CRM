#!/usr/bin/env bash
# Start the NumanOS backend (Flask :5050) and the frontend static server (:5500).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- Backend ---
cd "$ROOT/backend"
if [ ! -d venv ]; then
  echo "[setup] creating virtualenv + installing deps…"
  python3 -m venv venv
  ./venv/bin/pip install -q --upgrade pip
  ./venv/bin/pip install -q -r requirements.txt
fi
echo "[run] backend → http://localhost:5050"
PORT=5050 ./venv/bin/python app.py &
BACK_PID=$!

# --- Frontend ---
cd "$ROOT/portfolio-website"
echo "[run] frontend → http://127.0.0.1:5500"
python3 -m http.server 5500 --bind 127.0.0.1 &
FRONT_PID=$!

echo
echo "NumanOS is running. Open http://127.0.0.1:5500  (Ctrl+C to stop)"
trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
