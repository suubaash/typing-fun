'use strict';

/* The three games: Fruit Lagoon, Surf Speedy and Rowing Race. */

const WORDS = (
  'cat dog sun hat bee fox owl pig cow ant bat cup pie jam toy red big fun run hop sea ' +
  'fish frog duck bird moon star tree leaf rain snow cake milk ball kite boat wave sand palm surf swim jump play blue pink ' +
  'apple mango lemon grape peach melon berry beach shell ocean happy smile funny tiger zebra panda koala whale shark robot pizza candy cloud ' +
  'banana orange cherry papaya monkey turtle parrot rabbit kitten puppy island summer flower sunset paddle rocket dragon ' +
  'coconut dolphin rainbow unicorn pineapple seashell surfboard starfish butterfly adventure treasure dinosaur chocolate'
).split(' ');

function wordsByLength(min, max) {
  return WORDS.filter(w => w.length >= min && w.length <= max);
}

function percent(hits, misses) {
  return hits + misses ? Math.round((hits / (hits + misses)) * 100) : 100;
}

// Shows one word at a time in lineEl. nextWord() returns the following word, or nothing when there are no more.
function wordFeed(lineEl, nextEl, nextWord) {
  let word = nextWord();
  let upcoming = nextWord();
  let pos = 0;

  function render() {
    lineEl.textContent = '';
    [...word].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch;
      if (i < pos) span.className = 'done';
      else if (i === pos) span.className = 'current';
      lineEl.append(span);
    });
    nextEl.textContent = upcoming ? 'Next: ' + upcoming : '';
    glowKeys([word[pos]]);
  }
  render();

  return {
    expected: () => (word ? word[pos] : null),
    // returns 'miss', 'hit', 'word' (finished a word) or 'end' (finished the last word)
    type(ch) {
      if (!word) return 'end';
      if (ch.toLowerCase() !== word[pos]) {
        shake(lineEl.querySelector('.current'));
        return 'miss';
      }
      pos++;
      if (pos < word.length) { render(); return 'hit'; }
      word = upcoming;
      upcoming = word ? nextWord() : null;
      pos = 0;
      if (!word) {
        lineEl.textContent = '';
        nextEl.textContent = '';
        clearTargets();
        return 'end';
      }
      render();
      return 'word';
    },
  };
}

/* ---------- game 1: Fruit Lagoon (relaxing) ---------- */
const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍉', '🍍', '🥭', '🍑', '🍒', '🥝', '🍋', '🍊', '🍐', '🫐'];
const FRUIT_MODES = [['letters', 'ABC'], ['numbers', '123'], ['both', 'ABC + 123']];
const FRUIT_LANES = [3, 15, 27, 39, 51]; // % from the top
const CHEERS = ['Yummy!', 'So relaxing!', 'Great picking!', 'The coconut says thanks!', 'What a fruit salad!'];

function startFruit() {
  setMode(null);
  showScreen('fruitScreen');
  chipRow($('fruitModes'), FRUIT_MODES, save.fruitMode, value => {
    save.fruitMode = value;
    persist();
    startFruit();
  });

  const sky = $('fruitSky');
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const chars = save.fruitMode === 'letters' ? letters : save.fruitMode === 'numbers' ? digits : letters + digits;
  const live = new Map(); // character -> fruit element
  const still = reducedMotion();
  let count = 0;
  let cheerTimer = 0;
  $('fruitCount').textContent = 0;
  $('fruitCheer').hidden = true;

  function spawn(lane, alreadyFloating) {
    const ch = pick([...chars].filter(c => !live.has(c)));
    const el = document.createElement('div');
    el.className = 'fruit';
    el.style.top = FRUIT_LANES[lane] + '%';
    if (still) {
      el.style.left = 6 + lane * 18 + Math.random() * 6 + '%';
    } else {
      const seconds = 24 + Math.random() * 14;
      el.style.animationDuration = seconds + 's';
      // start part-way across so the sky isn't empty at the beginning
      if (alreadyFloating) el.style.animationDelay = -(0.1 + Math.random() * 0.7) * seconds + 's';
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
    if (count % 10 === 0) {
      const cheer = $('fruitCheer');
      cheer.textContent = `${count} fruits! ${pick(CHEERS)}`;
      cheer.hidden = false;
      sfx.line();
      clearTimeout(cheerTimer);
      cheerTimer = setTimeout(() => { cheer.hidden = true; }, 2500);
    }
    spawn(Number(el.dataset.lane));
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
}

/* ---------- game 2: Surf Speedy (fast) ---------- */
const SURF_SECONDS = 60;
// gain: how much wave one letter gives. Bigger waves need faster typing to stay in the great zone.
const SURF_LEVELS = {
  small: { name: '🌊 Small waves', len: [3, 4], gain: 20 },
  big: { name: '🌊🌊 Big waves', len: [4, 6], gain: 11 },
  giant: { name: '🌊🌊🌊 Giant waves', len: [5, 9], gain: 6.6 },
};
const ZONE_TEXT = ['😬 Uh-oh! Type faster!', '🙂 Doing okay!', '🤩 Doing great!'];

function startSurf() {
  setMode(null);
  showScreen('surfScreen');
  chipRow($('surfLevels'), Object.entries(SURF_LEVELS).map(([id, l]) => [id, l.name]), save.surfLevel, value => {
    save.surfLevel = value;
    persist();
    startSurf();
  });

  const level = SURF_LEVELS[save.surfLevel];
  const pool = wordsByLength(...level.len);
  let lastWord = '';
  const feed = wordFeed($('surfWord'), $('surfNext'), () => {
    let w;
    do { w = pick(pool); } while (w === lastWord);
    lastWord = w;
    return w;
  });

  const scene = $('surfScene');
  const zones = $('surfMeter').querySelectorAll('.zone');
  const zoneTime = [0, 0, 0];
  let energy = 50; // 0 to 100: how well the surfer is doing
  let startedAt = 0;
  let last = 0;
  let raf = 0;
  let words = 0;
  let hits = 0;
  let misses = 0;

  const zone = () => (energy < 33 ? 0 : energy < 66 ? 1 : 2);

  function paint(secondsLeft) {
    const z = zone();
    scene.style.setProperty('--h', 8 + energy * 0.72 + 'px');
    scene.dataset.zone = z;
    zones.forEach((el, i) => el.classList.toggle('on', i === z));
    $('surfMarker').style.left = Math.min(97, Math.max(3, energy)) + '%';
    $('surfZone').textContent = startedAt ? ZONE_TEXT[z] : 'Type the word to catch a wave!';
    $('surfTime').textContent = Math.ceil(secondsLeft);
    $('surfWords').textContent = words;
  }

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    energy *= Math.exp(-0.25 * dt); // the wave slowly shrinks unless you keep typing
    zoneTime[zone()] += dt;
    const left = SURF_SECONDS - (now - startedAt) / 1000;
    paint(Math.max(0, left));
    if (left <= 0) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    const all = zoneTime[0] + zoneTime[1] + zoneTime[2] || 1;
    const stars = zoneTime[2] / all >= 0.5 ? 3 : (zoneTime[1] + zoneTime[2]) / all >= 0.5 ? 2 : 1;
    const bestKey = 'surf-' + save.surfLevel;
    const oldBest = save.best[bestKey] || 0;
    save.best[bestKey] = Math.max(oldBest, words);
    persist();
    showResult({
      stars,
      title: ['', 'Good try, surfer!', 'Nice surfing!', 'Surf champion!'][stars],
      msg: words > oldBest && oldBest > 0
        ? `New best! Your old best was ${oldBest} words.`
        : ['', 'Keep your fingers moving to make the wave grow.', 'You stayed on the wave. Can you make it bigger?', 'You rode the biggest wave the whole way!'][stars],
      stats: [[words, 'words'], [percent(hits, misses) + '%', 'correct']],
      again: startSurf,
      next: showHome,
      nextLabel: 'Home',
      confetti: stars >= 2,
    });
  }

  function onChar(ch) {
    if (!startedAt) {
      startedAt = last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    const result = feed.type(ch);
    if (result === 'miss') {
      misses++;
      energy = Math.max(0, energy - 5);
      sfx.bad();
      flashKey(ch, 'miss');
      return;
    }
    hits++;
    energy = Math.min(100, energy + level.gain);
    flashKey(ch.toLowerCase(), 'hit');
    if (result === 'word') { words++; sfx.line(); } else { sfx.good(); }
  }

  paint(SURF_SECONDS);
  setMode({ onChar, expected: feed.expected, stop: () => cancelAnimationFrame(raf) });
}

/* ---------- game 3: Rowing Race ---------- */
const ROW_LEVELS = {
  slow: { name: '🐢 Slow', cps: 0.6, len: [3, 4] },
  medium: { name: '🐇 Medium', cps: 1.2, len: [3, 5] },
  fast: { name: '🚀 Fast', cps: 2.2, len: [4, 7] },
};
const ROBOT_ROWER = { who: '🤖', color: '#9fb4c7', deco: 'dots' };
const RACE_WORDS = 10;

function openRowSetup() {
  setMode(null);
  showScreen('rowSetupScreen');
  const friend = save.rowVs === 'friend';
  const again = (key) => value => { save[key] = value; persist(); openRowSetup(); };
  chipRow($('rowVs'), [['robot', '🤖 The robot'], ['friend', '👫 A friend']], save.rowVs, again('rowVs'));
  chipRow($('rowLevel'), Object.entries(ROW_LEVELS).map(([id, l]) => [id, l.name]), save.rowLevel, again('rowLevel'));
  $('rowLevelRow').hidden = friend;

  const box = $('rowDesigners');
  box.textContent = '';
  box.append(designerPanel(0, friend ? 'Player 1' : 'Your boat'));
  if (friend) box.append(designerPanel(1, 'Player 2'));
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
    else { rower[b.dataset.k] = b.dataset.v; persist(); }
    draw();
  });
  draw();
  return panel;
}

const seconds = t => t.toFixed(1);

function startMatch() {
  const friend = save.rowVs === 'friend';
  const level = ROW_LEVELS[save.rowLevel];
  const words = shuffle(wordsByLength(...(friend ? [3, 5] : level.len))).slice(0, RACE_WORDS);
  const letters = words.reduce((n, w) => n + w.length, 0);
  const common = { words, again: startMatch, againLabel: 'Race again', next: openRowSetup, nextLabel: 'Change boats' };

  if (!friend) {
    const robotTime = letters / level.cps;
    runRace({
      words, typist: 0,
      rowers: [save.rowers[0], ROBOT_ROWER],
      names: ['You', 'Robot'],
      rivalLetters: t => level.cps * t,
      done(time) {
        const won = time < robotTime;
        showResult({
          ...common,
          stars: won ? 3 : time < robotTime * 1.3 ? 2 : 1,
          title: won ? 'You won the race!' : 'The robot won this time',
          msg: won ? 'You rowed faster than the robot. Try a faster robot next!' : 'So close! Keep rowing and you will catch it.',
          stats: [[seconds(time), 'your seconds'], [seconds(robotTime), 'robot seconds']],
          confetti: won,
        });
      },
    });
    return;
  }

  // friends take turns on the same keyboard; player 2 races a replay of player 1
  runRace({
    words, typist: 0,
    rowers: save.rowers,
    names: ['Player 1', 'Player 2 (next)'],
    rivalLetters: () => 0,
    done(time1, stamps) {
      showResult({
        stars: null,
        title: 'Player 1 is done!',
        msg: 'Player 2, put your hands on the keyboard. You will race the boat of Player 1.',
        stats: [[seconds(time1), 'Player 1 seconds']],
        nextLabel: 'Player 2, go!',
        next: () => runRace({
          words, typist: 1,
          rowers: save.rowers,
          names: ['Player 1', 'Player 2'],
          rivalLetters: t => stamps.filter(s => s <= t).length,
          done(time2) {
            const winner = time1 === time2 ? 'It is a tie!' : (time1 < time2 ? 'Player 1' : 'Player 2') + ' wins!';
            showResult({
              ...common,
              stars: null,
              title: winner,
              msg: 'What a race! Shake hands and race again.',
              stats: [[seconds(time1), 'Player 1 seconds'], [seconds(time2), 'Player 2 seconds']],
              confetti: true,
            });
          },
        }),
      });
    },
  });
}

// o: { words, typist (0 or 1), rowers, names, rivalLetters(t), done(time, stamps) }
function runRace(o) {
  setMode(null);
  showScreen('raceScreen');
  const total = o.words.reduce((n, w) => n + w.length, 0);
  const rival = 1 - o.typist;

  const lanes = $('raceLanes');
  lanes.textContent = '';
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
  $('raceTime').textContent = '0.0';

  const queue = o.words.slice();
  const feed = wordFeed($('raceWord'), $('raceNext'), () => queue.shift());
  const stamps = []; // when each letter was typed, for the replay
  const timers = [];
  let startedAt = 0;
  let raf = 0;
  let hits = 0;

  const elapsed = () => (performance.now() - startedAt) / 1000;
  const place = (boat, progress) => boat.style.setProperty('--p', Math.min(1, progress));

  function frame() {
    const t = elapsed();
    const progress = o.rivalLetters(t) / total;
    place(boats[rival], progress);
    boats[rival].classList.toggle('rowing', progress > 0 && progress < 1);
    $('raceTime').textContent = seconds(t);
    raf = requestAnimationFrame(frame);
  }

  // 3, 2, 1, Go!
  const count = $('raceCount');
  ['3', '2', '1', 'Go!'].forEach((text, i) => {
    timers.push(setTimeout(() => {
      count.hidden = false;
      count.textContent = text;
      if (i < 3) return sfx.beep();
      sfx.line();
      startedAt = performance.now();
      raf = requestAnimationFrame(frame);
      timers.push(setTimeout(() => { count.hidden = true; }, 600));
    }, i * 800));
  });

  function onChar(ch) {
    if (!startedAt) return; // wait for Go!
    const result = feed.type(ch);
    if (result === 'miss') {
      sfx.bad();
      flashKey(ch, 'miss');
      return;
    }
    const t = elapsed();
    hits++;
    stamps.push(t);
    place(boats[o.typist], hits / total);
    boats[o.typist].classList.remove('stroke');
    void boats[o.typist].offsetWidth;
    boats[o.typist].classList.add('stroke');
    flashKey(ch.toLowerCase(), 'hit');
    if (result === 'word') sfx.line(); else sfx.good();
    if (result === 'end') o.done(t, stamps);
  }

  setMode({
    onChar,
    expected: () => (startedAt ? feed.expected() : null),
    stop() {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      count.hidden = true;
    },
  });
}

$('gameFruit').addEventListener('click', startFruit);
$('gameSurf').addEventListener('click', startSurf);
$('gameRow').addEventListener('click', openRowSetup);
$('rowStart').addEventListener('click', startMatch);
