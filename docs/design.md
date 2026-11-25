# Design notes

Why Tavern Wagers works the way it does, and what it deliberately doesn't try to solve.

## The core idea

A realm can't see the real world. It doesn't know who won the chess game. So the design never asks it to: **people bring the result in, and the realm makes it expensive to lie and impossible to dodge paying.**

| Problem with friendly bets | What the realm does |
|---|---|
| The loser doesn't pay | Both stakes are locked before the game. Payout is automatic. |
| Someone holds the pot | Nobody does. The realm holds it. |
| "I won." "No, I won." | Neutral judges (members with no money in it) decide by strict majority. |
| Lying is free | Every player locks a 10% honesty bond and loses it if their report loses the vote. |
| Judges have no reason to show up | Majority judges split a 1% fee plus half of every forfeited bond. |

## Why both players report first

Most games end without any disagreement. If both players report the same result, the bet settles instantly with **no fee and no judges**. Judges are a fallback, not a toll booth.

## Threat model

| Attack | Mitigation | Residual risk |
|---|---|---|
| Loser reports a fake result | Goes to judges; the liar forfeits their bond and gets a permanent 🚩 | Judges could be wrong |
| Loser just never reports | After 24h either player can escalate; a no-show is treated as wrong and forfeits their bond | — |
| Owner adds friends mid-bet to swing a vote | Judges are snapshotted when the bet is accepted (1v1) or the last player joins (group bet), and shown before anyone locks money | Owner can stack the table *before* a bet; players see the panel before accepting |
| A "dealer" decides poker night | There is no dealer. Every player reports; any disagreement goes to the non-players | — |
| Bribing one judge | Strict majority of the whole panel, and group bets need ≥ 3 judges unless players explicitly opt in | A big enough bribe can buy a majority, like in any vote |
| Judges sit on the vote forever | 48h deadline, then anyone can trigger a full refund | Nobody is punished for a stalemate |
| Faking a deposit through another realm or `maketx run` | Every function that reads sent coins requires `IsUserCall()` | — |
| Overpaying or paying in another token | The exact `stake + 10%` in `ugnot` is required | — |
| Integer overflow on huge pots | Stakes are capped at 1 billion GNOT; group bets at 20 players | — |
| Dust stuck in the realm from rounding | Every split hands the remainder to a named recipient; tests check coins in = coins out | — |
| Markdown or link injection via names and titles | Control characters rejected, nicknames limited to `[A-Za-z0-9 -_.]`, everything escaped on render | — |
| Unbounded gas on big tables | 50 members per table, 20 players per group bet, pages and JSON show the newest 30 items | — |

## Payout math

**1v1, players agree:** winner gets `2 × stake`, both bonds come back. Draw: both stakes come back.

**1v1, judges decide:** `fee = 2 × (stake / 100)` (1% of the pot, always even).
- Winner gets `pot − fee` (draw: each gets `stake − fee/2`).
- Players whose report matched the ruling get their bond back.
- Forfeited bonds: half split among the honest players, half added to the judges' pool.
- The judges who voted with the majority split `fee + their half`.

**Group bets:** `pot = players × stake`, shares by finishing position (`100`, `60,40`, `50,30,20`, …). Disputed: `fee = pot / 100`. Same bond rules, applied to every player.

## Why gnoweb *and* a web app

The realm renders every page itself and every action is a pre-filled `$help&func=` link, so it works with nothing but gnoweb and a wallet. The web app reads the realm's JSON views and adds the things gnoweb can't do: an opponent picker, the exact amount to lock, only showing the buttons that are your move, and a "Your move" inbox across tables.

## What it doesn't try to do

- **Real-world truth.** No oracles. Results come from the people who were there.
- **Strangers.** A table of strangers can collude. This is for friend groups who want fairness and a permanent record, not for anonymous wagering.
- **Real money.** It runs on the Gno.land testnet with test GNOT.
