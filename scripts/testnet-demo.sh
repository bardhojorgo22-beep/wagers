#!/usr/bin/env bash
# Plays the demo story on the real testnet once the package is enabled, so
# the live app and gnoweb pages show real data. Uses small stakes.
#
# 1. Funds the 5 demo accounts from your "main" key (asks your gnokey
#    password once; tops each up to a target, ~22 GNOT on a fresh run). Check your balance first, and top up
#    at faucet.gno.land if needed.
# 2. Runs scripts/demo-scenario.sh against onyx-1 with 0.1 GNOT stakes.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=https://rpc.onyx.testnets.gno.land:443
CHAIN=onyx-1
FROM=main
PKG="gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v5"

# Testnet charges a storage deposit on every write, so each account gets
# topped up to a target balance (in ugnot). Alice writes the most.
declare -A TARGET=( [demo-alice]=9000000 [demo-bob]=5000000 [demo-judge1]=3000000 [demo-judge2]=2000000 [demo-judge3]=3000000 )

addr() { gnokey list | grep " $1 (local)" | sed -E 's/.*addr: (g1[0-9a-z]+).*/\1/'; }
bal() { gnokey query "bank/balances/$1" -remote "$REMOTE" 2>/dev/null | grep -oE '[0-9]+ugnot' | head -1 | sed 's/ugnot//' || true; }

need=0
for n in demo-alice demo-bob demo-judge1 demo-judge2 demo-judge3; do
  a=$(addr "$n"); [ -n "$a" ] || { echo "missing key $n: run scripts/demo-keys.sh first"; exit 1; }
  b=$(bal "$a"); b=${b:-0}; d=$(( ${TARGET[$n]} - b ))
  [ $d -gt 0 ] && need=$((need + d + 100000))
done
mine=$(bal "$(addr "$FROM")"); mine=${mine:-0}
echo "main has $((mine/1000000)) GNOT, demo accounts need $((need/1000000)) GNOT more."
if [ $mine -lt $need ]; then
  echo "Not enough. Get GNOT from the faucet (onyx) for $(addr "$FROM") and re-run."; exit 1
fi

read -r -s -p "gnokey password for '$FROM': " PW; echo

for n in demo-alice demo-bob demo-judge1 demo-judge2 demo-judge3; do
  a=$(addr "$n"); b=$(bal "$a"); b=${b:-0}; d=$(( ${TARGET[$n]} - b ))
  if [ $d -le 0 ]; then echo ">> $n already has enough"; continue; fi
  echo ">> topping up $n with ${d}ugnot"
  out=$(echo "$PW" | gnokey maketx send -to "$a" -send "${d}ugnot" -gas-fee 100000ugnot -gas-wanted 2000000 \
    -broadcast -chainid "$CHAIN" -remote "$REMOTE" -insecure-password-stdin "$FROM" 2>&1 || true)
  if echo "$out" | grep -q "OK!"; then echo "   ok"; else
    echo "$out" | grep -E "Data:" || echo "$out" | tail -5
    echo "Funding failed (wrong password or not enough GNOT in main). Stopping."; exit 1
  fi
done

# Table 1 may already exist from an earlier run.
SKIP_TABLE=0
if gnokey query vm/qrender -data "$PKG:table/1" -remote "$REMOTE" 2>/dev/null | grep -q "Friday Chess Club"; then SKIP_TABLE=1; fi

SKIP_TABLE=$SKIP_TABLE REMOTE="$REMOTE" CHAIN="$CHAIN" STAKE=100000 GASFEE=300000ugnot GASWANTED=15000000 bash scripts/demo-scenario.sh
