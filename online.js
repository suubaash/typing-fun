'use strict';

/* Rowing with a cousin who is far away.
   The two browsers talk through a free public message relay (MQTT over WebSocket).
   Only first names, boat designs and race progress are sent. */

const PLAYERS = ['Shivalika', 'Vedisha'];
const NET_URL = 'wss://broker.emqx.io:8084/mqtt';
const NET_TOPIC = 'typingfun/ohana-7f3k9q2x/m'; // the family's private-ish channel
const TEAM_ROBOT_STEPS = 8; // wrong keys (from both cousins) it takes for the robot to finish

const net = {
  sid: Math.random().toString(36).slice(2), // this browser tab
  client: null,
  up: false,
  peer: null,     // { sid, name, rower, letters, seen }
  pending: null,  // an invite we sent and are waiting on: { race, mode, words }
  incoming: null, // an invite we received
  race: null,     // the online race being played: { id, onMessage }
  last: null,     // how our last race ended, in case the cousin missed it
  note: '',       // a line to show in the online panel
};

const peerOnline = () => !!net.peer && Date.now() - net.peer.seen < 12000;
const cousinName = () => (net.peer && net.peer.name) || PLAYERS.find(p => p !== save.me) || 'your cousin';
const onSetup = () => !$('rowSetupScreen').hidden && save.rowVs === 'online';

function netSend(type, data) {
  if (!net.up) return;
  net.client.publish(NET_TOPIC, JSON.stringify({ sid: net.sid, from: save.me, type, ...data }));
}

// tell the cousin we are here, what our boat looks like and which letters we know
function netHello() {
  netSend('hello', { rower: save.rowers[0], letters: knownLetters().join('') });
}

function netConnect() {
  if (net.client || !save.me) return;
  if (typeof mqtt === 'undefined') {
    net.note = 'Online play needs the internet. Check the connection and open the game again.';
    return;
  }
  net.client = mqtt.connect(NET_URL, { clientId: 'tf-' + net.sid, keepalive: 30, reconnectPeriod: 4000 });
  net.client.on('connect', () => {
    net.up = true;
    net.client.subscribe(NET_TOPIC);
    netHello();
    refreshOnline();
  });
  net.client.on('close', () => { net.up = false; refreshOnline(); });
  net.client.on('error', () => { /* it keeps retrying by itself */ });
  net.client.on('message', (topic, payload) => {
    let m;
    try { m = JSON.parse(payload.toString()); } catch (e) { return; }
    if (m && m.sid && m.sid !== net.sid) onNetMessage(m);
  });

  setInterval(netHello, 4000);
  // notice when the cousin goes away
  let wasOnline = false;
  setInterval(() => {
    const now = peerOnline();
    if (now !== wasOnline) { wasOnline = now; refreshOnline(); }
    if (!now && net.race) net.race.onMessage({ type: 'leave', race: net.race.id });
  }, 2000);
  window.addEventListener('pagehide', () => netSend('bye', {}));
}

// Messages come over a public relay, so never trust what is inside them.
function cleanRower(r) {
  const ok = r && Object.values(RIDERS).some(list => list.includes(r.who)) &&
    BOAT_COLORS.includes(r.color) && r.deco in BOAT_DECOS;
  return ok ? { who: r.who, color: r.color, deco: r.deco } : null;
}
const cleanName = s => String(s || '').replace(/[^\p{L} ]/gu, '').trim().slice(0, 20) || 'Cousin';
const cleanWords = w => (Array.isArray(w) ? w : []).filter(x => /^[a-z]{1,8}$/.test(x)).slice(0, 10);

function onNetMessage(m) {
  if (m.type === 'hello') {
    const isNew = !peerOnline() || net.peer.sid !== m.sid;
    net.peer = {
      sid: m.sid,
      name: cleanName(m.from),
      rower: cleanRower(m.rower),
      letters: String(m.letters || '').replace(/[^a-z]/g, ''),
      seen: Date.now(),
    };
    if (isNew) { netHello(); refreshOnline(); }
    return;
  }
  if (!net.peer || m.sid !== net.peer.sid) return;
  net.peer.seen = Date.now();

  if (m.type === 'bye') {
    net.peer.seen = 0;
    hideInvite();
    refreshOnline();
  } else if (m.type === 'invite') {
    if (net.race) return netSend('decline', { race: m.race, busy: true });
    // we both invited at the same moment: the invite from the smaller id wins
    if (net.pending) {
      if (net.sid < m.sid) return;
      net.pending = null;
    }
    const words = cleanWords(m.words);
    if (words.length) showInvite({ race: String(m.race), mode: m.mode === 'team' ? 'team' : 'versus', words });
  } else if (m.type === 'cancel') {
    if (net.incoming && net.incoming.race === m.race) hideInvite();
  } else if (m.type === 'decline') {
    if (net.pending && net.pending.race === m.race) {
      net.pending = null;
      net.note = m.busy ? `${cousinName()} is in a race right now.` : `${cousinName()} said not now. Maybe later!`;
      say(net.note);
      refreshOnline();
    }
  } else if (m.type === 'accept') {
    if (net.pending && net.pending.race === m.race) {
      const invite = net.pending;
      net.pending = null;
      runOnlineRace(invite);
    } else {
      netSend('leave', { race: m.race });
    }
  } else if (net.race && m.race === net.race.id) {
    net.race.onMessage(m);
  } else if (m.type === 'prog' && net.last && m.race === net.last.race && net.last.ms !== null && m.know !== net.last.ms) {
    // our race is over but hers is still waiting for our finish
    netSend('prog', { ...net.last, know: m.ms });
  }
}

/* ---------- inviting ---------- */
function sendInvite(mode) {
  // only words both cousins can type
  const theirs = new Set(net.peer.letters);
  const shared = knownWords().filter(w => [...w].every(c => theirs.has(c)));
  const short = shuffle(shared.filter(w => w.length <= 3));
  const long = shuffle(shared.filter(w => w.length > 3));
  let words = short.concat(long).slice(0, RACE_WORDS).sort((a, b) => a.length - b.length);
  if (!words.length) words = pickWords(RACE_WORDS);
  net.pending = { race: net.sid + Date.now().toString(36), mode, words };
  net.note = '';
  netSend('invite', net.pending);
  say(`I asked ${cousinName()}. Let's wait for her answer.`);
  refreshOnline();
}

function showInvite(m) {
  net.incoming = m;
  const what = m.mode === 'team' ? 'wants to team up against the robot!' : 'wants to race you!';
  $('inviteText').textContent = `🚣 ${cousinName()} ${what}`;
  $('inviteBanner').hidden = false;
  sfx.win();
  say(`${cousinName()} ${what}`);
  refreshOnline();
}

function hideInvite() {
  net.incoming = null;
  $('inviteBanner').hidden = true;
}

$('inviteYes').addEventListener('click', () => {
  const m = net.incoming;
  hideInvite();
  if (!m) return;
  netSend('accept', { race: m.race });
  runOnlineRace({ race: m.race, mode: m.mode, words: m.words });
});
$('inviteNo').addEventListener('click', () => {
  if (net.incoming) netSend('decline', { race: net.incoming.race });
  hideInvite();
});

/* ---------- the online part of the rowing setup screen ---------- */
function refreshOnline() {
  if (onSetup()) renderOnlinePanel();
}

function renderOnlinePanel() {
  const panel = $('onlinePanel');
  if (!save.me) {
    panel.innerHTML = `<p class="who">Who are you?</p><div class="chips">` +
      PLAYERS.map(p => `<button type="button" class="pill-btn big" data-me="${p}">${p}</button>`).join('') + `</div>`;
    return;
  }
  netConnect();
  const cousin = cousinName();
  const online = peerOnline();
  const status = !net.client ? net.note
    : !net.up ? 'Connecting…'
    : online ? `🟢 ${cousin} is here!`
    : `${cousin} is not here yet. Ask her to open the game and tap Rowing Race.`;
  const waiting = net.pending
    ? `<p class="status">Waiting for ${cousin} to say yes…</p><button type="button" class="pill-btn" data-act="cancel">Cancel</button>`
    : `<div class="chips">
        <button type="button" class="pill-btn primary" data-act="versus" ${online ? '' : 'disabled'}>🏁 Race ${cousin}</button>
        <button type="button" class="pill-btn primary" data-act="team" ${online ? '' : 'disabled'}>🤖 Team up against the robot</button>
      </div>`;
  panel.innerHTML =
    `<p class="who">You are ${save.me}</p>` +
    `<p class="status ${online ? 'on' : ''}">${status}</p>` + waiting +
    (net.note && net.client && !net.pending ? `<p class="small">${net.note}</p>` : '') +
    `<p class="small"><button type="button" class="link-btn" data-act="switch">Not ${save.me}? Switch player</button></p>`;
}

$('onlinePanel').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.me) {
    save.me = b.dataset.me;
    persist();
    say(`Aloha, ${save.me}!`);
    netConnect();
    netHello();
  } else if (b.dataset.act === 'switch') {
    save.me = '';
    persist();
  } else if (b.dataset.act === 'cancel') {
    netSend('cancel', { race: net.pending.race });
    net.pending = null;
  } else if (peerOnline()) {
    sendInvite(b.dataset.act);
  }
  renderOnlinePanel();
});

/* ---------- the online race ---------- */
// invite: { race, mode ('versus' or 'team'), words }
function runOnlineRace(invite) {
  setMode(null);
  hideInvite();
  showScreen('raceScreen');
  const team = invite.mode === 'team';
  const cousin = cousinName();
  const total = invite.words.reduce((n, w) => n + w.length, 0);
  const startedAt = performance.now();
  const me = { hits: 0, misses: 0, ms: null };
  const them = { hits: 0, misses: 0, ms: null, left: false };
  let robotWon = false;
  let finished = false;

  const racers = [
    { name: save.me, rower: save.rowers[0], me: true },
    { name: cousin, rower: net.peer.rower || save.rowers[1] },
  ];
  if (team) racers.push({ name: 'Robot', rower: ROBOT_ROWER });

  const lanes = $('raceLanes');
  lanes.textContent = '';
  lanes.parentElement.classList.toggle('three', team);
  const boats = racers.map(r => {
    const lane = document.createElement('div');
    lane.className = 'lane' + (r.me ? ' me' : '');
    const name = document.createElement('span');
    name.className = 'lane-name';
    name.textContent = r.name;
    const boat = document.createElement('div');
    boat.className = 'boat-wrap';
    boat.innerHTML = boatSVG(r.rower);
    lane.append(name, boat);
    lanes.append(lane);
    return boat;
  });
  $('raceTitle').textContent = team ? `🚣 ${save.me} + ${cousin} against the robot` : `🚣 ${save.me} against ${cousin}`;
  $('raceOops').textContent = 0;

  const place = (boat, progress) => boat.style.setProperty('--p', Math.min(1, progress));
  const stroke = boat => {
    boat.classList.remove('stroke');
    void boat.offsetWidth; // restart the oar swing
    boat.classList.add('stroke');
  };

  function moveRobot() {
    if (!team) return;
    const steps = me.misses + them.misses;
    place(boats[2], steps / TEAM_ROBOT_STEPS);
    stroke(boats[2]);
    if (steps >= TEAM_ROBOT_STEPS && !(me.ms !== null && them.ms !== null)) robotWon = true;
  }

  // "know" tells the cousin's game what we have heard from it, so a lost message gets sent again
  const report = () => netSend('prog', { race: invite.race, hits: me.hits, misses: me.misses, ms: me.ms, know: them.ms });
  const repeat = setInterval(report, 2500);

  // the race is over when both cousins have finished (or the other one left)
  function check() {
    if (finished || me.ms === null) return;
    if (them.ms === null && !them.left) {
      $('raceNext').textContent = `You finished! Cheer for ${cousin} while she rows.`;
      return;
    }
    finished = true;
    const again = { again: openRowSetup, againLabel: 'Play again', next: showHome, nextLabel: 'Home' };
    const stats = [[me.misses, 'your wrong keys'], [them.misses, `${cousin}'s wrong keys`]];
    if (them.left) {
      return showResult({ ...again, stars: null, title: 'You finished the race!', msg: `${cousin} had to go. Invite her again later.`, stats: [stats[0]], confetti: true });
    }
    if (team) {
      return showResult({
        ...again, stars: null, stats,
        title: robotWon ? 'The robot got there first' : `${save.me} and ${cousin} beat the robot!`,
        msg: robotWon ? 'You both finished! Look for the glowing key and try again together.' : 'What a team! Careful fingers win.',
        confetti: !robotWon,
      });
    }
    const won = me.ms <= them.ms;
    showResult({
      ...again, stars: null, stats,
      title: won ? `You won, ${save.me}!` : `${cousin} won this time!`,
      msg: won ? `Great rowing! Say good game to ${cousin}.` : `Good race, ${save.me}! Say good game to ${cousin}.`,
      confetti: true,
    });
  }

  const feed = wordFeed($('raceWord'), $('raceNext'), invite.words,
    team ? `Team up with ${cousin}! The robot only moves when someone presses a wrong key.` : `Race ${cousin}! Ready, set, go!`);

  function onChar(ch) {
    if (me.ms !== null) return;
    const result = feed.type(ch);
    if (result === 'miss') {
      me.misses++;
      $('raceOops').textContent = me.misses;
      sfx.bad();
      flashKey(ch, 'miss');
      moveRobot();
    } else {
      me.hits++;
      place(boats[0], me.hits / total);
      stroke(boats[0]);
      flashKey(ch.toLowerCase(), 'hit');
      if (result === 'hit') sfx.good(); else sfx.line();
      if (result === 'end') {
        me.ms = Math.round(performance.now() - startedAt);
        clearTimeout(idleTimer);
      }
    }
    report();
    check();
  }

  net.race = {
    id: invite.race,
    onMessage(m) {
      if (m.type === 'leave') {
        if (them.ms === null) them.left = true;
      } else if (m.type === 'prog') {
        const before = { ...them };
        them.hits = Math.max(0, Math.min(total, Number(m.hits) || 0));
        them.misses = Math.max(0, Number(m.misses) || 0);
        if (m.ms != null) them.ms = Number(m.ms) || 0;
        place(boats[1], them.hits / total);
        if (them.hits !== before.hits) stroke(boats[1]);
        if (them.misses !== before.misses) moveRobot();
        if (me.ms !== null && m.know !== me.ms) report(); // she missed our finish: tell her again
      }
      check();
    },
  };

  setMode({
    onChar,
    expected: () => (me.ms === null ? feed.expected() : null),
    stop() {
      if (!finished) netSend('leave', { race: invite.race });
      clearInterval(repeat);
      net.last = { race: invite.race, hits: me.hits, misses: me.misses, ms: me.ms };
      net.race = null;
    },
  });
  report();
}

// be reachable for invites from anywhere in the game
if (save.me) netConnect();
