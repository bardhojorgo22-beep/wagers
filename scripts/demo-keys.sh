#!/usr/bin/env bash
# Creates 5 throwaway demo accounts (password "demo") and prints the gnodev
# command that funds them. Run once. These keys are for local testing only.
set -euo pipefail

NAMES="demo-alice demo-bob demo-judge1 demo-judge2 demo-judge3"

for n in $NAMES; do
  if gnokey list | grep -q " $n (local)"; then
    echo "key $n already exists"
  else
    printf 'demo\ndemo\n' | gnokey add -insecure-password-stdin "$n" >/dev/null
    echo "created key $n"
  fi
done

ACCOUNTS=""
for n in $NAMES; do
  addr=$(gnokey list | grep " $n (local)" | sed -E 's/.*addr: (g1[0-9a-z]+).*/\1/')
  ACCOUNTS="$ACCOUNTS -add-account $addr=1000000000000ugnot"
done

echo
echo "Now start the local chain from ~/wagers with:"
echo
echo "  cd ~/wagers && gnodev$ACCOUNTS ."
echo
