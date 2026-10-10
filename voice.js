'use strict';

/* "My Voice": a child records the lines Mochi says, and the game plays her recordings.

   Mochi's sentences are built from small pieces ("Now" + "J" + "with your" + "right pointer finger"),
   so each piece is recorded once. A sentence that is mostly covered by recordings is played from them;
   anything else falls back to the device voice.

   Recordings made here are kept on this device (IndexedDB). A published set that everyone hears
   lives in the voice/ folder next to this file. */

const CLIP_GROUPS = [
  ['Letters', 'abcdefghijklmnopqrstuvwxyz'.split('').map(c => c.toUpperCase())],
  ['Numbers and other keys', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'semicolon', 'comma', 'period', 'the space bar']],
  ['Fingers', ['left pinky', 'left ring finger', 'left middle finger', 'left pointer finger',
    'right pointer finger', 'right middle finger', 'right ring finger', 'right pinky', 'thumb']],
  ['Helping words', [
    'Now', 'with your', "Oops! Let's find", 'Type', "Let's learn", 'and', 'Take your time', 'Can you find',
    'is in the middle row', 'is in the top row', 'is in the bottom row', 'is in the number row at the very top',
    'It has a little bump on it', 'Put your', 'on it', 'right under your', 'right next to', 'Slide your', 'over',
    'just above', 'just below', 'above', 'Reach up with your', 'Reach down with your', 'Look for the glowing key',
    'The space bar is the long key at the bottom', 'Press it with your thumb', 'Hold the shift key with your',
  ]],
  ['Cheering', ['Aloha', 'Okay', 'Shivalika', 'Vedisha', 'Good try', 'Great job', 'Amazing', 'You finished',
    'Welcome to Fruit Lagoon', 'No rush', 'Find the letter on a fruit and press it',
    'Surf time', 'Every right key makes the wave grow', 'Row, row, row',
    'The robot only moves when you press a wrong key']],
];

const wordsOf = text => text.match(/[A-Za-z0-9']+/g) || [];
const CLIPS = CLIP_GROUPS.flatMap(([group, texts]) => texts.map(text => {
  const words = wordsOf(text.toLowerCase());
  return { id: words.join('-').replace(/'/g, ''), text, group, words, key: /^[A-Z0-9]$/.test(text) };
}));
// longest pieces first, so "right pointer finger" wins over a shorter match
const CLIPS_BY_FIRST = {};
for (const clip of CLIPS.slice().sort((a, b) => b.words.length - a.words.length)) {
  (CLIPS_BY_FIRST[clip.words[0]] = CLIPS_BY_FIRST[clip.words[0]] || []).push(clip);
}

const clipUrls = {}; // clip id -> something an <audio> can play
const mine = new Set(); // ids recorded on this device

/* ---------- keeping recordings on this device ---------- */
function voiceDb() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('typing-fun-voice', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('clips');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

async function dbRun(mode, work) {
  const db = await voiceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', mode);
    const request = work(tx.objectStore('clips'));
    tx.oncomplete = () => resolve(request && request.result);
    tx.onerror = () => reject(tx.error);
  });
}

function useClip(id, blob) {
  if (mine.has(id)) URL.revokeObjectURL(clipUrls[id]);
  clipUrls[id] = URL.createObjectURL(blob);
  mine.add(id);
}

async function loadVoice() {
  // the published set, shared by everyone
  try {
    const list = await (await fetch('voice/index.json', { cache: 'no-cache' })).json();
    for (const id of list.ids) if (CLIPS.some(c => c.id === id)) clipUrls[id] = `voice/${id}.wav`;
  } catch (e) { /* nothing published yet */ }
  // this device's own recordings win over the published ones
  try {
    const keys = await dbRun('readonly', store => store.getAllKeys());
    const blobs = await dbRun('readonly', store => store.getAll());
    keys.forEach((id, i) => useClip(id, blobs[i]));
  } catch (e) { /* no storage: recordings last until the page closes */ }
  if (!$('voiceScreen').hidden) drawStudio();
}

/* ---------- speaking with the recordings ---------- */
let playing = null;
let playTurn = 0;

function stopClips() {
  playTurn++;
  if (playing) playing.pause();
  playing = null;
}

// split a sentence into recorded pieces and leftover words
function clipPlan(text) {
  const tokens = wordsOf(text);
  const plan = [];
  let covered = 0;
  for (let i = 0; i < tokens.length;) {
    const options = CLIPS_BY_FIRST[tokens[i].toLowerCase()] || [];
    const clip = options.find(c => clipUrls[c.id] &&
      (!c.key || tokens[i] === c.text) && // a letter name only for a capital letter on its own, never the word "a"
      c.words.every((w, n) => (tokens[i + n] || '').toLowerCase() === w));
    if (clip) {
      plan.push({ clip });
      covered += clip.words.length;
      i += clip.words.length;
    } else {
      const last = plan[plan.length - 1];
      if (last && last.text) last.text += ' ' + tokens[i]; else plan.push({ text: tokens[i] });
      i++;
    }
  }
  // mostly her voice, or not at all: a sentence that keeps switching voices is hard to follow
  return tokens.length && covered / tokens.length >= 0.6 ? plan : null;
}

function playClip(url) {
  return new Promise((resolve, reject) => {
    const audio = playing = new Audio(url);
    audio.onended = resolve;
    audio.onerror = reject;
    audio.onpause = resolve;
    audio.play().catch(reject);
  });
}

// returns true when the recordings are taking care of this sentence
function clipSay(text) {
  if (save.myVoice === false) return false;
  const plan = clipPlan(text);
  if (!plan) return false;
  stopClips();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const turn = playTurn;
  (async () => {
    for (const part of plan) {
      if (turn !== playTurn) return;
      const fallback = part.text || part.clip.text;
      try {
        if (part.clip) await playClip(clipUrls[part.clip.id]);
        else await new Promise(done => ttsSpeak(fallback, done));
      } catch (e) {
        if (turn === playTurn) await new Promise(done => ttsSpeak(fallback, done));
      }
    }
  })();
  return true;
}

/* ---------- recording ---------- */
// cut the silence off both ends, make it a good loudness, and save it as a small WAV that plays everywhere
async function tidyRecording(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const heard = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(heard.duration * rate), rate);
  const source = offline.createBufferSource();
  source.buffer = heard;
  source.connect(offline.destination);
  source.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak < 0.02) return null; // nothing but quiet
  const loud = Math.max(0.015, peak * 0.08);
  let start = 0;
  let end = samples.length - 1;
  while (start < end && Math.abs(samples[start]) < loud) start++;
  while (end > start && Math.abs(samples[end]) < loud) end--;
  start = Math.max(0, start - Math.round(rate * 0.05));
  end = Math.min(samples.length - 1, end + Math.round(rate * 0.12));

  const count = end - start + 1;
  const gain = 0.9 / peak;
  const wav = new DataView(new ArrayBuffer(44 + count * 2));
  const text = (at, s) => [...s].forEach((c, i) => wav.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); wav.setUint32(4, 36 + count * 2, true); text(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
  wav.setUint32(24, rate, true); wav.setUint32(28, rate * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true);
  text(36, 'data'); wav.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const v = Math.max(-1, Math.min(1, samples[start + i] * gain));
    wav.setInt16(44 + i * 2, v * 32767, true);
  }
  return new Blob([wav], { type: 'audio/wav' });
}

const studio = { at: 0, mic: null, recorder: null, stopTimer: 0 };

async function toggleRecording() {
  if (studio.recorder) return studio.recorder.stop();
  stopClips();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  try {
    studio.mic = studio.mic || await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    $('recStatus').textContent = 'I could not use the microphone. Ask a grown-up to allow it for this page.';
    return;
  }
  const clip = CLIPS[studio.at];
  const chunks = [];
  const recorder = studio.recorder = new MediaRecorder(studio.mic);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = async () => {
    clearTimeout(studio.stopTimer);
    studio.recorder = null;
    let wav = null;
    try { wav = await tidyRecording(new Blob(chunks, { type: recorder.mimeType })); } catch (e) { /* could not read it */ }
    if (!wav) {
      drawStudio();
      $('recStatus').textContent = 'I could not hear that. Tap the microphone and try again, a little louder.';
      return;
    }
    useClip(clip.id, wav);
    dbRun('readwrite', store => store.put(wav, clip.id)).catch(() => {});
    drawStudio();
    playClip(clipUrls[clip.id]).catch(() => {});
  };
  recorder.start();
  studio.stopTimer = setTimeout(() => recorder.state === 'recording' && recorder.stop(), 8000);
  drawStudio();
}

/* ---------- the studio screen ---------- */
function drawStudio() {
  const clip = CLIPS[studio.at];
  const done = CLIPS.filter(c => mine.has(c.id)).length;
  const recording = !!studio.recorder;
  $('recCount').textContent = `${done} / ${CLIPS.length}`;
  $('recGroup').textContent = clip.group;
  $('recText').textContent = clip.text;
  $('recStatus').textContent = recording ? 'Listening… say it, then tap stop.'
    : mine.has(clip.id) ? 'Recorded! Listen, record it again, or go to the next one.'
    : clipUrls[clip.id] ? 'This one is already in the game. Record it to use your own.'
    : 'Tap the microphone, then say the words.';
  $('recBtn').textContent = recording ? '⏹ Stop' : mine.has(clip.id) ? '🎤 Record again' : '🎤 Record';
  $('recBtn').classList.toggle('recording', recording);
  $('recPlay').disabled = recording || !clipUrls[clip.id];
  $('recNext').disabled = recording;
  $('recUse').checked = save.myVoice !== false;

  const list = $('recList');
  list.textContent = '';
  let lastGroup = '';
  CLIPS.forEach((c, i) => {
    if (c.group !== lastGroup) {
      lastGroup = c.group;
      const h = document.createElement('h3');
      h.className = 'subgroup-title';
      h.textContent = c.group;
      list.append(h);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn rec-chip' + (mine.has(c.id) ? ' done' : '');
    b.textContent = (mine.has(c.id) ? '✓ ' : '') + c.text;
    b.setAttribute('aria-pressed', i === studio.at);
    b.addEventListener('click', () => { studio.at = i; drawStudio(); window.scrollTo(0, 0); });
    list.append(b);
  });
}

function openStudio() {
  setMode(null);
  showScreen('voiceScreen');
  const firstMissing = CLIPS.findIndex(c => !mine.has(c.id));
  studio.at = firstMissing < 0 ? 0 : firstMissing;
  drawStudio();
}

function closeMic() {
  if (studio.recorder) studio.recorder.stop();
  if (studio.mic) studio.mic.getTracks().forEach(t => t.stop());
  studio.mic = null;
}

// one file with every recording, for a grown-up to publish so both cousins hear it
async function saveVoiceFile() {
  const clips = {};
  for (const id of mine) {
    const blob = await (await fetch(clipUrls[id])).blob();
    clips[id] = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }
  const file = new Blob([JSON.stringify({ voice: save.me || 'voice', clips })], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = 'voice-pack.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}

$('gameVoice').addEventListener('click', openStudio);
$('recBtn').addEventListener('click', toggleRecording);
$('recPlay').addEventListener('click', () => { stopClips(); playClip(clipUrls[CLIPS[studio.at].id]).catch(() => {}); });
$('recNext').addEventListener('click', () => {
  // go to the next line that still needs recording
  const order = CLIPS.map((_, i) => (studio.at + 1 + i) % CLIPS.length);
  studio.at = order.find(i => !mine.has(CLIPS[i].id)) ?? order[0];
  drawStudio();
});
$('recUse').addEventListener('change', e => { save.myVoice = e.target.checked; persist(); });
$('recSave').addEventListener('click', saveVoiceFile);
$('recClear').addEventListener('click', async () => {
  if (!confirm('Delete every recording made on this device?')) return;
  await dbRun('readwrite', store => store.clear()).catch(() => {});
  location.reload();
});
// leaving the studio lets go of the microphone
document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', closeMic));
$('homeBtn').addEventListener('click', closeMic);

loadVoice();
