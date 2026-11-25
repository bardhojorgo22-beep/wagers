// Tavern Wagers web app: reads the realm over RPC (vm/qeval) and sends
// transactions through the Adena wallet. No build step, no dependencies.

const REALM_OWNER = "g1sgp0eyezdescdtzd32n2vdktazva4nyt9ppmcx";

const NETWORKS = {
  onyx: {
    label: "Testnet (onyx-1)",
    chainId: "onyx-1",
    rpc: "https://rpc.onyx.testnets.gno.land:443",
    gnoweb: "https://onyx.testnets.gno.land",
    pkg: `gno.land/r/${REALM_OWNER}/tavernwagers/v3`,
  },
  local: {
    label: "Local (gnodev)",
    chainId: "dev",
    rpc: "http://127.0.0.1:26657",
    gnoweb: "http://localhost:8888",
    pkg: `gno.land/r/${REALM_OWNER}/tavernwagers/v3`,
  },
};

const BOND_PCT = 10;
const UGNOT = 1_000_000;

function savedNet() {
  try { return localStorage.getItem("tw-net"); } catch (_) { return null; }
}

const state = {
  net: NETWORKS[savedNet()] ? savedNet() : "onyx",
  account: null, // g1 address once connected
};

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

// ---------------------------------------------------------------------------
// Chain access

function net() { return NETWORKS[state.net]; }

async function qeval(expr) {
  const data = btoa(unescape(encodeURIComponent(`${net().pkg}.${expr}`)));
  const res = await fetch(net().rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "abci_query", params: { path: "vm/qeval", data } }),
  });
  const json = await res.json();
  const r = json?.result?.response;
  if (!r) throw new Error("No response from the chain");
  const err = r.ResponseBase?.Error;
  const raw = r.ResponseBase?.Data ? decodeURIComponent(escape(atob(r.ResponseBase.Data))) : "";
  if (err) {
    const log = r.ResponseBase?.Log || "";
    if (/not enabled|inert|approver|package not found|InvalidPkgPath/i.test(log + raw)) throw new Error("NOT_ENABLED");
    throw new Error(friendlyError(log || JSON.stringify(err)));
  }
  // Data looks like: ("<go-quoted string>" string)\n\n
  const m = raw.match(/^\((".*") string\)/s);
  if (!m) throw new Error("Unexpected response: " + raw.slice(0, 120));
  return JSON.parse(JSON.parse(m[1]));
}

async function call(func, args, sendUgnot = 0) {
  if (!state.account) {
    await connect();
    if (!state.account) return false;
  }
  try {
    toast("Confirm in Adena…");
    const res = await window.adena.DoContract({
      messages: [{
        type: "/vm.m_call",
        value: {
          caller: state.account,
          send: sendUgnot ? `${sendUgnot}ugnot` : "",
          pkg_path: net().pkg,
          func,
          args: args.map(String),
        },
      }],
      gasFee: 1_000_000,
      gasWanted: 30_000_000,
    });
    if (res.status !== "success") {
      toast(friendlyError(res.message || res.data?.message || "Transaction failed"), "err");
      return false;
    }
    toast("Done ✓", "ok");
    setTimeout(route, 1500);
    return true;
  } catch (e) {
    toast(friendlyError(e.message || String(e)), "err");
    return false;
  }
}

function friendlyError(msg) {
  // Panics from the realm come back wrapped in VM noise: keep the message.
  const m = String(msg).match(/(?:panic|abort)[^:]*:\s*([^\n]+)/i);
  return (m ? m[1] : String(msg)).slice(0, 200);
}

// ---------------------------------------------------------------------------
// Wallet

async function connect() {
  if (!window.adena) {
    toast("Install the Adena wallet extension first (adena.app)", "err");
    return;
  }
  try {
    await window.adena.AddEstablish("Tavern Wagers");
    const acc = await window.adena.GetAccount();
    if (acc.status !== "success") throw new Error(acc.message || "Could not read account");
    state.account = acc.data.address;
    try { localStorage.setItem("tw-connected", "1"); } catch (_) {}
    const chain = acc.data.chainId;
    if (chain !== net().chainId) {
      if (state.net === "local") {
        await window.adena.AddNetwork({ chainId: "dev", chainName: "Gnodev", rpcUrl: net().rpc });
      }
      await window.adena.SwitchNetwork(net().chainId);
    }
    renderTop();
    route();
  } catch (e) {
    toast(friendlyError(e.message || String(e)), "err");
  }
}

function renderTop() {
  const btn = $("#connect");
  btn.textContent = state.account ? short(state.account) : "Connect Adena";
  btn.classList.toggle("ghost", !!state.account);
  $("#realm-link").href = `${net().gnoweb}/r/${REALM_OWNER}/tavernwagers/v3`;
}

// ---------------------------------------------------------------------------
// Pages

async function pageHome() {
  const tables = await qeval("TablesJSON()");
  const st = await qeval("StatsJSON()").catch(() => ({
    tables: tables.length, bets: tables.reduce((n, t) => n + t.bets, 0), settled: 0, liarsCaught: 0, biggestPot: 0, judgesPaid: 0,
  }));
  const mine = state.account ? await qeval(`MyTablesJSON("${state.account}")`) : [];

  app.innerHTML = `
    <section class="hero">
      <div>
        <h1>Bet on anything with your friends.</h1>
        <p class="lead">The money's locked upfront, neutral judges call it, and the winner gets paid automatically. No more "I'll pay you later."</p>
        <div class="actions">
          <button class="btn" id="new-table">➕ Open a table</button>
          <button class="btn ghost" id="how-btn">How it works</button>
        </div>
      </div>
      <div class="card">
        <div class="stats">
          <div><b>${st.tables}</b>tables</div>
          <div><b>${st.bets}</b>bets</div>
          <div><b>${st.settled}</b>settled</div>
          <div><b>0%</b>house cut</div>
        </div>
        <div class="stats">
          <div><b>${gnot(st.biggestPot)}</b>biggest pot</div>
          <div><b>${st.liarsCaught} 🚩</b>liars caught</div>
          <div><b>${gnot(st.judgesPaid)}</b>paid to judges</div>
        </div>
        <p class="muted small">Every coin that goes in comes back out to players and judges.</p>
      </div>
    </section>

    <div id="create-form"></div>

    ${state.account ? `<h2>Your tables</h2>${mine.length ? tableGrid(mine) : `<p class="muted">You're not at any table yet. Open one, or ask a friend to add you.</p>`}` : ""}

    <h2>All tables</h2>
    ${tables.length ? tableGrid(tables) : `<p class="muted">No tables yet. Be the first.</p>`}

    <h2 id="how">How it works</h2>
    <div class="steps">
      <div class="card step"><span class="n">1 · LOCK</span><b>Both players lock their stake</b><span>Plus a ${BOND_PCT}% honesty bond, before the game starts. Nobody holds the pot: the realm does.</span></div>
      <div class="card step"><span class="n">2 · REPORT</span><b>Agree? Paid instantly.</b><span>Both players report the result. Same answer means instant payout and both bonds back.</span></div>
      <div class="card step"><span class="n">3 · JUDGE</span><b>Disagree? Friends decide.</b><span>Everyone else at the table judges. A strict majority wins. The liar loses their bond and gets a 🚩.</span></div>
    </div>`;

  $("#how-btn").onclick = () => $("#how").scrollIntoView({ behavior: "smooth" });
  $("#new-table").onclick = () => {
    $("#create-form").innerHTML = `
      <div class="card">
        <div class="row">
          <div class="field"><label>Table name</label><input id="t-name" placeholder="Friday Chess Club" maxlength="64"></div>
          <div class="field"><label>Your nickname</label><input id="t-nick" placeholder="Alice" maxlength="24"></div>
          <button class="btn" id="t-go">Open table</button>
        </div>
      </div>`;
    $("#t-go").onclick = () => call("CreateTable", [$("#t-name").value, $("#t-nick").value]);
  };
}

function tableGrid(list) {
  return `<div class="grid">${list.map((t) => `
    <a class="card table-card" href="#/table/${t.id}">
      <h3>🍺 ${esc(t.name)}</h3>
      <div class="muted small">${plural(t.members, "member")} · ${plural(t.bets, "bet")} · owner ${esc(t.ownerNick || short(t.owner))}</div>
    </a>`).join("")}</div>`;
}

async function pageTable(id) {
  const t = await qeval(`TableJSON(${id})`);
  const nick = nicker(t);
  const me = state.account;
  const isMember = me && t.members.some((m) => m.address === me);
  const isOwner = me === t.owner;
  const ranked = [...t.members].sort((a, b) => b.net - a.net);

  app.innerHTML = `
    <a class="back" href="#/">← All tables</a>
    <h1>🍺 ${esc(t.name)}</h1>
    <p class="muted">Owner ${esc(nick(t.owner))} · ${t.members.length} members ·
      <button class="btn sm ghost" id="share">🔗 Copy table link</button></p>

    ${isMember ? `
    <div class="card">
      <b>🎲 New bet</b>
      <div class="row" style="margin-top:10px">
        <div class="field"><label>What's the bet?</label><input id="b-title" placeholder="I beat you at chess, 10 min blitz" maxlength="140"></div>
        <div class="field" style="max-width:200px"><label>Against</label>
          <select id="b-opp">${t.members.filter((m) => m.address !== me).map((m) => `<option value="${m.address}">${esc(m.nick || short(m.address))}</option>`).join("")}</select></div>
        <div class="field" style="max-width:140px"><label>Stake (GNOT)</label><input id="b-stake" type="number" min="0.01" step="0.01" value="1"></div>
        <button class="btn" id="b-go">Lock & challenge</button>
      </div>
      <p class="muted small" id="b-total"></p>
    </div>
    <div class="card">
      <b>🃏 New group bet</b> <span class="muted small">poker night, tournaments, quizzes: 3+ players</span>
      <div class="row" style="margin-top:10px">
        <div class="field"><label>What's the game?</label><input id="p-title" placeholder="Friday poker, $5 buy-in" maxlength="140"></div>
        <div class="field" style="max-width:140px"><label>Stake each (GNOT)</label><input id="p-stake" type="number" min="0.01" step="0.01" value="1"></div>
        <div class="field" style="max-width:220px"><label>Payout</label>
          <select id="p-payout">
            <option value="100">Winner takes all</option>
            <option value="60,40">Top 2 · 60/40</option>
            <option value="50,30,20">Top 3 · 50/30/20</option>
          </select></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Who's playing? (you're in automatically)</label>
        <div class="checks">${t.members.filter((m) => m.address !== me).map((m) => `
          <label class="check"><input type="checkbox" value="${m.address}"> ${esc(m.nick || short(m.address))}</label>`).join("")}</div>
      </div>
      <p class="small" id="p-judges"></p>
      <label class="check" id="p-risk-wrap" hidden><input type="checkbox" id="p-risk"> I get it: play with fewer than 3 judges anyway</label>
      <div class="actions"><button class="btn" id="p-go">Lock & invite</button></div>
    </div>` : me ? `<p class="hint">You're not at this table. Ask ${esc(nick(t.owner))} to add you.</p>` : `<p class="hint">Connect your wallet to bet at this table.</p>`}

    <h2>🏆 Leaderboard</h2>
    <div class="card"><table>
      <tr><th>#</th><th>Member</th><th class="num">Net</th><th>W-L-D</th><th>Disputes lost</th><th>Judged</th><th></th></tr>
      ${ranked.map((m, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><b>${esc(m.nick || short(m.address))}</b>${m.address === me ? ` <span class="muted small">(you)</span>` : ""}</td>
          <td class="num ${m.net > 0 ? "pos" : m.net < 0 ? "neg" : ""}">${gnot(m.net, true)}</td>
          <td>${m.wins}-${m.losses}-${m.draws}</td>
          <td>${m.disputesLost ? `<span class="flag">🚩 ${m.disputesLost}</span>` : "0"}</td>
          <td>${m.judged}</td>
          <td>${isMember && m.address !== me ? `<button class="btn sm ghost" data-vs="${m.address}">🎲 Challenge</button>` : ""}</td>
        </tr>`).join("")}
    </table></div>

    ${t.pools.length ? `<h2>🃏 Group bets</h2><div class="card"><table>
      <tr><th>Game</th><th>Players</th><th class="num">Stake</th><th>Status</th></tr>
      ${t.pools.map((p) => `
        <tr>
          <td><a href="#/pool/${p.id}">${esc(p.title)}</a></td>
          <td>${p.players.length}</td>
          <td class="num">${gnot(p.stake)}</td>
          <td>${poolPill(p, nick)}</td>
        </tr>`).join("")}
    </table></div>` : ""}

    <h2>🎲 Bets</h2>
    ${t.bets.length ? `<div class="card"><table>
      <tr><th>Bet</th><th>Players</th><th class="num">Stake</th><th>Status</th></tr>
      ${t.bets.map((b) => `
        <tr>
          <td><a href="#/bet/${b.id}">${esc(b.title)}</a></td>
          <td>${esc(nick(b.playerA))} vs ${esc(nick(b.playerB))}</td>
          <td class="num">${gnot(b.stake)}</td>
          <td>${statusPill(b, nick)}</td>
        </tr>`).join("")}
    </table></div>` : `<p class="muted">No bets yet.</p>`}

    ${isOwner ? `
    <h2>👋 Add a member</h2>
    <div class="card"><div class="row">
      <div class="field"><label>Their g1 address</label><input id="m-addr" placeholder="g1..."></div>
      <div class="field" style="max-width:220px"><label>Nickname</label><input id="m-nick" placeholder="Bob" maxlength="24"></div>
      <button class="btn" id="m-go">Add</button>
    </div></div>` : ""}

    ${isMember ? `
    <h2>✏️ Your nickname</h2>
    <div class="card"><div class="row">
      <div class="field"><input id="n-nick" value="${esc(nick(me) === short(me) ? "" : nick(me))}" maxlength="24"></div>
      <button class="btn ghost" id="n-go">Save</button>
    </div></div>` : ""}`;

  $("#share").onclick = async () => {
    const url = location.href.split("#")[0] + `#/table/${id}`;
    try { await navigator.clipboard.writeText(url); toast("Link copied. Send it to the group chat 🍺", "ok"); }
    catch (_) { prompt("Copy this link:", url); }
  };
  app.querySelectorAll("[data-vs]").forEach((el) => el.onclick = () => {
    $("#b-opp").value = el.dataset.vs;
    $("#b-title").focus();
    $("#b-title").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  if (isMember) {
    const total = () => {
      const s = toUgnot($("#b-stake").value);
      $("#b-total").textContent = s ? `You'll lock ${gnot(s + Math.floor(s / BOND_PCT))} (stake + ${BOND_PCT}% bond). Your opponent locks the same when they accept.` : "";
    };
    $("#b-stake").oninput = total;
    total();
    $("#b-go").onclick = () => {
      const s = toUgnot($("#b-stake").value);
      if (!s) return toast("Enter a stake", "err");
      call("CreateBet", [id, $("#b-title").value, $("#b-opp").value, s], s + Math.floor(s / BOND_PCT));
    };
    $("#n-go").onclick = () => call("SetNickname", [id, $("#n-nick").value]);
    const judgeInfo = () => {
      const picked = app.querySelectorAll(".checks input:checked").length;
      const judges = t.members.length - 1 - picked;
      const few = judges < 3;
      $("#p-judges").innerHTML = few
        ? `<span class="flag">⚠️ Only ${judges} ${judges === 1 ? "person" : "people"} left to judge.</span> <span class="muted">If players disagree, they decide alone. We recommend leaving at least 3 people out to judge, and rotating who sits out each game.</span>`
        : `<span class="pos">⚖️ ${judges} judges</span> <span class="muted">(everyone not playing). Rotate who sits out each game.</span>`;
      $("#p-risk-wrap").hidden = !few;
    };
    app.querySelectorAll(".checks input").forEach((el) => el.onchange = judgeInfo);
    judgeInfo();
    $("#p-go").onclick = () => {
      const s = toUgnot($("#p-stake").value);
      if (!s) return toast("Enter a stake", "err");
      const picked = [...app.querySelectorAll(".checks input:checked")].map((el) => el.value);
      const places = $("#p-payout").value.split(",").length;
      if (picked.length < 2) return toast("Pick at least 2 other players", "err");
      if (places >= picked.length + 1) return toast("Too many paid places for this many players", "err");
      const few = t.members.length - 1 - picked.length < 3;
      if (few && !$("#p-risk").checked) return toast("Fewer than 3 judges: tick the box to play anyway", "err");
      call("CreatePool", [id, $("#p-title").value, picked.join(","), s, $("#p-payout").value, few ? "true" : "false"], s + Math.floor(s / BOND_PCT));
    };
  }
  if (isOwner) $("#m-go").onclick = () => call("AddMember", [id, $("#m-addr").value.trim(), $("#m-nick").value]);
}

async function pageBet(id) {
  const b = await qeval(`BetJSON(${id})`);
  const t = await qeval(`TableJSON(${b.tableId})`);
  const nick = nicker(t);
  const me = state.account;
  const A = nick(b.playerA), B = nick(b.playerB);
  const label = (r) => r === "a" ? `${A} won` : r === "b" ? `${B} won` : r === "draw" ? "Draw" : "—";
  const lock = b.stake + b.bond;
  const isA = me === b.playerA, isB = me === b.playerB;
  const myReport = isA ? b.reportA : isB ? b.reportB : "";
  const judge = b.judges.find((j) => j.address === me);
  const votes = { a: 0, b: 0, draw: 0 };
  b.judges.forEach((j) => { if (j.vote) votes[j.vote]++; });
  const need = Math.floor(b.judges.length / 2) + 1;

  let actions = "";
  if (b.status === "open") {
    actions = `<div class="hint">👉 Waiting for <b>${esc(B)}</b> to accept and lock ${gnot(lock)}.</div>
      <div class="actions">
        ${isB ? `<button class="btn green" data-do="accept">✅ Accept & lock ${gnot(lock)}</button>` : ""}
        ${isA ? `<button class="btn ghost" data-do="cancel">Cancel & refund</button>` : ""}
      </div>`;
  } else if (b.status === "live") {
    const waiting = !b.reportA && !b.reportB ? `Game on! After the game, both players report the result.` :
      !b.reportA ? `Waiting for <b>${esc(A)}</b> to report.` : `Waiting for <b>${esc(B)}</b> to report.`;
    actions = `<div class="hint">👉 ${waiting}</div>`;
    if ((isA || isB) && !myReport) {
      actions += `<div class="actions">
        <button class="btn" data-report="a">${esc(A)} won</button>
        <button class="btn" data-report="b">${esc(B)} won</button>
        <button class="btn ghost" data-report="draw">Draw</button></div>`;
    }
    if ((isA || isB) && myReport && b.firstReportAt) {
      const due = new Date(Date.parse(b.firstReportAt) + 24 * 3600 * 1000);
      actions += `<p class="muted small">If the other player hasn't reported by ${due.toLocaleString()}, you can
        <button class="btn sm ghost" data-do="escalate">send it to the judges</button></p>`;
    }
  } else if (b.status === "disputed") {
    actions = `<div class="hint">⚖️ <b>${esc(A)}</b> and <b>${esc(B)}</b> disagree. The judges decide: ${need} of ${b.judges.length} votes needed.
      Voting closes ${new Date(b.deadline).toLocaleString()}.<br>
      Votes: ${esc(A)} won <b>${votes.a}</b> · ${esc(B)} won <b>${votes.b}</b> · draw <b>${votes.draw}</b></div>`;
    if (judge && !judge.vote) {
      actions += `<div class="actions">
        <button class="btn" data-vote="a">Vote ${esc(A)} won</button>
        <button class="btn" data-vote="b">Vote ${esc(B)} won</button>
        <button class="btn ghost" data-vote="draw">Vote draw</button></div>`;
    }
    if (Date.now() > Date.parse(b.deadline)) {
      actions += `<div class="actions"><button class="btn ghost" data-do="expire">No majority: refund everyone</button></div>`;
    }
  }

  const winA = b.status === "settled" && b.final === "a";
  const winB = b.status === "settled" && b.final === "b";

  app.innerHTML = `
    <a class="back" href="#/table/${t.id}">← ${esc(t.name)}</a>
    <h1>🎲 ${esc(b.title)}</h1>
    <p>${statusPill(b, nick)}</p>

    <div class="versus">
      <div class="player ${winA ? "win" : ""}"><div class="name">${esc(A)}</div><div class="muted small">reported: ${label(b.reportA)}</div></div>
      <div class="vs">VS</div>
      <div class="player ${winB ? "win" : ""}"><div class="name">${esc(B)}</div><div class="muted small">reported: ${label(b.reportB)}</div></div>
    </div>
    <p class="muted" style="text-align:center">Stake ${gnot(b.stake)} each · bond ${gnot(b.bond)} each · pot <b style="color:var(--text)">${gnot(2 * b.stake)}</b></p>

    ${actions}

    ${b.judges.length ? `<h2>⚖️ Judges</h2>
      <p class="muted small">Fixed when the bet was accepted. Only used if the players disagree.</p>
      <div class="card"><table>${b.judges.map((j) => `<tr><td><b>${esc(nick(j.address))}</b></td><td>${j.vote ? label(j.vote) : `<span class="muted">not voted</span>`}</td></tr>`).join("")}</table></div>` : ""}

    ${b.payouts.length ? `<h2>💸 Payouts</h2>
      <div class="card"><table>
        <tr><th>To</th><th class="num">Amount</th><th>Why</th></tr>
        ${b.payouts.map((p) => `<tr><td><b>${esc(nick(p.to))}</b></td><td class="num">${gnot(p.amount)}</td><td class="muted">${esc(p.why)}</td></tr>`).join("")}
      </table></div>` : ""}`;

  app.querySelectorAll("[data-report]").forEach((el) => el.onclick = () => call("Report", [id, el.dataset.report]));
  app.querySelectorAll("[data-vote]").forEach((el) => el.onclick = () => call("Vote", [id, el.dataset.vote]));
  app.querySelectorAll("[data-do]").forEach((el) => el.onclick = () => {
    const d = el.dataset.do;
    if (d === "accept") call("AcceptBet", [id], lock);
    if (d === "cancel") call("CancelBet", [id]);
    if (d === "escalate") call("Escalate", [id]);
    if (d === "expire") call("ExpireDispute", [id]);
  });
}

async function pagePool(id) {
  const p = await qeval(`PoolJSON(${id})`);
  const t = await qeval(`TableJSON(${p.tableId})`);
  const nick = nicker(t);
  const me = state.account;
  const lock = p.stake + p.bond;
  const pot = p.stake * p.players.length;
  const mePlayer = p.players.find((x) => x.address === me);
  const judge = p.judges.find((j) => j.address === me);
  const rankText = (r) => r ? r.split(",").map((a, i) => `${place(i)} ${esc(nick(a))}`).join(" · ") : "—";
  const final = p.final ? p.final.split(",") : [];
  const places = p.shares.length;
  const pickers = (prefix) => `<div class="row">${p.shares.map((sh, i) => `
      <div class="field" style="max-width:220px"><label>${place(i)} (${sh}%)</label>
        <select id="${prefix}-${i}">${p.players.map((x) => `<option value="${x.address}">${esc(nick(x.address))}</option>`).join("")}</select></div>`).join("")}
      <button class="btn" id="${prefix}-go">${prefix === "r" ? "Report" : "Vote"}</button></div>`;
  const picked = (prefix) => p.shares.map((_, i) => $(`#${prefix}-${i}`).value);

  let actions = "";
  if (p.status === "open") {
    const joined = p.players.filter((x) => x.joined).length;
    actions = `<div class="hint">👉 ${joined}/${p.players.length} players have locked their stake. The game goes live when everyone's in.</div>
      <div class="actions">
        ${mePlayer && !mePlayer.joined ? `<button class="btn green" data-do="join">✅ Join & lock ${gnot(lock)}</button>` : ""}
        ${me === p.creator ? `<button class="btn ghost" data-do="cancel">Cancel & refund everyone</button>` : ""}
      </div>`;
  } else if (p.status === "live") {
    const left = p.players.filter((x) => !x.report).map((x) => nick(x.address));
    actions = `<div class="hint">👉 Game on! When it's over, every player reports the top ${places === 1 ? "finisher" : places}.
      ${left.length < p.players.length ? `Still waiting for: <b>${left.map(esc).join(", ")}</b>` : ""}</div>`;
    if (mePlayer && !mePlayer.report) actions += pickers("r");
    if (mePlayer && mePlayer.report && p.firstReportAt) {
      const due = new Date(Date.parse(p.firstReportAt) + 24 * 3600 * 1000);
      actions += `<p class="muted small">If someone still hasn't reported by ${due.toLocaleString()}, you can
        <button class="btn sm ghost" data-do="escalate">send it to the judges</button></p>`;
    }
  } else if (p.status === "disputed") {
    const need = Math.floor(p.judges.length / 2) + 1;
    actions = `<div class="hint">⚖️ The players don't agree on the result. The judges decide: ${need} of ${p.judges.length} matching votes needed.
      Voting closes ${new Date(p.deadline).toLocaleString()}.</div>`;
    if (judge && !judge.vote) actions += pickers("v");
    if (Date.now() > Date.parse(p.deadline)) actions += `<div class="actions"><button class="btn ghost" data-do="expire">No majority: refund everyone</button></div>`;
  }

  app.innerHTML = `
    <a class="back" href="#/table/${t.id}">← ${esc(t.name)}</a>
    <h1>🃏 ${esc(p.title)}</h1>
    <p>${poolPill(p, nick)}</p>
    ${p.fewJudges ? `<div class="hint">⚠️ Started with fewer than 3 judges. If players disagree, very few people decide the result. Play with people you trust.</div>` : ""}
    <p class="muted">${p.players.length} players · ${gnot(p.stake)} each · bond ${gnot(p.bond)} each · pot <b style="color:var(--text)">${gnot(pot)}</b>
      · payout ${p.shares.map((sh, i) => `${place(i)} ${sh}%`).join(" / ")}</p>

    ${actions}

    <h2>Players</h2>
    <div class="card"><table>
      <tr><th>Player</th><th>Stake</th><th>Reported</th></tr>
      ${p.players.map((x) => `<tr class="${final[0] === x.address ? "winrow" : ""}">
        <td><b>${esc(nick(x.address))}</b>${final[0] === x.address ? " 🏆" : ""}${x.address === me ? ` <span class="muted small">(you)</span>` : ""}</td>
        <td>${x.joined ? "✅ locked" : `<span class="muted">⏳ not yet</span>`}</td>
        <td class="small">${rankText(x.report)}</td></tr>`).join("")}
    </table></div>

    ${p.judges.length ? `<h2>⚖️ Judges</h2>
      <p class="muted small">The table members who didn't play. Only used if players disagree.</p>
      <div class="card"><table>${p.judges.map((j) => `<tr><td><b>${esc(nick(j.address))}</b></td><td class="small">${j.vote ? rankText(j.vote) : `<span class="muted">not voted</span>`}</td></tr>`).join("")}</table></div>` : ""}

    ${p.payouts.length ? `<h2>💸 Payouts</h2>
      <div class="card"><table>
        <tr><th>To</th><th class="num">Amount</th><th>Why</th></tr>
        ${p.payouts.map((x) => `<tr><td><b>${esc(nick(x.to))}</b></td><td class="num">${gnot(x.amount)}</td><td class="muted">${esc(x.why)}</td></tr>`).join("")}
      </table></div>` : ""}`;

  if ($("#r-go")) $("#r-go").onclick = () => call("ReportPool", [id, picked("r").join(",")]);
  if ($("#v-go")) $("#v-go").onclick = () => call("VotePool", [id, picked("v").join(",")]);
  // Pre-select different players in each place.
  ["r", "v"].forEach((prefix) => p.shares.forEach((_, i) => {
    const el = $(`#${prefix}-${i}`);
    if (el && p.players[i]) el.value = p.players[i].address;
  }));
  app.querySelectorAll("[data-do]").forEach((el) => el.onclick = () => {
    const d = el.dataset.do;
    if (d === "join") call("JoinPool", [id], lock);
    if (d === "cancel") call("CancelPool", [id]);
    if (d === "escalate") call("EscalatePool", [id]);
    if (d === "expire") call("ExpirePool", [id]);
  });
}

function place(i) { return ["1st", "2nd", "3rd"][i] || `${i + 1}th`; }

function poolPill(p, nick) {
  const joined = p.players.filter((x) => x.joined).length;
  const text = {
    open: `🟡 ${joined}/${p.players.length} joined`,
    live: "🟢 live",
    disputed: "⚖️ judges voting",
    settled: `🏆 ${p.final ? nick(p.final.split(",")[0]) + " won" : "settled"}`,
    cancelled: "❌ cancelled",
    refunded: "↩️ refunded",
  }[p.status] || p.status;
  return `<span class="pill ${p.status}">${esc(text)}</span>`;
}

// ---------------------------------------------------------------------------
// Router

async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  try {
    if (parts[0] === "table" && parts[1]) await pageTable(parseInt(parts[1], 10));
    else if (parts[0] === "bet" && parts[1]) await pageBet(parseInt(parts[1], 10));
    else if (parts[0] === "pool" && parts[1]) await pagePool(parseInt(parts[1], 10));
    else await pageHome();
  } catch (e) {
    if (e.message === "NOT_ENABLED") {
      app.innerHTML = `<h1>Almost there 🍺</h1>
        <p class="lead">The realm is deployed on ${esc(net().label)}, but the network hasn't enabled it yet.
        New packages on this testnet wait for an approver. Try again later, or switch to Local.</p>
        <p><button class="btn ghost" onclick="document.querySelector('#network').value='local';document.querySelector('#network').onchange()">Switch to Local</button></p>`;
    } else if (/not found/i.test(e.message)) {
      app.innerHTML = `<a class="back" href="#/">← Home</a><h1>Not found</h1>`;
    } else {
      app.innerHTML = `<h1>Can't reach the chain</h1><p class="muted">${esc(e.message)}</p>
        <p class="muted small">Network: ${esc(net().label)} (${esc(net().rpc)})</p>`;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers

function nicker(t) {
  const names = Object.fromEntries(t.members.map((m) => [m.address, m.nick]));
  return (addr) => names[addr] || short(addr);
}

function statusPill(b, nick) {
  const text = {
    open: `🟡 waiting for ${nick(b.playerB)}`,
    live: "🟢 live",
    disputed: "⚖️ judges voting",
    settled: `✅ ${b.final === "a" ? nick(b.playerA) + " won" : b.final === "b" ? nick(b.playerB) + " won" : "draw"}`,
    cancelled: "❌ cancelled",
    refunded: "↩️ refunded",
  }[b.status] || b.status;
  return `<span class="pill ${b.status}">${esc(text)}</span>`;
}

function gnot(u, signed = false) {
  const sign = u < 0 ? "-" : signed && u > 0 ? "+" : "";
  const v = Math.abs(u) / UGNOT;
  return `${sign}${v.toLocaleString(undefined, { maximumFractionDigits: 6 })} GNOT`;
}

function toUgnot(v) {
  const n = Math.round(parseFloat(v) * UGNOT);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function plural(n, word) { return `${n} ${word}${n === 1 ? "" : "s"}`; }

function short(a) { return a ? `${a.slice(0, 7)}…${a.slice(-4)}` : ""; }

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
function toast(msg, kind = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, kind === "err" ? 7000 : 3500);
}

// ---------------------------------------------------------------------------
// Boot

const sel = $("#network");
sel.innerHTML = Object.entries(NETWORKS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
sel.value = state.net;
sel.onchange = () => {
  state.net = sel.value;
  try { localStorage.setItem("tw-net", state.net); } catch (_) {}
  state.account = null;
  renderTop();
  route();
};
$("#connect").onclick = connect;
window.addEventListener("hashchange", route);
renderTop();

// Reconnect silently after a refresh if the user connected before.
(async () => {
  let was = false;
  try { was = localStorage.getItem("tw-connected") === "1"; } catch (_) {}
  // Adena injects itself shortly after page load.
  for (let i = 0; was && !window.adena && i < 20; i++) await new Promise((r) => setTimeout(r, 100));
  if (was && window.adena) {
    try {
      const acc = await window.adena.GetAccount();
      if (acc.status === "success") {
        state.account = acc.data.address;
        renderTop();
      }
    } catch (_) {}
  }
  route();
})();
