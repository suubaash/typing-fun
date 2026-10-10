'use strict';

/* ---------- keyboard layout ---------- */
// [key, shifted, finger, width, label]
const ROWS = [
  [['`', '~', 'lp'], ['1', '!', 'lp'], ['2', '@', 'lr'], ['3', '#', 'lm'], ['4', '$', 'li'], ['5', '%', 'li'],
   ['6', '^', 'ri'], ['7', '&', 'ri'], ['8', '*', 'rm'], ['9', '(', 'rr'], ['0', ')', 'rp'], ['-', '_', 'rp'],
   ['=', '+', 'rp'], ['Backspace', '', 'rp', 2, 'delete']],
  [['Tab', '', 'lp', 1.5, 'tab'], ['q', 'Q', 'lp'], ['w', 'W', 'lr'], ['e', 'E', 'lm'], ['r', 'R', 'li'],
   ['t', 'T', 'li'], ['y', 'Y', 'ri'], ['u', 'U', 'ri'], ['i', 'I', 'rm'], ['o', 'O', 'rr'], ['p', 'P', 'rp'],
   ['[', '{', 'rp'], [']', '}', 'rp'], ['\\', '|', 'rp', 1.5]],
  [['CapsLock', '', 'lp', 1.75, 'caps'], ['a', 'A', 'lp'], ['s', 'S', 'lr'], ['d', 'D', 'lm'], ['f', 'F', 'li'],
   ['g', 'G', 'li'], ['h', 'H', 'ri'], ['j', 'J', 'ri'], ['k', 'K', 'rm'], ['l', 'L', 'rr'], [';', ':', 'rp'],
   ["'", '"', 'rp'], ['Enter', '', 'rp', 2.25, 'return']],
  [['ShiftLeft', '', 'lp', 2.25, 'shift'], ['z', 'Z', 'lp'], ['x', 'X', 'lr'], ['c', 'C', 'lm'], ['v', 'V', 'li'],
   ['b', 'B', 'li'], ['n', 'N', 'ri'], ['m', 'M', 'ri'], [',', '<', 'rm'], ['.', '>', 'rr'], ['/', '?', 'rp'],
   ['ShiftRight', '', 'rp', 2.75, 'shift']],
  [[' ', '', 'th', 1, 'space']],
];

const FINGER_IDS = ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp', 'th'];
const FINGER_NAMES = {
  lp: 'left pinky', lr: 'left ring finger', lm: 'left middle finger', li: 'left pointer finger',
  ri: 'right pointer finger', rm: 'right middle finger', rr: 'right ring finger', rp: 'right pinky',
  th: 'thumb',
};
const LEFT_HAND = ['lp', 'lr', 'lm', 'li', 'th'];
const RIGHT_HAND = ['th', 'ri', 'rm', 'rr', 'rp'];
const FINGER_HEIGHT = { lp: 28, lr: 38, lm: 44, li: 38, ri: 38, rm: 44, rr: 38, rp: 28, th: 22 };

// character -> { key, finger, shift }
const CHAR_MAP = {};
for (const row of ROWS) {
  for (const [key, shifted, finger] of row) {
    if (key.length !== 1) continue;
    CHAR_MAP[key] = { key, finger, shift: null };
    if (shifted) {
      // hold Shift with the opposite hand
      CHAR_MAP[shifted] = { key, finger, shift: finger[0] === 'l' ? 'ShiftRight' : 'ShiftLeft' };
    }
  }
}

/* ---------- lessons ---------- */
const LESSONS = [
  { id: 'fj', group: 'Home row', emoji: '🐣', title: 'F and J', keys: 'fj' },
  { id: 'dk', group: 'Home row', emoji: '🐥', title: 'D and K', keys: 'dk' },
  { id: 'sl', group: 'Home row', emoji: '🐤', title: 'S and L', keys: 'sl' },
  { id: 'a;', group: 'Home row', emoji: '🐔', title: 'A and ;', keys: 'a;' },
  { id: 'gh', group: 'Home row', emoji: '🦆', title: 'G and H', keys: 'gh' },
  { id: 'home-words', group: 'Home row', emoji: '🏠', title: 'Home row words', sub: 'dad glad flash',
    words: 'dad sad lad had has ask all add fall hall dash lash flash glad flag salad shall half glass flask' },

  { id: 'ei', group: 'Top row', emoji: '🐱', title: 'E and I', keys: 'ei' },
  { id: 'ru', group: 'Top row', emoji: '🐶', title: 'R and U', keys: 'ru' },
  { id: 'ty', group: 'Top row', emoji: '🐰', title: 'T and Y', keys: 'ty' },
  { id: 'wo', group: 'Top row', emoji: '🦊', title: 'W and O', keys: 'wo' },
  { id: 'qp', group: 'Top row', emoji: '🐼', title: 'Q and P', keys: 'qp' },
  { id: 'top-words', group: 'Top row', emoji: '🌳', title: 'Top row words', sub: 'tree play happy',
    words: 'the you your tree play quiet tiger sweet water purple yellow laugh puppy wish story world tulip kite rope hello happy read write house kitty fish' },

  { id: 'cm', group: 'Bottom row', emoji: '🐠', title: 'C and M', keys: 'cm' },
  { id: 'vn', group: 'Bottom row', emoji: '🐙', title: 'V and N', keys: 'vn' },
  { id: 'bx', group: 'Bottom row', emoji: '🐬', title: 'B and X', keys: 'bx' },
  { id: 'z,.', group: 'Bottom row', emoji: '🐳', title: 'Z , and .', keys: 'z,.' },
  { id: 'all-words', group: 'Bottom row', emoji: '🌈', title: 'All the letters', sub: 'unicorn pizza',
    words: 'cat dog moon zebra fox jump bunny rainbow unicorn cookie music dance magic ocean pizza queen violet banana monkey dragon castle garden summer friend family' },

  { id: 'caps', group: 'Big kid skills', emoji: '🎈', title: 'Capital letters', sub: 'hold Shift',
    lines: ['Ff Jj Dd Kk Ss Ll', 'Mom and Dad', 'Sam has a Cat', 'I like Fridays'] },
  { id: 'sentences', group: 'Big kid skills', emoji: '📖', title: 'Sentences', sub: 'The cat sat.',
    lines: ['The cat sat on a mat.', 'I love my family.', 'Dogs can run very fast.', 'We like to play outside.'] },
  { id: 'numbers', group: 'Big kid skills', emoji: '🔢', title: 'Numbers', sub: '1 2 3',
    lines: ['1 2 3 4 5', '6 7 8 9 0', '10 cats and 20 dogs', 'I can count to 100.'] },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// keys learned in every lesson up to and including this one
function knownKeys(lesson) {
  let known = '';
  for (const l of LESSONS) {
    if (l.keys) known += l.keys;
    if (l === lesson) break;
  }
  return known;
}

function drillLines(lesson) {
  const fresh = lesson.keys.split('');
  const pool = fresh.concat(fresh, fresh, knownKeys(lesson).split(''));
  const [a, b] = fresh;
  const lines = [
    fresh.map(k => k + k + k).join(' ') + ' ' + fresh.map(k => k + k).join(' '),
    [a + b + a, b + a + b, a + a + b, b + b + a].join(' '),
  ];
  for (let n = 0; n < 1; n++) {
    const groups = [];
    for (let g = 0; g < 4; g++) groups.push(pick(pool) + pick(pool) + pick(pool));
    lines.push(groups.join(' '));
  }
  return lines;
}

function wordLines(lesson) {
  const words = shuffle(lesson.words.split(' '));
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > 22) {
      lines.push(line);
      line = '';
      if (lines.length === 3) break;
    }
    line = line ? line + ' ' + w : w;
  }
  if (line && lines.length < 3) lines.push(line);
  return lines;
}

function buildLines(lesson) {
  if (lesson.lines) return lesson.lines.slice();
  return lesson.keys ? drillLines(lesson) : wordLines(lesson);
}

/* ---------- saved progress ---------- */
const STORE_KEY = 'typing-fun-v1';
let save = {
  stars: {}, sound: true, unlockAll: false, best: {},
  kb: { palette: 'rainbow', shape: 'soft', board: '#ffffff', sticker: '' },
  rowVs: 'robot',
  me: '', // which cousin plays on this device
  voice: '',
  rowers: [
    { who: '🍍', color: '#ff5d73', deco: 'stripes' },
    { who: '🐢', color: '#4cc9f0', deco: 'dots' },
  ],
};
try {
  Object.assign(save, JSON.parse(localStorage.getItem(STORE_KEY)) || {});
} catch (e) { /* storage unavailable: play without saving */ }

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}

function isUnlocked(index) {
  return save.unlockAll || index === 0 || (save.stars[LESSONS[index - 1].id] || 0) > 0;
}

/* ---------- sound ---------- */
let audioCtx = null;
function tone(freq, start, length, type = 'sine', volume = 0.08) {
  if (!save.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + start;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + length);
  } catch (e) { /* no audio */ }
}
const sfx = {
  good: () => tone(660, 0, 0.07),
  bad: () => tone(160, 0, 0.18, 'square', 0.05),
  line: () => { tone(523, 0, 0.1); tone(784, 0.08, 0.14); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.1)),
  // soft bell notes for the relaxing game
  bell: () => tone(pick([523, 587, 659, 784, 880, 1047]), 0, 0.5, 'sine', 0.07),
  beep: () => tone(440, 0, 0.15, 'triangle', 0.08),
};

/* ---------- Mochi's voice ---------- */
// The voice comes from the device, so we look for the most natural one it has.
const VOICE_RANK = [
  [/Natural|Neural/i, 100],            // Microsoft Edge
  [/Google US English/i, 90],          // Chrome
  [/\(Premium\)/i, 85], [/\(Enhanced\)/i, 80], // downloaded Apple voices
  [/^(Ava|Zoe|Allison|Evan|Nathan|Joelle|Noelle)\b/i, 70],
  [/Samantha/i, 60],
  [/Google UK English Female/i, 55],
  [/Karen|Moira|Tessa|Serena|Daniel|Zira|Aria|Jenny/i, 40],
];
const JOKE_VOICES = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Jester|Organ|Superstar|Good News|Fred|Junior|Kathy|Ralph|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley/i;

function voiceScore(v) {
  const hit = VOICE_RANK.find(([pattern]) => pattern.test(v.name));
  return (hit ? hit[1] : 0) + (v.lang === 'en-US' ? 5 : 0);
}

// English voices, most natural first
function goodVoices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith('en') && !JOKE_VOICES.test(v.name))
    .sort((x, y) => voiceScore(y) - voiceScore(x));
}

let voice = null;
function pickVoice() {
  if (voice) return voice;
  const voices = goodVoices();
  voice = voices.find(v => v.name === save.voice) || voices[0] || null;
  return voice;
}

function say(text) {
  if (!save.sound || !text || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel(); // newest thing to say wins, so Mochi never falls behind
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    if (pickVoice()) { u.voice = voice; u.lang = voice.lang; }
    speechSynthesis.speak(u);
  } catch (e) { /* no voice */ }
}

// a menu so a grown-up can pick the nicest voice on this device
function fillVoiceMenu() {
  const menu = $('voiceSelect');
  const voices = goodVoices();
  $('voiceRow').hidden = voices.length < 2;
  voice = null;
  menu.textContent = '';
  for (const v of voices) {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = v.name.replace(/^(Microsoft|Google) /, '');
    menu.append(opt);
  }
  if (pickVoice()) menu.value = voice.name;
}

const KEY_NAMES = { ' ': 'the space bar', ';': 'semicolon', ',': 'comma', '.': 'period', "'": 'apostrophe', '/': 'slash' };
function keyName(key) {
  return KEY_NAMES[key] || key.toUpperCase();
}

const HOME_KEY = { lp: 'a', lr: 's', lm: 'd', li: 'f', ri: 'j', rm: 'k', rr: 'l', rp: ';' };
const rowChars = r => ROWS[r].filter(k => k[0].length === 1).map(k => k[0]);

// words that tell her where a key is and which finger to use
function describeKey(ch) {
  const info = CHAR_MAP[ch];
  if (!info) return '';
  if (ch === ' ') return 'The space bar is the long key at the bottom. Press it with your thumb.';
  const key = info.key;
  const name = keyName(key);
  const finger = FINGER_NAMES[info.finger];
  const r = ROWS.findIndex(row => row.some(k => k[0] === key));
  const i = rowChars(r).indexOf(key);
  let text;
  if (key === 'f' || key === 'j') {
    text = `${name} is in the middle row. It has a little bump on it. Put your ${finger} on it.`;
  } else if (r === 2) {
    const home = HOME_KEY[info.finger];
    text = home === key
      ? `${name} is in the middle row, right under your ${finger}.`
      : `${name} is in the middle row, right next to ${keyName(home)}. Slide your ${finger} over.`;
  } else if (r === 1) {
    text = `${name} is in the top row, just above ${keyName(rowChars(2)[i] || ';')}. Reach up with your ${finger}.`;
  } else if (r === 3) {
    text = `${name} is in the bottom row, just below ${keyName(rowChars(2)[i])}. Reach down with your ${finger}.`;
  } else {
    text = `${name} is in the number row at the very top, above ${keyName(rowChars(1)[i - 1] || 'q')}. Reach up with your ${finger}.`;
  }
  if (info.shift) text = `Hold the shift key with your ${info.shift === 'ShiftLeft' ? 'left' : 'right'} pinky. ` + text;
  return text + ' Look for the glowing key.';
}

// if she waits a while without finding the key, Mochi helps
let idleTimer = 0;
function armIdle(help, firstWait = 6000) {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(function again() {
    help();
    idleTimer = setTimeout(again, 14000);
  }, firstWait);
}

// make the key flash big, say where it is, and return the words
function helpWith(ch) {
  const info = CHAR_MAP[ch];
  if (!info) return '';
  keyEls[info.key].classList.add('help');
  const text = describeKey(ch);
  say(text);
  return text;
}

// the letters she has learned in typing school (the middle row to begin with)
function knownLetters() {
  let known = 'asdfghjkl';
  for (const l of LESSONS) {
    if (l.keys && (save.stars[l.id] || save.unlockAll)) known += l.keys;
  }
  return [...new Set(known)].filter(c => c >= 'a' && c <= 'z');
}

/* ---------- elements and screens ---------- */
const $ = id => document.getElementById(id);
const overlay = $('resultOverlay');
const keyEls = {};
const fingerEls = { left: {}, right: {} };
const SCREENS = ['homeScreen', 'playScreen', 'kbScreen', 'fruitScreen', 'surfScreen', 'rowSetupScreen', 'raceScreen'];

// whatever is being played right now: { onChar(ch, capsLock), expected(), stop() }
let mode = null;
function setMode(next) {
  clearTimeout(idleTimer);
  if (mode && mode.stop) mode.stop();
  mode = next;
}

function showScreen(id) {
  overlay.hidden = true;
  for (const s of SCREENS) $(s).hidden = s !== id;
  // the one keyboard moves to whichever screen is showing
  const slot = $(id).querySelector('.kb-slot');
  if (slot) slot.append($('keyboard'));
  clearTargets();
  if (document.activeElement) document.activeElement.blur();
  window.scrollTo(0, 0);
}

// a row of pick-one buttons
function chipRow(el, options, current, onPick) {
  el.textContent = '';
  for (const [value, label] of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn';
    b.textContent = label;
    b.setAttribute('aria-pressed', value === current);
    b.addEventListener('click', () => onPick(value));
    el.append(b);
  }
}

/* ---------- home screen ---------- */
function starString(n) {
  return [0, 1, 2].map(i => `<span class="${i < n ? '' : 'off'}">⭐</span>`).join('');
}

function totalStars() {
  return Object.values(save.stars).reduce((a, b) => a + b, 0);
}

function renderHome() {
  const groups = $('lessonGroups');
  groups.textContent = '';
  const nextIndex = LESSONS.findIndex(l => !save.stars[l.id]);
  let grid = null;
  let lastGroup = '';

  LESSONS.forEach((lesson, index) => {
    if (lesson.group !== lastGroup) {
      lastGroup = lesson.group;
      const h = document.createElement('h3');
      h.className = 'subgroup-title';
      h.textContent = lesson.group;
      grid = document.createElement('div');
      grid.className = 'lesson-grid';
      groups.append(h, grid);
    }
    const unlocked = isUnlocked(index);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'lesson-card' + (index === nextIndex ? ' next' : '');
    card.disabled = !unlocked;
    const sub = lesson.sub || lesson.keys.split('').join(' ');
    card.innerHTML =
      `<span class="lesson-emoji">${unlocked ? lesson.emoji : '🔒'}</span>` +
      `<span class="lesson-name"></span><span class="lesson-sub"></span>` +
      `<span class="lesson-stars">${starString(save.stars[lesson.id] || 0)}</span>`;
    card.querySelector('.lesson-name').textContent = lesson.title;
    card.querySelector('.lesson-sub').textContent = sub;
    card.addEventListener('click', () => startLesson(index));
    grid.append(card);
  });

  $('starTotal').textContent = totalStars();
  $('heroHello').textContent = save.me ? `Aloha, ${save.me}!` : "Aloha! I'm Mochi.";
  $('heroNames').hidden = !!save.me;
  $('heroText').textContent = save.me
    ? "I'm Mochi, your robot cat teacher. Pick a game, or learn new keys in my typing school!"
    : "I'm your robot cat teacher. Who is playing today?";
}

function showHome() {
  setMode(null);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  showScreen('homeScreen');
  renderHome();
}

/* ---------- keyboard + hands ---------- */
function buildKeyboard() {
  const kb = $('keyboard');
  for (const row of ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    for (const [key, , finger, width, label] of row) {
      const el = document.createElement('button');
      el.type = 'button';
      el.tabIndex = -1;
      el.className = `key f-${finger}` + (label ? ' wide' : '') + (key === ' ' ? ' space' : '') +
        (key === 'f' || key === 'j' ? ' bump' : '');
      if (width) el.style.setProperty('--w', width);
      el.textContent = label || key;
      // tapping the on-screen key works too (tablets)
      if (key.length === 1) {
        el.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (!mode) return;
          const wanted = [].concat(mode.expected() || []);
          const match = wanted.find(c => CHAR_MAP[c] && CHAR_MAP[c].key === key);
          mode.onChar(match || key);
        });
      }
      keyEls[key] = el;
      rowEl.append(el);
    }
    kb.append(rowEl);
  }

  const addFingers = (container, list, side) => {
    for (const f of list) {
      const el = document.createElement('div');
      el.className = `finger f-${f}`;
      el.style.height = FINGER_HEIGHT[f] + 'px';
      fingerEls[side][f] = el;
      container.append(el);
    }
  };
  addFingers($('leftHand'), LEFT_HAND, 'left');
  addFingers($('rightHand'), RIGHT_HAND, 'right');
}

function clearTargets() {
  document.querySelectorAll('.key.target, .key.help').forEach(el => el.classList.remove('target', 'help'));
  document.querySelectorAll('.finger.active').forEach(el => el.classList.remove('active'));
}

// make keys glow (games)
function glowKeys(chars) {
  clearTargets();
  for (const ch of chars) {
    const info = CHAR_MAP[ch];
    if (!info) continue;
    keyEls[info.key].classList.add('target');
    if (info.shift) keyEls[info.shift].classList.add('target');
  }
}

// glow one key and tell which finger to use (lessons)
function showTarget(ch) {
  glowKeys([ch]);
  const info = CHAR_MAP[ch];
  const hint = $('fingerHint');
  if (!info) { hint.textContent = ''; return; }

  if (info.finger === 'th') {
    fingerEls.left.th.classList.add('active');
    fingerEls.right.th.classList.add('active');
  } else {
    fingerEls[info.finger[0] === 'l' ? 'left' : 'right'][info.finger].classList.add('active');
  }

  if (info.shift) {
    const pinky = info.shift === 'ShiftLeft' ? 'lp' : 'rp';
    fingerEls[pinky[0] === 'l' ? 'left' : 'right'][pinky].classList.add('active');
  }
  hint.innerHTML = fingerHintHtml(ch);
}

// "Press F with your left pointer finger"
function fingerHintHtml(ch) {
  const info = CHAR_MAP[ch];
  if (!info) return '';
  const name = ch === ' ' ? 'the space bar' : escapeHtml(ch.toUpperCase());
  if (info.shift) {
    const pinky = info.shift === 'ShiftLeft' ? 'lp' : 'rp';
    return `Hold <span class="chip f-${pinky}">shift</span> and press <span class="chip f-${info.finger}">${escapeHtml(info.key.toUpperCase())}</span>`;
  }
  return `Press <span class="chip f-${info.finger}">${name}</span> with your ${FINGER_NAMES[info.finger]}`;
}

function flashKey(ch, cls) {
  const info = CHAR_MAP[ch];
  if (!info) return;
  const el = keyEls[info.key];
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 160);
}

/* ---------- design your own keyboard ---------- */
// colours are in finger order: FINGER_IDS
const PALETTES = {
  rainbow: { name: 'Rainbow', colors: ['#ffb3c1', '#ffd6a5', '#fdf3a0', '#b9f0b4', '#a8e4f2', '#b8c8ff', '#d9bbff', '#ffbde6', '#e3e3ea'] },
  ocean: { name: 'Ocean', colors: ['#8fd3f4', '#b8f1e6', '#7fe0c3', '#d0f4a8', '#a0e9ff', '#86b8ff', '#c3c7ff', '#9fe8d0', '#dbe9f4'] },
  sunset: { name: 'Sunset', colors: ['#ffadad', '#ffc38a', '#ffe08a', '#ffd1dc', '#ff9ec4', '#f7b0ff', '#ffb4a2', '#ffcf99', '#f3e3d3'] },
  candy: { name: 'Candy', colors: ['#ffc6ff', '#bde0fe', '#caffbf', '#fdffb6', '#ffd6a5', '#ffadad', '#a0c4ff', '#e2b6ff', '#f1e4f3'] },
  jungle: { name: 'Jungle', colors: ['#b7e4a8', '#e9d8a6', '#95d5b2', '#ffe066', '#d8f3a0', '#f4b183', '#a3d9c9', '#cfe1b9', '#e6dfd0'] },
  night: { name: 'Night', ink: '#ffffff', colors: ['#5b5fc7', '#7a4fd6', '#3f7ad6', '#2f8f83', '#3a7fc4', '#8a56c9', '#b54a8f', '#5566b8', '#4a4a6a'] },
};
const SHAPES = { soft: 'clamp(5px, 1vw, 10px)', bubble: '999px', square: '2px' };
const SHAPE_NAMES = { soft: 'Soft', bubble: 'Bubble', square: 'Square' };
const BOARDS = ['#ffffff', '#ffe5ec', '#d8f3ff', '#e6ffd8', '#fff3b0', '#2b2a4c'];
const STICKERS = ['', '🌺', '🐱', '🌈', '⭐', '🥥', '🦄', '🍍', '🌊'];

function applyKeyboardDesign() {
  const d = save.kb;
  const pal = PALETTES[d.palette] || PALETTES.rainbow;
  const root = document.documentElement.style;
  FINGER_IDS.forEach((f, i) => root.setProperty('--f-' + f, pal.colors[i]));
  root.setProperty('--key-ink', pal.ink || '#2b2a4c');
  root.setProperty('--key-radius', SHAPES[d.shape] || SHAPES.soft);
  root.setProperty('--kb-board', d.board);
  keyEls[' '].textContent = d.sticker ? `${d.sticker} space ${d.sticker}` : 'space';
}

function renderKbOptions() {
  const d = save.kb;
  const btn = (set, val, inner, cls = 'chip-btn', label = '') =>
    `<button type="button" class="${cls}" data-set="${set}" data-val="${val}" aria-pressed="${d[set] === val}"` +
    `${label ? ` aria-label="${label}"` : ''}>${inner}</button>`;
  const row = (label, inner) => `<div class="opt-row"><span class="opt-label">${label}</span><div class="chips">${inner}</div></div>`;

  $('kbOptions').innerHTML =
    row('Key colours', Object.entries(PALETTES).map(([id, p]) =>
      btn('palette', id, `<span class="pal">${p.colors.slice(0, 8).map(c => `<i style="background:${c}"></i>`).join('')}</span>${p.name}`)).join('')) +
    row('Key shape', Object.keys(SHAPES).map(id => btn('shape', id, SHAPE_NAMES[id])).join('')) +
    row('Board colour', BOARDS.map(c => btn('board', c, '', 'swatch', 'Board colour ' + c)
      .replace('<button', `<button style="background:${c}"`)).join('')) +
    row('Space bar sticker', STICKERS.map(s => btn('sticker', s, s || 'None', 'chip-btn emoji-chip')).join(''));
}

function openKeyboardDesigner() {
  setMode(null);
  showScreen('kbScreen');
  renderKbOptions();
  // typing here just lights the keys up
  setMode({ expected: () => null, onChar: ch => { flashKey(ch, 'hit'); sfx.good(); say(keyName(ch.toLowerCase())); } });
}

/* ---------- typing school ---------- */
function startLesson(index) {
  const lesson = LESSONS[index];
  const lines = buildLines(lesson);
  const run = {
    line: 0, pos: 0, hits: 0, misses: 0, missesInRow: 0, spoken: '',
    total: lines.reduce((n, l) => n + l.length, 0),
  };
  const expected = () => lines[run.line][run.pos];

  function renderLine() {
    const box = $('typeLine');
    box.textContent = '';
    // keep each word together when the line wraps
    const newWord = () => {
      const w = document.createElement('span');
      w.className = 'word';
      return w;
    };
    let word = newWord();
    [...lines[run.line]].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.dataset.i = i;
      if (ch === ' ') {
        span.classList.add('space');
        box.append(word, span);
        word = newWord();
      } else {
        word.append(span);
      }
    });
    box.append(word);
    paintLine();
  }

  function paintLine() {
    $('typeLine').querySelectorAll('[data-i]').forEach(span => {
      const i = Number(span.dataset.i);
      span.classList.toggle('done', i < run.pos);
      span.classList.toggle('current', i === run.pos);
      span.classList.remove('oops');
    });
    showTarget(expected());
    announce();
    armIdle(explain);
  }

  // Mochi says what to press next
  function announce() {
    const line = lines[run.line];
    const want = expected();
    if (lesson.keys) {
      // key drills: say the key and finger whenever the key changes
      if (want !== run.spoken && want !== ' ') {
        if (run.hits) say(`Now ${keyName(want)}, with your ${FINGER_NAMES[CHAR_MAP[want].finger]}.`);
        run.spoken = want;
      }
    } else if (run.hits && want !== ' ' && (run.pos === 0 || line[run.pos - 1] === ' ')) {
      // word lessons: say each word as she gets to it
      say('Type ' + line.slice(run.pos).split(' ')[0]);
    }
  }

  // she is stuck: say and show where the key is
  function explain() {
    $('fingerHint').textContent = helpWith(expected());
  }

  function accuracy() {
    const tries = run.hits + run.misses;
    return tries ? Math.round((run.hits / tries) * 100) : 100;
  }

  function updateStats() {
    $('liveAcc').textContent = accuracy() + '%';
    $('progressFill').style.width = (run.hits / run.total) * 100 + '%';
  }

  function finish() {
    const acc = accuracy();
    const stars = acc >= 90 ? 3 : acc >= 75 ? 2 : 1;
    save.stars[lesson.id] = Math.max(save.stars[lesson.id] || 0, stars);
    persist();
    $('starTotal').textContent = totalStars();

    const hasNext = index < LESSONS.length - 1;
    showResult({
      stars,
      title: ['', 'Good try!', 'Great job!', 'Amazing!'][stars],
      msg: [
        '',
        'You finished! Go slowly and look for the glowing key.',
        'You finished! So close to three stars.',
        'Three stars! Your fingers know where to go.',
      ][stars],
      stats: [[acc + '%', 'correct'], [run.total, 'keys pressed']],
      again: () => startLesson(index),
      againLabel: 'Try again',
      next: hasNext ? () => startLesson(index + 1) : showHome,
      nextLabel: hasNext ? 'Next lesson →' : 'All done!',
      confetti: stars >= 2,
    });
  }

  function onChar(ch, capsLock) {
    const want = expected();

    if (ch === want) {
      run.missesInRow = 0;
      run.hits++;
      run.pos++;
      flashKey(want, 'hit');
      if (run.pos >= lines[run.line].length) {
        run.line++;
        run.pos = 0;
        if (run.line >= lines.length) {
          updateStats();
          return finish();
        }
        sfx.line();
        renderLine();
      } else {
        sfx.good();
        paintLine();
      }
    } else {
      run.misses++;
      run.missesInRow++;
      sfx.bad();
      flashKey(ch, 'miss');
      shake($('typeLine').querySelector('.current'));
      // first slip: a quick reminder. Second slip: full directions.
      if (run.missesInRow >= 2) explain();
      else say(`Oops! Let's find ${keyName(want)}.`);
      armIdle(explain);
      if (capsLock && ch.toLowerCase() === want.toLowerCase()) {
        $('fingerHint').innerHTML = '<span class="caps-warn">Caps Lock is on. Press the caps key to turn it off.</span>';
      }
    }
    updateStats();
  }

  setMode(null);
  showScreen('playScreen');
  $('lessonTitle').textContent = `${lesson.emoji} ${lesson.title}`;
  setMode({ expected, onChar });
  renderLine();
  updateStats();
  const first = expected();
  say(lesson.keys
    ? `${save.me ? 'Okay ' + save.me + '. ' : ''}Let's learn ${lesson.keys.split('').map(keyName).join(' and ')}. Take your time. ${describeKey(first)}`
    : `${lesson.title}. Take your time. Type ${lines[0].split(' ')[0]}. ${describeKey(first)}`);
}

function shake(el) {
  if (!el) return;
  el.classList.remove('oops');
  void el.offsetWidth; // restart the shake
  el.classList.add('oops');
}

/* ---------- finished card ---------- */
let resultActions = {};

// o: { stars, title, msg, stats: [[value, label]], again, againLabel, next, nextLabel, confetti }
function showResult(o) {
  setMode(null);
  clearTargets();
  resultActions = o;
  $('resultStars').hidden = o.stars == null;
  if (o.stars != null) $('resultStars').innerHTML = starString(o.stars);
  $('resultTitle').textContent = o.title;
  $('resultMsg').textContent = o.msg;
  $('resultStats').innerHTML = o.stats.map(([value, label]) => `<div><b>${value}</b><span>${label}</span></div>`).join('');
  $('againBtn').hidden = !o.again;
  $('againBtn').textContent = o.againLabel || 'Play again';
  $('nextBtn').textContent = o.nextLabel;
  overlay.hidden = false;
  // wait a moment so a key still being pressed doesn't press the button
  setTimeout(() => { if (!overlay.hidden) $('nextBtn').focus(); }, 500);

  sfx.win();
  say(`${o.title} ${o.msg}`);
  if (o.confetti) confetti();
}

function confetti() {
  if (reducedMotion()) return;
  const box = $('confetti');
  const bits = ['🎉', '⭐', '🌺', '🎈', '🍍', '✨'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('i');
    el.textContent = pick(bits);
    el.style.left = Math.random() * 100 + '%';
    el.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    el.style.animationDelay = Math.random() * 0.5 + 's';
    box.append(el);
    setTimeout(() => el.remove(), 4200);
  }
}

/* ---------- events ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('homeScreen').hidden) return showHome();
  if (!mode) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length !== 1) return;
  e.preventDefault(); // stop space scrolling and quick-find
  mode.onChar(e.key, e.getModifierState && e.getModifierState('CapsLock'));
});

$('homeBtn').addEventListener('click', showHome);
document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', showHome));
$('againBtn').addEventListener('click', () => resultActions.again());
$('nextBtn').addEventListener('click', () => resultActions.next());

function paintSound() {
  const btn = $('soundBtn');
  btn.textContent = save.sound ? '🔊' : '🔇';
  btn.setAttribute('aria-pressed', save.sound);
  btn.setAttribute('aria-label', save.sound ? 'Sound on' : 'Sound off');
}
$('soundBtn').addEventListener('click', e => {
  save.sound = !save.sound;
  persist();
  paintSound();
  if (!save.sound && 'speechSynthesis' in window) speechSynthesis.cancel();
  e.currentTarget.blur(); // so the space bar doesn't toggle it mid-lesson
});

$('resetBtn').addEventListener('click', () => {
  if (!confirm('Erase all stars and start over?')) return;
  save.stars = {};
  save.best = {};
  save.unlockAll = false;
  persist();
  renderHome();
});

$('gameKb').addEventListener('click', openKeyboardDesigner);
$('kbOptions').addEventListener('click', e => {
  const b = e.target.closest('[data-set]');
  if (!b) return;
  save.kb[b.dataset.set] = b.dataset.val;
  persist();
  applyKeyboardDesign();
  $('kbOptions').querySelectorAll('[data-set]').forEach(el =>
    el.setAttribute('aria-pressed', save.kb[el.dataset.set] === el.dataset.val));
  b.blur();
});
$('kbSurprise').addEventListener('click', e => {
  save.kb = {
    palette: pick(Object.keys(PALETTES)),
    shape: pick(Object.keys(SHAPES)),
    board: pick(BOARDS),
    sticker: pick(STICKERS),
  };
  persist();
  applyKeyboardDesign();
  renderKbOptions();
  e.currentTarget.blur();
});

document.querySelectorAll('.cat-slot').forEach(el => { el.innerHTML = catSVG(); });
document.querySelectorAll('.coco-slot').forEach(el => { el.innerHTML = coconutBoatSVG(); });
document.querySelectorAll('.surfer-slot').forEach(el => { el.innerHTML = surferSVG(); });

$('voiceSelect').addEventListener('change', e => {
  save.voice = e.target.value;
  persist();
  voice = null;
  say("Aloha! I'm Mochi. This is my voice.");
});
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener('voiceschanged', fillVoiceMenu);
  fillVoiceMenu();
}

buildKeyboard();
applyKeyboardDesign();
paintSound();
renderHome();
