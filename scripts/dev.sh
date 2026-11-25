#!/usr/bin/env bash
# Starts a local gnodev chain with this realm and the 5 demo accounts funded.
# Run scripts/demo-keys.sh once first. Leave this window open.
set -euo pipefail
cd "$(dirname "$0")/.."
ACCOUNTS=()
for n in demo-alice demo-bob demo-judge1 demo-judge2 demo-judge3; do
  addr=$(gnokey list | grep " $n (local)" | sed -E 's/.*addr: (g1[0-9a-z]+).*/\1/')
  [ -n "$addr" ] || { echo "missing key $n: run scripts/demo-keys.sh first"; exit 1; }
  ACCOUNTS+=(-add-account "$addr=1000000000000ugnot")
done
exec gnodev "${ACCOUNTS[@]}" .
