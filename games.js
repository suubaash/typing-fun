'use strict';

/* The three games: Fruit Lagoon, Surf Speedy and Rowing Race.
   None of them has a clock. They only use keys already learned in typing school. */

const WORDS = (
  'cat dog sun hat bee fox owl pig cow ant bat cup pie jam toy red big fun run hop sea ' +
  'fish frog duck bird moon star tree leaf rain snow cake milk ball kite boat wave sand palm surf swim jump play blue pink ' +
  'apple mango lemon grape peach melon berry beach shell ocean happy smile funny tiger zebra panda koala whale shark robot pizza candy cloud'
).split(' ');

// words she can type with the keys she knows
function knownWords() {
  const known = new Set(knownLetters());
  const lessonWords = LESSONS.filter(l => l.words).flatMap(l => l.words.split(' '));
  const all = [...new Set(WORDS.concat(lessonWords))];
  return all.filter(w => w.length <= 5 && [...w].every(c => known.has(c)));
}

// a few words for one game, easy ones first
function pickWords(count) {
  const pool = shuffle(knownWords());
  const short = pool.filter(w => w.length <= 3);
  const long = pool.filter(w => w.length > 3);
  return short.concat(long).slice(0, count).sort((a, b) => a.length - b.length);
}

function percent(hits, misses) {
  return hits + misses ? Math.round((hits / (hits + misses)) * 100) : 100;
}

// Shows one word at a time in lineEl, with the finger hint in hintEl.
// Mochi says each word, and helps find the key if she waits or slips twice.
function wordFeed(lineEl, hintEl, words, intro) {
  const queue = words.slice();
  let word = queue.shift();
  let pos = 0;
  let missesInRow = 0;

  const explain = () => { hintEl.textContent = helpWith(word[pos]); };

  function render() {
    lineEl.textContent = '';
    [...word].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch;
      if (i < pos) span.className = 'done';
      else if (i === pos) span.className = 'current';
      lineEl.append(span);
    });
    hintEl.innerHTML = fingerHintHtml(word[pos]);
    glowKeys([word[pos]]);
    armIdle(explain);
  }
  render();
  say(`${intro} Type ${word}.`);

  return {
    expected: () => (word ? word[pos] : null),
    // returns 'miss', 'hit', 'word' (finished a word) or 'end' (finished the last word)
    type(ch) {
      if (!word) return 'end';
      if (ch.toLowerCase() !== word[pos]) {
        shake(lineEl.querySelector('.current'));
        missesInRow++;
        if (missesInRow >= 2) explain();
        else say(`Oops! Let's find ${keyName(word[pos])}.`);
        armIdle(explain);
        return 'miss';
      }
      missesInRow = 0;
      pos++;
      if (pos < word.length) { render(); return 'hit'; }
      word = queue.shift();
      pos = 0;
      if (!word) {
        lineEl.textContent = '';
        hintEl.textContent = '';
        clearTargets();
        return 'end';
      }
      render();
      say(`Type ${word}.`);
      return 'word';
    },
  };
}

/* ---------- game 1: Fruit Lagoon (relaxing) ---------- */
const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍉', '🍍', '🥭', '🍑', '🍒', '🥝', '🍋', '🍊', '🍐', '🫐'];
const FRUIT_LANES = [3, 15, 27, 39, 51]; // % from the top
const CHEERS = ['Yummy!', 'So relaxing!', 'Great picking!', 'The coconut says thanks!', 'What a fruit salad!'];
const FRUIT_TIP = 'No rush. Find the letter on a fruit and press it on your keyboard.';

function startFruit() {
  setMode(null);
  showScreen('fruitScreen');

  const sky = $('fruitSky');
  // numbers join in once the numbers lesson is done
  const chars = knownLetters().concat(save.stars.numbers ? [...'1234567890'] : []);
  $('fruitKeys').textContent = 'Your keys: ' + chars.join(' ').toUpperCase();
  $('fruitTip').textContent = FRUIT_TIP;
  const live = new Map(); // character -> fruit element
  const still = reducedMotion();
  let count = 0;
  let cheerTimer = 0;
  $('fruitCount').textContent = 0;
  $('fruitCheer').hidden = true;

  // she has not popped anything for a while: point one fruit out
  function explain() {
    const ch = live.keys().next().value;
    if (!ch) return;
    glowKeys([...live.keys()]);
    $('fruitTip').textContent = `Can you find ${keyName(ch)}? ` + helpWith(ch);
  }

  function spawn(lane, alreadyFloating) {
    const ch = pick(chars.filter(c => !live.has(c)));
    const el = document.createElement('div');
    el.className = 'fruit';
    el.style.top = FRUIT_LANES[lane] + '%';
    if (still) {
      el.style.left = 6 + lane * 18 + Math.random() * 6 + '%';
    } else {
      const seconds = 70 + Math.random() * 25; // a slow, sleepy drift
      el.style.animationDuration = seconds + 's';
      // start part-way across so she never waits for a fruit to float in
      if (alreadyFloating) el.style.animationDelay = -(0.15 + Math.random() * 0.6) * seconds + 's';
    }
    el.innerHTML = `<span class="fruit-bob"><span class="fruit-emoji">${pick(FRUITS)}</span><b>${ch.toUpperCase()}</b></span>`;
    // drifted off the far side without being picked: send a new one
    el.addEventListener('animationend', e => {
      if (e.target !== el || live.get(ch) !== el) return;
      live.delete(ch);
      el.remove();
      spawn(lane);
    });
    live.set(ch, el);
    el.dataset.lane = lane;
    sky.append(el);
    glowKeys([...live.keys()]);
  }

  function onChar(ch) {
    const key = ch.toLowerCase();
    const el = live.get(key);
    if (!el) return; // nothing bad happens in the relaxing game
    live.delete(key);
    el.style.animationPlayState = 'paused';
    el.classList.add('pop');
    setTimeout(() => el.remove(), 400);
    flashKey(key, 'hit');
    sfx.bell();
    count++;
    $('fruitCount').textContent = count;
    $('fruitTip').textContent = FRUIT_TIP;
    if (count % 10 === 0) {
      const cheer = $('fruitCheer');
      cheer.textContent = `${count} fruits! ${pick(CHEERS)}`;
      cheer.hidden = false;
      say(cheer.textContent);
      sfx.line();
      clearTimeout(cheerTimer);
      cheerTimer = setTimeout(() => { cheer.hidden = true; }, 2500);
    } else {
      say(keyName(key));
    }
    spawn(Number(el.dataset.lane), true);
    armIdle(explain, 9000);
  }

  sky.textContent = '';
  setMode({
    onChar,
    expected: () => [...live.keys()],
    stop() {
      clearTimeout(cheerTimer);
      live.clear();
      sky.textContent = '';
    },
  });
  FRUIT_LANES.forEach((_, lane) => spawn(lane, true));
  say('Welcome to Fruit Lagoon. No rush. Find the letter on a fruit and press it.');
  armIdle(explain, 9000);
}

/* ---------- game 2: Surf Speedy ---------- */
// No clock: the wave grows with every right key and only shrinks on a wrong key.
const SURF_WORDS = 8;
const ZONE_TEXT = ['😬 Uh-oh! Slow down and look.', '🙂 Doing okay!', '🤩 Doing great!'];

function startSurf() {
  setMode(null);
  showScreen('surfScreen');

  const list = pickWords(SURF_WORDS);
  const feed = wordFeed($('surfWord'), $('surfNext'), list, 'Surf time! Every right key makes the wave grow. Take your time.');
  const scene = $('surfScene');
  const zones = $('surfMeter').querySelectorAll('.zone');
  let energy = 50; // 0 to 100: how big the wave is
  let words = 0;
  let hits = 0;
  let misses = 0;

  const zone = () => (energy < 33 ? 0 : energy < 66 ? 1 : 2);

  function paint() {
    const z = zone();
    scene.style.setProperty('--h', 8 + energy * 0.72 + 'px');
    scene.dataset.zone = z;
    zones.forEach((el, i) => el.classList.toggle('on', i === z));
    $('surfMarker').style.left = Math.min(97, Math.max(3, energy)) + '%';
    $('surfZone').textContent = hits + misses ? ZONE_TEXT[z] : 'Type the word to catch a wave!';
    $('surfWords').textContent = `${words} / ${list.length}`;
  }

  function finish() {
    const acc = percent(hits, misses);
    const stars = acc >= 90 ? 3 : acc >= 75 ? 2 : 1;
    showResult({
      stars,
      title: ['', 'You rode the wave!', 'Nice surfing!', 'Surf champion!'][stars],
      msg: [
        '',
        'You finished every word. Next time, look for the glowing key first.',
        'You finished every word. Careful fingers make the wave even bigger.',
        'You finished every word with careful fingers!',
      ][stars],
      stats: [[words, 'words'], [acc + '%', 'correct']],
      again: startSurf,
      next: showHome,
      nextLabel: 'Home',
      confetti: stars >= 2,
    });
  }

  function onChar(ch) {
    const result = feed.type(ch);
    if (result === 'miss') {
      misses++;
      energy = Math.max(0, energy - 12);
      sfx.bad();
      flashKey(ch, 'miss');
    } else {
      hits++;
      energy = Math.min(100, energy + 7);
      flashKey(ch.toLowerCase(), 'hit');
      if (result === 'hit') sfx.good(); else { words++; sfx.line(); }
    }
    paint();
    if (result === 'end') finish();
  }

  paint();
  setMode({ onChar, expected: feed.expected });
}

/* ---------- game 3: Rowing Race ---------- */
// No clock here either. Against the robot, the robot only rows when she presses a wrong key.
// Friends take turns, and the one with fewer wrong keys wins.
const ROBOT_ROWER = { who: '🤖', color: '#9fb4c7', deco: 'dots' };
const RACE_WORDS = 5;
const ROBOT_STEPS = 6; // wrong keys it takes for the robot to finish

function openRowSetup() {
  setMode(null);
  showScreen('rowSetupScreen');
  const friend = save.rowVs === 'friend';
  const online = save.rowVs === 'online';
  const choices = [['robot', '🤖 The robot'], ['friend', '👫 A friend here'], ['online', '🌏 My cousin online']];
  chipRow($('rowVs'), choices, save.rowVs, value => {
    save.rowVs = value;
    persist();
    openRowSetup();
  });
  $('rowRule').textContent = online
    ? 'Race your cousin from far away, or team up to beat the robot!'
    : friend
      ? 'Take turns on the keyboard. No clock! Whoever presses fewer wrong keys wins.'
      : 'No clock! The robot only rows when you press a wrong key, so take your time.';
  $('rowStart').hidden = online;
  $('onlinePanel').hidden = !online;
  if (online) renderOnlinePanel();

  const box = $('rowDesigners');
  box.textContent = '';
  box.append(designerPanel(0, friend ? 'Player 1' : 'Your boat'));
  if (friend) box.append(designerPanel(1, 'Player 2'));
  if (!online) say(`Pick who is rowing and design your boat. ${$('rowRule').textContent}`);
}

// pick a rower and design their boat
function designerPanel(index, label) {
  const rower = save.rowers[index];
  let tab = Object.keys(RIDERS).find(t => RIDERS[t].includes(rower.who)) || 'Fruits';
  const panel = document.createElement('div');
  panel.className = 'panel designer';

  const pressed = (key, value) => `data-k="${key}" data-v="${value}" aria-pressed="${rower[key] === value}"`;
  function draw() {
    panel.innerHTML =
      `<h3>${label}</h3>` +
      `<div class="boat-preview">${boatSVG(rower)}</div>` +
      `<div class="opt-row"><span class="opt-label">Who is rowing?</span><div class="chips">` +
        Object.keys(RIDERS).map(t => `<button type="button" class="chip-btn" data-k="tab" data-v="${t}" aria-pressed="${t === tab}">${t}</button>`).join('') +
      `</div></div>` +
      `<div class="emoji-grid">` +
        RIDERS[tab].map(e => `<button type="button" class="emoji-btn" ${pressed('who', e)}>${e}</button>`).join('') +
      `</div>` +
      `<div class="opt-row"><span class="opt-label">Boat colour</span><div class="chips">` +
        BOAT_COLORS.map(c => `<button type="button" class="swatch" style="background:${c}" aria-label="Colour ${c}" ${pressed('color', c)}></button>`).join('') +
      `</div></div>` +
      `<div class="opt-row"><span class="opt-label">Boat pattern</span><div class="chips">` +
        Object.entries(BOAT_DECOS).map(([id, name]) => `<button type="button" class="chip-btn" ${pressed('deco', id)}>${name}</button>`).join('') +
      `</div></div>`;
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    if (b.dataset.k === 'tab') tab = b.dataset.v;
    else { rower[b.dataset.k] = b.dataset.v; persist(); netHello(); }
    draw();
  });
  draw();
  return panel;
}

function startMatch() {
  const words = pickWords(RACE_WORDS);
  const common = { again: startMatch, againLabel: 'Race again', next: openRowSetup, nextLabel: 'Change boats' };

  if (save.rowVs !== 'friend') {
    runRace({
      words, typist: 0, robot: true,
      rowers: [save.rowers[0], ROBOT_ROWER],
      names: ['You', 'Robot'],
      intro: 'Row, row, row! The robot only moves when you press a wrong key.',
      done(misses, robotWon) {
        showResult({
          ...common,
          stars: robotWon ? 1 : misses <= 1 ? 3 : 2,
          title: robotWon ? 'You finished the race!' : 'You won the race!',
          msg: robotWon
            ? 'The robot got there first this time. Look for the glowing key before you press.'
            : 'Your careful fingers beat the robot!',
          stats: [[words.length, 'words'], [misses, 'wrong keys']],
          confetti: !robotWon,
        });
      },
    });
    return;
  }

  runRace({
    words, typist: 0,
    rowers: save.rowers,
    names: ['Player 1', 'Player 2 (next)'],
    intro: 'Player 1, it is your turn.',
    done(misses1) {
      showResult({
        stars: null,
        title: 'Player 1 is done!',
        msg: 'Player 2, put your hands on the keyboard.',
        stats: [[misses1, 'Player 1 wrong keys']],
        nextLabel: 'Player 2, go!',
        next: () => runRace({
          words, typist: 1, rivalDone: true,
          rowers: save.rowers,
          names: ['Player 1', 'Player 2'],
          intro: 'Player 2, it is your turn.',
          done(misses2) {
            showResult({
              ...common,
              stars: null,
              title: misses1 === misses2 ? 'It is a tie!' : (misses1 < misses2 ? 'Player 1' : 'Player 2') + ' wins!',
              msg: 'What a race! Shake hands and race again.',
              stats: [[misses1, 'Player 1 wrong keys'], [misses2, 'Player 2 wrong keys']],
              confetti: true,
            });
          },
        }),
      });
    },
  });
}

// o: { words, typist (0 or 1), rowers, names, intro, robot, rivalDone, done(misses, robotWon) }
function runRace(o) {
  setMode(null);
  showScreen('raceScreen');
  const total = o.words.reduce((n, w) => n + w.length, 0);
  const rival = 1 - o.typist;

  const lanes = $('raceLanes');
  lanes.textContent = '';
  lanes.parentElement.classList.remove('three');
  const boats = [0, 1].map(i => {
    const lane = document.createElement('div');
    lane.className = 'lane' + (i === o.typist ? ' me' : '');
    const name = document.createElement('span');
    name.className = 'lane-name';
    name.textContent = o.names[i];
    const boat = document.createElement('div');
    boat.className = 'boat-wrap';
    boat.innerHTML = boatSVG(o.rowers[i]);
    lane.append(name, boat);
    lanes.append(lane);
    return boat;
  });
  $('raceTitle').textContent = `🚣 ${o.names[o.typist]}: type to row!`;
  $('raceOops').textContent = 0;

  const place = (boat, progress) => boat.style.setProperty('--p', Math.min(1, progress));
  const stroke = boat => {
    boat.classList.remove('stroke');
    void boat.offsetWidth; // restart the oar swing
    boat.classList.add('stroke');
  };
  if (o.rivalDone) place(boats[rival], 1);

  const feed = wordFeed($('raceWord'), $('raceNext'), o.words, o.intro);
  let hits = 0;
  let misses = 0;
  let robotWon = false;

  function onChar(ch) {
    const result = feed.type(ch);
    if (result === 'miss') {
      misses++;
      $('raceOops').textContent = misses;
      sfx.bad();
      flashKey(ch, 'miss');
      if (o.robot) {
        place(boats[rival], misses / ROBOT_STEPS);
        stroke(boats[rival]);
        if (misses >= ROBOT_STEPS) robotWon = true;
      }
      return;
    }
    hits++;
    place(boats[o.typist], hits / total);
    stroke(boats[o.typist]);
    flashKey(ch.toLowerCase(), 'hit');
    if (result === 'hit') sfx.good(); else sfx.line();
    if (result === 'end') o.done(misses, robotWon);
  }

  setMode({ onChar, expected: feed.expected });
}

$('gameFruit').addEventListener('click', startFruit);
$('gameSurf').addEventListener('click', startSurf);
$('gameRow').addEventListener('click', openRowSetup);
$('rowStart').addEventListener('click', startMatch);
