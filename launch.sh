#!/bin/bash
# Starts the APEX x DYNAMIC Deal Tracker server (if not already running) and opens it in the browser.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
HOST="127.0.0.1"
PORT="8000"
URL="http://$HOST:$PORT/"
LOG_FILE="$PROJECT_DIR/server.log"

cd "$PROJECT_DIR" || exit 1

if ! curl -s -o /dev/null "$URL"; then
  if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -q -r requirements.txt
  fi

  nohup "$VENV_DIR/bin/uvicorn" app:app --host "$HOST" --port "$PORT" > "$LOG_FILE" 2>&1 &
  disown

  for _ in $(seq 1 40); do
    curl -s -o /dev/null "$URL" && break
    sleep 0.25
  done
fi

if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "$URL"
else
  open "$URL"
fi
