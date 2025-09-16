#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[STRICT120] scanning backup node_modules ..."
maps=$(find . -type d \( -name "node_modules_*" -o -name "*node_modules_backup*" -o -name "security-fix-backup-*" \) -prune -print || true)

if [ -z "$maps" ]; then
  echo "[STRICT120] no backup node_modules found. nothing to do."; exit 0;
fi

echo "[STRICT120] will remove the following directories:"
echo "$maps"
read -r -p "Proceed to delete these directories? [y/N] " ans
if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
  echo "[STRICT120] abort."; exit 1;
fi

echo "$maps" | xargs rm -rf
echo "[STRICT120] cleanup done."
