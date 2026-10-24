#!/bin/bash
# Deploys the latest main on the Mac mini (Render did this on every push).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
git -C "$REPO" pull --ff-only origin main
"$REPO/.venv/bin/pip" install --quiet -r "$REPO/api/requirements.txt"
sudo launchctl kickstart -k system/app.findyoursole.api
sleep 3
curl -fsS http://127.0.0.1:8000/health && echo
