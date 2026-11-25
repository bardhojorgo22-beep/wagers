#!/usr/bin/env bash
# Plays the demo story on the real testnet once the package is enabled, so
# the live app and gnoweb pages show real data. Uses small stakes.
#
# 1. Funds the 5 demo accounts from your "main" key (asks your gnokey
#    password once; 10 GNOT total). Check your balance first, and top up
#    at faucet.gno.land if needed.
# 2. Runs scripts/demo-scenario.sh against onyx-1 with 0.1 GNOT stakes.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=https://rpc.onyx.testnets.gno.land:443
CHAIN=onyx-1
FROM=main
EACH=2000000ugnot   # 2 GNOT per demo account (10 GNOT total): stakes + fees

read -r -s -p "gnokey password for '$FROM': " PW; echo

for n in demo-alice demo-bob demo-judge1 demo-judge2 demo-judge3; do
  addr=$(gnokey list | grep " $n (local)" | sed -E 's/.*addr: (g1[0-9a-z]+).*/\1/')
  [ -n "$addr" ] || { echo "missing key $n: run scripts/demo-keys.sh first"; exit 1; }
  echo ">> sending $EACH to $n ($addr)"
  echo "$PW" | gnokey maketx send -to "$addr" -send "$EACH" -gas-fee 100000ugnot -gas-wanted 2000000 \
    -broadcast -chainid "$CHAIN" -remote "$REMOTE" -insecure-password-stdin "$FROM" | grep -E "OK!|Error|Data:" || true
done

REMOTE="$REMOTE" CHAIN="$CHAIN" STAKE=100000 GASFEE=300000ugnot GASWANTED=15000000 bash scripts/demo-scenario.sh
