#!/bin/bash
# Double-click this file (macOS Finder) to run DC Scheduling locally.
# ES modules require http(s):// — they will not load from a file:// path.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8000}"
URL="http://localhost:${PORT}/"

echo "Serving DC Scheduling at ${URL}"
echo "Press Ctrl+C to stop."

# Open the browser shortly after the server starts.
( sleep 1; open "${URL}" ) >/dev/null 2>&1 &

exec python3 -m http.server "${PORT}"
