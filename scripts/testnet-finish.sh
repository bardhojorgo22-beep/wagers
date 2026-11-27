#!/usr/bin/env bash
# Finishes the testnet demo after testnet-demo.sh: the two settling calls
# (they pay everyone out, so they need more gas) and the two open bets.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=https://rpc.onyx.testnets.gno.land:443
CHAIN=onyx-1
PKG="gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v5"
STAKE=100000; SEND="$((STAKE + STAKE / 10))ugnot"

addr() { gnokey list | grep " $1 (local)" | sed -E 's/.*addr: (g1[0-9a-z]+).*/\1/'; }
bal() { gnokey query "bank/balances/$1" -remote "$REMOTE" 2>/dev/null | grep -oE '[0-9]+ugnot' | head -1 | sed 's/ugnot//' || true; }

read -r -s -p "gnokey password for 'main': " PW; echo
for n in demo-bob demo-judge1 demo-judge2 demo-judge3; do
  a=$(addr "$n"); b=$(bal "$a"); b=${b:-0}; d=$(( 4000000 - b ))
  if [ $d -le 0 ]; then echo ">> $n has enough"; continue; fi
  echo ">> topping up $n with ${d}ugnot"
  out=$(echo "$PW" | gnokey maketx send -to "$a" -send "${d}ugnot" -gas-fee 100000ugnot -gas-wanted 2000000 \
    -broadcast -chainid "$CHAIN" -remote "$REMOTE" -insecure-password-stdin main 2>&1 || true)
  echo "$out" | grep -q "OK!" && echo "   ok" || { echo "$out" | grep -E "Data:"; echo "Funding failed. Stopping."; exit 1; }
done

call() { # call <key> <gaswanted> <func> [send] -- args...
  local key=$1 gw=$2 fn=$3 send=$4; shift 4
  local args=(); for x in "$@"; do args+=(-args "$x"); done
  local fee=$(( gw / 50 ))ugnot
  echo ">> $key: $fn $*"
  echo demo | gnokey maketx call -pkgpath "$PKG" -func "$fn" "${args[@]}" \
    ${send:+-send "$send"} -gas-fee "$fee" -gas-wanted "$gw" \
    -broadcast -chainid "$CHAIN" -remote "$REMOTE" -insecure-password-stdin "$key" 2>&1 \
    | grep -E "OK!|^Data:" | head -1 || true
}

call demo-judge2 60000000 Vote "" 2 a
call demo-judge3 60000000 ReportPool "" 1 "Leo"
call demo-bob    20000000 CreateBet "$SEND" 1 "Bob beats Leo at FIFA" "Leo" "$STAKE"
call demo-judge1 20000000 CreateBet "$SEND" 1 "Anyone up for a 5 min blitz?" "anyone" "$STAKE"
echo
echo "Done. Open: https://onyx.testnets.gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v5"
