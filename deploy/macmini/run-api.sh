#!/bin/bash
# Starts the API the same way Render does (from the repo root), but only on
# localhost: the Cloudflare Tunnel is the only way in from outside.
. "$(dirname "$0")/common.sh"
exec "$VENV/bin/uvicorn" api.main:app --host 127.0.0.1 --port "${PORT:-8000}"
