#!/bin/bash
# One-time setup on the Mac mini, and safe to re-run. Run as your normal user
# (not with sudo); it asks for your password when installing the launchd jobs.
#
#   deploy/macmini/install.sh              # API only
#   deploy/macmini/install.sh --with-cron  # API + daily catalogue price job
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PYTHON="${PYTHON:-python3}"
ENV_FILE="$HOME/.config/find-your-sole/api.env"
LOG_DIR="$HOME/Library/Logs/find-your-sole"
JOBS=(app.findyoursole.api)
[ "${1:-}" = "--with-cron" ] && JOBS+=(app.findyoursole.catalog-sync)

"$PYTHON" -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ required"'

echo "== virtualenv in $REPO/.venv"
"$PYTHON" -m venv "$REPO/.venv"
"$REPO/.venv/bin/pip" install --quiet --upgrade pip
"$REPO/.venv/bin/pip" install --quiet -r "$REPO/api/requirements.txt"

mkdir -p "$LOG_DIR" "$(dirname "$ENV_FILE")"
if [ ! -f "$ENV_FILE" ]; then
  cp "$REPO/deploy/macmini/api.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE. Fill in the keys, then run this script again."
  exit 0
fi
chmod 600 "$ENV_FILE"

for job in "${JOBS[@]}"; do
  dest="/Library/LaunchDaemons/$job.plist"
  echo "== installing $dest"
  sed -e "s|__USER__|$(id -un)|g" -e "s|__HOME__|$HOME|g" -e "s|__REPO__|$REPO|g" \
    "$REPO/deploy/macmini/$job.plist" | sudo tee "$dest" >/dev/null
  sudo chown root:wheel "$dest"
  sudo chmod 644 "$dest"
  sudo launchctl bootout "system/$job" 2>/dev/null || true
  sudo launchctl bootstrap system "$dest"
done

echo "== waiting for the API"
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8000/health; then echo; echo "OK"; exit 0; fi
  sleep 1
done
echo "API did not answer; see $LOG_DIR/api.log" >&2
exit 1
