# Shared by the run scripts. Sourced, not executed.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${FYS_ENV_FILE:-$HOME/.config/find-your-sole/api.env}"
VENV="$REPO/.venv"

if [ ! -r "$ENV_FILE" ]; then
  echo "missing $ENV_FILE (copy deploy/macmini/api.env.example)" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

cd "$REPO"
