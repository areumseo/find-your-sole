#!/bin/bash
# Daily official-store price job (see docs/catalog-updates.md).
. "$(dirname "$0")/common.sh"
exec "$VENV/bin/python" -m api.catalog_sync "$@"
