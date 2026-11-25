# DoraHacks submission text

**Name:** Tavern Wagers

**One-liner:** Bet on anything with your friends. The money's locked upfront, neutral judges call it, and the winner gets paid automatically.

**Short description:**

Friendly bets break down in three ways: the loser doesn't pay, someone has to hold the pot, and nobody agrees on who won. Tavern Wagers is a Gno realm that fixes all three.

Friends form an invite-only table. Two players lock the same stake in the realm before the game, plus a 10% honesty bond. After the game, both report the result. If they agree, the realm pays out instantly. If they disagree, every other table member becomes a judge: judges have no money in the bet, so they have no reason to lie, and a strict majority settles it. The player whose report loses the vote forfeits their bond (half to the honest player, half to the judges), and gets a permanent flag on the table's leaderboard. If judges can't reach a majority in 48 hours, everyone is refunded. The realm takes no cut: every coin that goes in comes back out.

It scales past 1v1: group bets for 3-20 players (poker nights, tournaments) pay out by finishing position (winner-takes-all, 60/40, 50/30/20). There's no dealer with all the power: non-players judge disputes, a majority decides, and a game needs at least 3 judges unless the players explicitly accept the risk.

Judges are fixed when a bet is accepted, so nobody can add friends later to swing a vote. Players challenge each other by nickname (or post an open challenge anyone can take), get a rematch button, a head-to-head record, win streaks and an activity feed per table.

Two ways to use it: a web app (Adena wallet) that only shows the buttons that are your move, and the realm's own gnoweb pages, where every step is a pre-filled transaction link.

**Gno component:** the realm `gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v5` (escrow, dispute voting, bond settlement, leaderboards, gnoweb rendering, JSON views for the web app). 19 unit tests cover agreed results, disputes, draws, expired votes, no-shows, cancellations, validation, nicknames, judge snapshots, declines, stake limits, open challenges, streaks, the activity feed, leaving tables, JSON, rendering and group bets, and every settlement test checks that coins out equal coins in.

**Links:**
- Web app: https://tavern-wagers.vercel.app (opens in demo mode with sample data until the testnet package is enabled; switch to Testnet in the top bar)
- Repo: https://github.com/bardhojorgo22-beep/wagers
- Live: https://onyx.testnets.gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers/v5
- Demo video: (add link)

**Tags:** Gno, Smart Contracts, DeFi, Social, Gaming
