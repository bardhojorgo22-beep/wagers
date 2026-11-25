// Demo mode: sample data shaped exactly like the realm's JSON views, so
// anyone can click through the app before the testnet package is enabled.
// It mirrors scripts/demo-scenario.sh plus a few games in progress.
// Nothing here touches a chain; every action is disabled in demo mode.

(() => {
  const A = {
    alice: "g1r4fuzhr3dp603q35ew57ayuzga69tyuc7lsvmc",
    bob: "g1rmme0557und5zxsqredce67seglmlpwp9gnwt2",
    marco: "g1hz3j0k6gqvgktxwxp3lfrfppwgv58ly06q5089",
    sara: "g13w7w4xaprxwxnpr7x2ccm22v64djar720jvyx4",
    leo: "g1q8salrvcmwx4hlwa4fjqw320f2p585h7cuu3px",
  };
  const G = 1_000_000;
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
  const now = Date.now();

  const bets = {
    1: {
      id: 1, tableId: 1, title: "Alice beats Bob, 10 min blitz", playerA: A.alice, playerB: A.bob,
      stake: 5 * G, bond: 0.5 * G, status: "settled", reportA: "a", reportB: "a", final: "a",
      judges: [A.marco, A.sara, A.leo].map((a) => ({ address: a, vote: "" })),
      deadline: "", firstReportAt: iso(now - 3 * 86400e3),
      payouts: [
        { to: A.alice, amount: 10 * G, why: "won the pot" },
        { to: A.alice, amount: 0.5 * G, why: "bond back" },
        { to: A.bob, amount: 0.5 * G, why: "bond back" },
      ],
    },
    2: {
      id: 2, tableId: 1, title: "Rematch: Alice wins again", playerA: A.alice, playerB: A.bob,
      stake: 5 * G, bond: 0.5 * G, status: "settled", reportA: "a", reportB: "b", final: "a",
      judges: [
        { address: A.marco, vote: "a" }, { address: A.sara, vote: "a" }, { address: A.leo, vote: "" },
      ],
      deadline: "", firstReportAt: iso(now - 2 * 86400e3),
      payouts: [
        { to: A.alice, amount: 9.9 * G, why: "won the pot" },
        { to: A.alice, amount: 0.5 * G, why: "bond back" },
        { to: A.alice, amount: 0.25 * G, why: "liar's bond" },
        { to: A.marco, amount: 0.175 * G, why: "judge reward" },
        { to: A.sara, amount: 0.175 * G, why: "judge reward" },
      ],
    },
    3: {
      id: 3, tableId: 1, title: "Bob beats Leo at FIFA", playerA: A.bob, playerB: A.leo,
      stake: 5 * G, bond: 0.5 * G, status: "open", reportA: "", reportB: "", final: "",
      judges: [], deadline: "", firstReportAt: "", payouts: [],
    },
    4: {
      id: 4, tableId: 1, title: "Darts, best of 3", playerA: A.sara, playerB: A.marco,
      stake: 2 * G, bond: 0.2 * G, status: "disputed", reportA: "a", reportB: "b", final: "",
      judges: [
        { address: A.alice, vote: "a" }, { address: A.bob, vote: "" }, { address: A.leo, vote: "" },
      ],
      deadline: iso(now + 30 * 3600e3), firstReportAt: iso(now - 5 * 3600e3), payouts: [],
    },
    5: {
      id: 5, tableId: 1, title: "Ping pong, first to 21", playerA: A.leo, playerB: A.alice,
      stake: 1 * G, bond: 0.1 * G, status: "live", reportA: "a", reportB: "", final: "",
      judges: [A.bob, A.marco, A.sara].map((a) => ({ address: a, vote: "" })),
      deadline: "", firstReportAt: iso(now - 2 * 3600e3), payouts: [],
    },
  };

  const pools = {
    1: {
      id: 1, kind: "pool", tableId: 1, title: "Friday poker night", creator: A.alice,
      stake: 5 * G, bond: 0.5 * G, shares: [100], status: "settled",
      players: [A.alice, A.bob, A.leo].map((a) => ({ address: a, joined: true, report: A.leo })),
      judges: [A.marco, A.sara].map((a) => ({ address: a, vote: "" })),
      final: A.leo, fewJudges: true, deadline: "", firstReportAt: iso(now - 86400e3),
      payouts: [
        { to: A.leo, amount: 15 * G, why: "1st place" },
        { to: A.alice, amount: 0.5 * G, why: "bond back" },
        { to: A.bob, amount: 0.5 * G, why: "bond back" },
        { to: A.leo, amount: 0.5 * G, why: "bond back" },
      ],
    },
    2: {
      id: 2, kind: "pool", tableId: 1, title: "Sunday FIFA cup", creator: A.bob,
      stake: 3 * G, bond: 0.3 * G, shares: [60, 40], status: "open",
      players: [
        { address: A.bob, joined: true, report: "" }, { address: A.leo, joined: true, report: "" },
        { address: A.marco, joined: false, report: "" }, { address: A.alice, joined: false, report: "" },
      ],
      judges: [], final: "", fewJudges: true, deadline: "", firstReportAt: "", payouts: [],
    },
  };

  const members = [
    { address: A.alice, nick: "Alice", net: 5.15 * G, wins: 2, losses: 1, draws: 0, disputesLost: 0, judged: 0 },
    { address: A.bob, nick: "Bob", net: -15.5 * G, wins: 0, losses: 3, draws: 0, disputesLost: 1, judged: 0 },
    { address: A.marco, nick: "Marco", net: 0.175 * G, wins: 0, losses: 0, draws: 0, disputesLost: 0, judged: 1 },
    { address: A.sara, nick: "Sara", net: 0.175 * G, wins: 0, losses: 0, draws: 0, disputesLost: 0, judged: 1 },
    { address: A.leo, nick: "Leo", net: 10 * G, wins: 1, losses: 0, draws: 0, disputesLost: 0, judged: 0 },
  ];

  const table = {
    id: 1, name: "Friday Chess Club", owner: A.alice, members,
    bets: [5, 4, 3, 2, 1].map((i) => bets[i]),
    pools: [2, 1].map((i) => pools[i]),
  };

  const data = {
    "TablesJSON()": [{ id: 1, name: table.name, owner: A.alice, ownerNick: "Alice", members: 5, bets: 7 }],
    "StatsJSON()": { tables: 1, bets: 7, settled: 3, locked: 38.5 * G, liarsCaught: 1, biggestPot: 15 * G, judgesPaid: 0.35 * G },
    "TableJSON(1)": table,
  };
  for (const [id, b] of Object.entries(bets)) data[`BetJSON(${id})`] = b;
  for (const [id, p] of Object.entries(pools)) data[`PoolJSON(${id})`] = p;

  window.DEMO = {
    data,
    me: A.alice, // demo visitors browse as Alice, so they see her buttons
    query(expr) {
      if (expr.startsWith("MyTablesJSON(")) return data["TablesJSON()"];
      if (expr in data) return JSON.parse(JSON.stringify(data[expr]));
      throw new Error("not found");
    },
  };
})();
