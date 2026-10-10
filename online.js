'use strict';

/* Playing with a cousin who is far away: rowing together, and seeing and talking to each other.

   The two browsers find each other through a free public message relay (MQTT over WebSocket).
   Every message is locked with the family's secret code, which is typed in on each device and is
   never part of this code, so only people who know the code can join, invite or call.
   Video and sound go straight from one browser to the other (WebRTC), not through the relay. */

const PLAYERS = ['Shivalika', 'Vedisha'];
const NET_URL = 'wss://broker.emqx.io:8084/mqtt';
const TEAM_ROBOT_STEPS = 8; // wrong keys (from both cousins) it takes for the robot to finish
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];

const net = {
  sid: Math.random().toString(36).slice(2), // this browser tab
  client: null,
  starting: false,
  up: false,
  topic: '',
  key: null,      // locks and unlocks messages
  peer: null,     // { sid, name, rower, letters, seen }
  pending: null,  // a race invite we sent and are waiting on: { race, mode, words }
  incoming: null, // an invite or a call we received
  race: null,     // the online race being played: { id, onMessage }
  last: null,     // how our last race ended, in case the cousin missed it
  call: null,     // the video call: { id, local, pc, caller, ice, timer }
  note: '',       // a line to show in the online panel
};

const peerOnline = () => !!net.peer && Date.now() - net.peer.seen < 12000;
const cousinName = () => (net.peer && net.peer.name) || PLAYERS.find(p => p !== save.me) || 'your cousin';
const onSetup = () => !$('rowSetupScreen').hidden && save.rowVs === 'online';

/* ---------- the family code: a private channel and a lock ---------- */
async function familyKeys(code) {
  const enc = new TextEncoder();
  const secret = await crypto.subtle.importKey('raw', enc.encode(code.trim().toLowerCase()), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode('typing-fun-family-v1'), iterations: 200000, hash: 'SHA-256' }, secret, 512));
  const hex = [...bits.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
  const key = await crypto.subtle.importKey('raw', bits.slice(32, 64), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { topic: 'typingfun/' + hex, key };
}

async function lock(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, net.key, new TextEncoder().encode(text)));
  const all = new Uint8Array(iv.length + body.length);
  all.set(iv);
  all.set(body, iv.length);
  let s = '';
  for (const b of all) s += String.fromCharCode(b);
  return btoa(s);
}

async function unlock(packed) {
  const all = Uint8Array.from(atob(packed), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, net.key, all.slice(12));
  return new TextDecoder().decode(plain);
}

/* ---------- sending and receiving ---------- */
let outbox = Promise.resolve(); // keeps messages in order
let inbox = Promise.resolve();

function netSend(type, data) {
  if (!net.up) return;
  const text = JSON.stringify({ sid: net.sid, from: save.me, type, ...data });
  outbox = outbox.then(() => lock(text)).then(packed => {
    if (net.up) net.client.publish(net.topic, packed);
  }).catch(() => {});
}

// tell the cousin we are here, what our boat looks like and which letters we know
function netHello() {
  netSend('hello', { rower: save.rowers[0], letters: knownLetters().join('') });
}

async function netConnect() {
  if (net.client || net.starting || !save.me || !save.family) return;
  if (typeof mqtt === 'undefined' || !window.crypto || !crypto.subtle) {
    net.note = 'Online play needs the internet. Check the connection and open the game again.';
    return;
  }
  net.starting = true;
  Object.assign(net, await familyKeys(save.family));
  net.client = mqtt.connect(NET_URL, { clientId: 'tf-' + net.sid, keepalive: 30, reconnectPeriod: 4000 });
  net.client.on('connect', () => {
    net.up = true;
    net.client.subscribe(net.topic);
    netHello();
    refreshOnline();
  });
  net.client.on('close', () => { net.up = false; refreshOnline(); });
  net.client.on('error', () => { /* it keeps retrying by itself */ });
  net.client.on('message', (topic, payload) => {
    const packed = payload.toString();
    inbox = inbox.then(async () => {
      const m = JSON.parse(await unlock(packed)); // fails for anyone without the family code
      if (m && m.sid && m.sid !== net.sid) await onNetMessage(m);
    }).catch(() => {});
  });

  setInterval(netHello, 4000);
  // notice when the cousin goes away
  let wasOnline = false;
  setInterval(() => {
    const now = peerOnline();
    if (now !== wasOnline) { wasOnline = now; refreshOnline(); }
    if (!now && net.race) net.race.onMessage({ type: 'leave', race: net.race.id });
    if (!now && net.call) endCall(`${cousinName()} went offline.`, false);
  }, 2000);
  window.addEventListener('pagehide', () => {
    if (net.call) netSend('hangup', { call: net.call.id });
    netSend('bye', {});
  });
}

// Even with the lock, tidy up what arrives before showing it.
function cleanRower(r) {
  const ok = r && Object.values(RIDERS).some(list => list.includes(r.who)) &&
    BOAT_COLORS.includes(r.color) && r.deco in BOAT_DECOS;
  return ok ? { who: r.who, color: r.color, deco: r.deco } : null;
}
const cleanName = s => String(s || '').replace(/[^\p{L} ]/gu, '').trim().slice(0, 20) || 'Cousin';
const cleanWords = w => (Array.isArray(w) ? w : []).filter(x => /^[a-z]{1,8}$/.test(x)).slice(0, 10);

async function onNetMessage(m) {
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
    if (net.call) endCall(`${cousinName()} left.`, false);
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
  } else if (['call', 'callok', 'callno', 'sdp', 'ice', 'hangup'].includes(m.type)) {
    await onCallMessage(m);
  } else if (net.race && m.race === net.race.id) {
    net.race.onMessage(m);
  } else if (m.type === 'prog' && net.last && m.race === net.last.race && net.last.ms !== null && m.know !== net.last.ms) {
    // our race is over but hers is still waiting for our finish
    netSend('prog', { ...net.last, know: m.ms });
  }
}

/* ---------- inviting to a race ---------- */
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

// the yellow banner: a race invite { race, mode, words } or a call { call }
function showInvite(m) {
  net.incoming = m;
  const what = m.call ? 'wants to see and talk to you!'
    : m.mode === 'team' ? 'wants to team up against the robot!' : 'wants to race you!';
  $('inviteText').textContent = `${m.call ? '📹' : '🚣'} ${cousinName()} ${what}`;
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
  if (m.call) return answerCall(m.call);
  netSend('accept', { race: m.race });
  runOnlineRace({ race: m.race, mode: m.mode, words: m.words });
});
$('inviteNo').addEventListener('click', () => {
  const m = net.incoming;
  hideInvite();
  if (!m) return;
  if (m.call) netSend('callno', { call: m.call });
  else netSend('decline', { race: m.race });
});

/* ---------- the online part of the rowing setup screen ---------- */
function refreshOnline() {
  $('callBtn').hidden = !(peerOnline() && !net.call);
  $('callBtn').setAttribute('aria-label', `See and talk to ${cousinName()}`);
  if (onSetup()) renderOnlinePanel();
}

function renderOnlinePanel() {
  const panel = $('onlinePanel');
  if (!save.me) {
    panel.innerHTML = `<p class="who">Who are you?</p><div class="chips">` +
      PLAYERS.map(p => `<button type="button" class="pill-btn big" data-me="${p}">${p}</button>`).join('') + `</div>`;
    return;
  }
  if (!save.family) {
    panel.innerHTML =
      `<p class="who">Hi ${save.me}! Ask a grown-up to type the family code.</p>` +
      `<form id="familyForm" class="family-form">` +
        `<input id="familyInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" minlength="8" required placeholder="our family secret code" aria-label="Family secret code">` +
        `<button type="submit" class="pill-btn primary">Save</button>` +
      `</form>` +
      `<p class="small">Grown-ups: make up a secret phrase of 8 or more letters and type the very same one on both cousins' devices. Only devices with this code can find, invite or call each other. Keep it private.</p>`;
    return;
  }
  netConnect();
  const cousin = cousinName();
  const online = peerOnline();
  const off = online ? '' : 'disabled';
  const status = !net.client ? (net.note || 'Connecting…')
    : !net.up ? 'Connecting…'
    : online ? `🟢 ${cousin} is here!`
    : `${cousin} is not here yet. Ask her to open the game and tap Rowing Race.`;
  const actions = net.pending
    ? `<p class="status">Waiting for ${cousin} to say yes…</p><button type="button" class="pill-btn" data-act="cancel">Cancel</button>`
    : `<div class="chips">
        <button type="button" class="pill-btn primary" data-act="versus" ${off}>🏁 Race ${cousin}</button>
        <button type="button" class="pill-btn primary" data-act="team" ${off}>🤖 Team up against the robot</button>
        <button type="button" class="pill-btn" data-act="call" ${online && !net.call ? '' : 'disabled'}>📹 See and talk to ${cousin}</button>
      </div>`;
  panel.innerHTML =
    `<p class="who">You are ${save.me}</p>` +
    `<p class="status ${online ? 'on' : ''}">${status}</p>` + actions +
    (net.note && net.client && !net.pending ? `<p class="small">${net.note}</p>` : '') +
    `<p class="small"><button type="button" class="link-btn" data-act="switch">Not ${save.me}? Switch player</button>` +
    `<button type="button" class="link-btn" data-act="recode">Change family code</button></p>`;
}

$('onlinePanel').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('familyInput').value.trim();
  if (code.length < 8) return;
  save.family = code;
  persist();
  renderOnlinePanel();
});

$('onlinePanel').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.type === 'submit') return;
  if (b.dataset.me) {
    save.me = b.dataset.me;
    persist();
    say(`Aloha, ${save.me}!`);
    netHello();
  } else if (b.dataset.act === 'switch' || b.dataset.act === 'recode') {
    // a new name or code needs a fresh start
    if (b.dataset.act === 'switch') save.me = ''; else save.family = '';
    persist();
    if (net.client) return location.reload();
  } else if (b.dataset.act === 'cancel') {
    netSend('cancel', { race: net.pending.race });
    net.pending = null;
  } else if (b.dataset.act === 'call') {
    startCall();
  } else if (peerOnline()) {
    sendInvite(b.dataset.act);
  }
  renderOnlinePanel();
});

/* ---------- seeing and talking: the video call ---------- */
function callStatus(text) {
  $('callStatus').textContent = text;
  $('callStatus').hidden = !text;
}

// camera and microphone; just the microphone if there is no camera
async function getMedia() {
  if (!navigator.mediaDevices) return null;
  const small = { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } };
  for (const want of [{ video: small, audio: true }, { audio: true }]) {
    try { return await navigator.mediaDevices.getUserMedia(want); } catch (e) { /* try the next one */ }
  }
  return null;
}

function noMedia() {
  net.note = 'I could not use the camera or microphone. Ask a grown-up to allow them for this page.';
  say(net.note);
  refreshOnline();
}

function openCallBox(call, status) {
  net.call = call;
  $('localVideo').srcObject = call.local;
  $('remoteVideo').srcObject = null;
  $('callBox').hidden = false;
  for (const [id, kind] of [['callMic', 'Audio'], ['callCam', 'Video']]) {
    const has = call.local[`get${kind}Tracks`]().length > 0;
    $(id).hidden = !has;
    $(id).setAttribute('aria-pressed', 'true');
    $(id).classList.remove('off');
  }
  callStatus(status);
  refreshOnline();
}

async function startCall() {
  if (net.call || !peerOnline()) return;
  const local = await getMedia();
  if (!local) return noMedia();
  const id = net.sid + Date.now().toString(36);
  openCallBox({ id, local, pc: null, caller: true, ice: [] }, `Calling ${cousinName()}…`);
  net.call.timer = setTimeout(() => endCall(`${cousinName()} did not answer. Try again later.`), 45000);
  netSend('call', { call: id });
  say(`Calling ${cousinName()}.`);
}

async function answerCall(id) {
  const local = await getMedia();
  if (!local) {
    netSend('callno', { call: id });
    return noMedia();
  }
  openCallBox({ id, local, pc: null, caller: false, ice: [] }, 'Connecting…');
  netSend('callok', { call: id });
}

function makePeer() {
  const call = net.call;
  const pc = call.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  call.local.getTracks().forEach(t => pc.addTrack(t, call.local));
  pc.onicecandidate = e => { if (e.candidate) netSend('ice', { call: call.id, cand: e.candidate }); };
  pc.ontrack = e => { $('remoteVideo').srcObject = e.streams[0]; };
  pc.onconnectionstatechange = () => {
    if (net.call !== call) return;
    if (pc.connectionState === 'connected') callStatus('');
    else if (pc.connectionState === 'disconnected') callStatus('Reconnecting…');
    else if (pc.connectionState === 'failed') endCall('The video could not connect. Play together without it, or try another Wi-Fi.');
  };
  return pc;
}

async function onCallMessage(m) {
  if (m.type === 'call') {
    if (net.call) return netSend('callno', { call: m.call, busy: true });
    return showInvite({ call: String(m.call) });
  }
  if (m.type === 'hangup' && net.incoming && net.incoming.call === m.call) return hideInvite();
  const call = net.call;
  if (!call || m.call !== call.id) return;

  if (m.type === 'callno') {
    endCall(`${cousinName()} can't talk right now.`, false);
  } else if (m.type === 'hangup') {
    endCall(`${cousinName()} said bye!`, false);
  } else if (m.type === 'callok' && call.caller && !call.pc) {
    clearTimeout(call.timer);
    callStatus('Connecting…');
    const pc = makePeer();
    await pc.setLocalDescription(await pc.createOffer());
    netSend('sdp', { call: call.id, sdp: pc.localDescription });
  } else if (m.type === 'sdp') {
    const pc = call.pc || makePeer();
    await pc.setRemoteDescription(m.sdp);
    for (const cand of call.ice.splice(0)) await pc.addIceCandidate(cand).catch(() => {});
    if (m.sdp.type === 'offer') {
      await pc.setLocalDescription(await pc.createAnswer());
      netSend('sdp', { call: call.id, sdp: pc.localDescription });
    }
  } else if (m.type === 'ice') {
    if (call.pc && call.pc.remoteDescription) await call.pc.addIceCandidate(m.cand).catch(() => {});
    else call.ice.push(m.cand);
  }
}

function endCall(note, tell = true) {
  const call = net.call;
  if (!call) return;
  net.call = null;
  clearTimeout(call.timer);
  if (tell) netSend('hangup', { call: call.id });
  call.local.getTracks().forEach(t => t.stop());
  if (call.pc) call.pc.close();
  $('remoteVideo').srcObject = null;
  $('localVideo').srcObject = null;
  $('callBox').hidden = true;
  if (note) { net.note = note; say(note); }
  refreshOnline();
}

function toggleTracks(button, kind) {
  if (!net.call) return;
  const on = button.getAttribute('aria-pressed') !== 'true';
  net.call.local[`get${kind}Tracks`]().forEach(t => { t.enabled = on; });
  button.setAttribute('aria-pressed', on);
  button.classList.toggle('off', !on);
  button.blur();
}
$('callMic').addEventListener('click', e => toggleTracks(e.currentTarget, 'Audio'));
$('callCam').addEventListener('click', e => toggleTracks(e.currentTarget, 'Video'));
$('callEnd').addEventListener('click', () => endCall(''));
$('callBtn').addEventListener('click', e => { e.currentTarget.blur(); startCall(); });

// the call window can be dragged out of the way
(() => {
  const box = $('callBox');
  let grab = null;
  box.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const r = box.getBoundingClientRect();
    grab = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', e => {
    if (!grab) return;
    const x = Math.max(0, Math.min(window.innerWidth - box.offsetWidth, e.clientX - grab.dx));
    const y = Math.max(0, Math.min(window.innerHeight - box.offsetHeight, e.clientY - grab.dy));
    Object.assign(box.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
  });
  const drop = () => { grab = null; };
  box.addEventListener('pointerup', drop);
  box.addEventListener('pointercancel', drop);
})();

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

// be reachable for invites and calls from anywhere in the game
netConnect();
