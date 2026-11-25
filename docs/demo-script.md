# Demo video script (about 2:45)

**Setup (before recording):**
1. `bash scripts/dev.sh` in one terminal (local chain), `bash scripts/demo-scenario.sh` in another.
2. `python3 -m http.server 8080 -d web` in a third, open http://localhost:8080, pick **Local (gnodev)**, connect Adena.
3. Your wallet should be a member of a table with Bob (the scenario doesn't do this: create "Joani's Tavern" in the app and add Bob `g1rmme0557und5zxsqredce67seglmlpwp9gnwt2`).

Record with Win+Shift+R (Snipping Tool) or OBS. Read slowly; pauses are fine.

## 0:00 · The problem (app home page)

> "Every friend group bets. 'I'll beat you at chess.' 'Winner of poker night takes the pot.' And it always ends the same way: 'I'll pay you later', or an argument about who actually won. Tavern Wagers fixes that, on Gno.land."

Point at the stats card.

> "Zero percent house cut. Every coin that goes in comes back out to players and judges."

## 0:20 · A real bet, live (your table)

Open your table. Fill **New bet**: "I beat Bob at chess", against Bob, 1 GNOT. Click **Lock & challenge**, approve in Adena.

> "I challenge Bob. The app locks my stake plus a 10% honesty bond in the realm. Not in my wallet, not in Bob's: in the code."

(Off camera, Bob accepts with gnokey; refresh.)

> "Bob accepts and locks the same. Nobody can run off with the pot now."

Open the bet, click **Joani won**, approve. (Bob reports the same off camera; refresh.)

> "We both report I won, so it pays out instantly, bonds back, no fees."

## 1:05 · When someone lies (Friday Chess Club → "Rematch: Alice wins again")

> "But what if someone lies? Here Alice says she won and Bob says he did. So the bet goes to the judges: everyone at the table who isn't playing. Marco and Sara have no money in it, so no reason to lie. Both say Alice."

Scroll to payouts.

> "Alice gets the pot, her bond, and half of Bob's bond. The judges split a 1% fee and the other half. Bob gets nothing, and a red flag on the leaderboard forever."

## 1:40 · Poker night (Friday Chess Club → "Friday poker night")

> "It's not just one on one. Group bets handle poker nights and tournaments, 3 to 20 players, winner-takes-all or split payouts like 60/40. Every player reports who won. If anyone disagrees, the non-players judge it."

Point at the ⚠️ banner.

> "And no single dealer holds all the power. A group game needs at least 3 judges. You can play with fewer, but only if you explicitly accept the risk, and the game says so forever. The idea is to rotate who sits out and judges."

## 2:15 · Under the hood (gnoweb page, then GitHub)

Open the realm on gnoweb (footer link "Realm on gnoweb").

> "Everything also lives on gnoweb: the realm renders its own pages, and every action is a pre-filled transaction link. The realm has 18 tests, and every settlement test checks that coins out equal coins in."

## 2:35 · Close

> "Tavern Wagers. Bet on anything with your friends. The money's locked upfront, neutral judges call it, and the winner gets paid automatically."
