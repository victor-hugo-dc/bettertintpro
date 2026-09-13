#!/usr/bin/env bash
# Builds a distributable zip of the extension in dist/.
#   scripts/package.sh            → dist/tintpro-restyle-<version>.zip
# The same zip works for Chrome ("Load unpacked" after unzipping, or upload to
# the Chrome Web Store) and Firefox (upload to AMO for signing, or load
# temporarily from about:debugging).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(python3 -c "import json;print(json.load(open('$ROOT/extension/manifest.json'))['version'])")"
mkdir -p "$ROOT/dist"
OUT="$ROOT/dist/tintpro-restyle-$VERSION.zip"
rm -f "$OUT"
( cd "$ROOT/extension" && zip -qr -X "$OUT" . -x '.DS_Store' '*/.DS_Store' )
echo "Built $OUT"
unzip -l "$OUT"
