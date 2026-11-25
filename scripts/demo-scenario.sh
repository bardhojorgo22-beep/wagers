#!/usr/bin/env bash
# Plays a full demo on a FRESH local gnodev node (run demo-keys.sh first and
# start gnodev with the command it printed). Afterwards, open
# http://localhost:8888/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v3
#
# Story:
#   Table "Friday Chess Club": alice (owner), bob, judge1-3.
#   Bet 1: alice vs bob, both agree alice won -> instant payout.
#   Bet 2: alice vs bob, bob lies -> judges vote -> bob loses his bond.
#   Group bet 1: poker night, Alice/Bob/Leo, everyone agrees Leo won.
#   Bet 3: left open so the "accept" button shows on the page.
set -euo pipefail

PKG="gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v3"
REMOTE="${REMOTE:-127.0.0.1:26657}"
CHAIN="${CHAIN:-dev}"
STAKE=5000000            # 5 GNOT
SEND=5500000ugnot        # stake + 10% bond

addr() { gnokey list | grep " $1 (local)" | sed -E 's/.*addr: (g1[0-9a-z]+).*/\1/'; }

call() { # call <key> <func> [send] -- args...
  local key=$1 fn=$2 send=$3; shift 3
  local args=()
  for a in "$@"; do args+=(-args "$a"); done
  echo ">> $key: $fn $*"
  echo demo | gnokey maketx call -pkgpath "$PKG" -func "$fn" "${args[@]}" \
    ${send:+-send "$send"} -gas-fee 1000000ugnot -gas-wanted 30000000 \
    -broadcast -chainid "$CHAIN" -remote "$REMOTE" -insecure-password-stdin "$key" \
    | grep -E "OK!|Error|Data:" || true
}

if ! curl -s -o /dev/null "http://$REMOTE/status"; then
  echo "The local chain isn't running. Start it in another window with: bash scripts/dev.sh"
  exit 1
fi

ALICE=$(addr demo-alice); BOB=$(addr demo-bob)
J1=$(addr demo-judge1); J2=$(addr demo-judge2); J3=$(addr demo-judge3)

call demo-alice CreateTable "" "Friday Chess Club" "Alice"
call demo-alice AddMember "" 1 "$BOB" "Bob"
call demo-alice AddMember "" 1 "$J1" "Marco"
call demo-alice AddMember "" 1 "$J2" "Sara"
call demo-alice AddMember "" 1 "$J3" "Leo"

# Bet 1: everyone honest.
call demo-alice CreateBet "$SEND" 1 "Alice beats Bob, 10 min blitz" "Bob" "$STAKE"
call demo-bob   AcceptBet "$SEND" 1
call demo-alice Report "" 1 a
call demo-bob   Report "" 1 a

# Bet 2: bob lies, judges catch him.
call demo-alice CreateBet "$SEND" 1 "Rematch: Alice wins again" "Bob" "$STAKE"
call demo-bob   AcceptBet "$SEND" 2
call demo-alice Report "" 2 a
call demo-bob   Report "" 2 b
call demo-judge1 Vote "" 2 a
call demo-judge2 Vote "" 2 a

# Group bet: poker night. Alice, Bob and Leo play; Marco and Sara judge.
# Only 2 judges, so the game opts in to the "fewer than 3 judges" warning.
call demo-alice CreatePool "$SEND" 1 "Friday poker night" "Bob,Leo" "$STAKE" "100" "true"
call demo-bob   JoinPool "$SEND" 1
call demo-judge3 JoinPool "$SEND" 1
call demo-alice ReportPool "" 1 "Leo"
call demo-bob   ReportPool "" 1 "Leo"
call demo-judge3 ReportPool "" 1 "Leo"

# Bet 3: open challenge, waiting for Leo to accept.
call demo-bob CreateBet "$SEND" 1 "Bob beats Leo at FIFA" "Leo" "$STAKE"

echo
echo "Done. Open: http://localhost:8888/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v3"
