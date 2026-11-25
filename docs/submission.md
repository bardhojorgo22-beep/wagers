# DoraHacks submission text

**Name:** Tavern Wagers

**One-liner:** Bet on anything with your friends. The money's locked upfront, neutral judges call it, and the winner gets paid automatically.

**Short description:**

Friendly bets break down in three ways: the loser doesn't pay, someone has to hold the pot, and nobody agrees on who won. Tavern Wagers is a Gno realm that fixes all three.

Friends form an invite-only table. Two players lock the same stake in the realm before the game, plus a 10% honesty bond. After the game, both report the result. If they agree, the realm pays out instantly. If they disagree, every other table member becomes a judge: judges have no money in the bet, so they have no reason to lie, and a strict majority settles it. The player whose report loses the vote forfeits their bond (half to the honest player, half to the judges), and gets a permanent flag on the table's leaderboard. If judges can't reach a majority in 48 hours, everyone is refunded. The realm takes no cut: every coin that goes in comes back out.

Everything renders on gnoweb: tables with leaderboards, bet pages with reports, votes and a payout breakdown, and pre-filled action links for every step.

**Gno component:** the realm `gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers` (escrow, dispute voting, bond settlement, leaderboards, gnoweb rendering). 9 unit tests cover agreed results, disputes, draws, expired votes, no-shows, cancellations, validation, nicknames and rendering, and every settlement test checks that coins out equal coins in.

**Links:**
- Repo: https://github.com/bardhojorgo22-beep/wagers
- Live: https://onyx.testnets.gno.land/r/g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx/tavernwagers
- Demo video: (add link)

**Tags:** Gno, Smart Contracts, DeFi, Social, Gaming
