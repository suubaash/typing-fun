'use strict';

/* Drawings for the characters. Each function returns an SVG string. */

const INK = '#2b2a4c';

// Mochi, the robot cat teacher in a Hawaiian shirt
let catCount = 0;
function catSVG() {
  // each cat gets its own pattern, so one on a hidden screen can't break the others
  const shirt = 'aloha' + catCount++;
  const flower = (x, y) =>
    [0, 72, 144, 216, 288].map(a =>
      `<circle cx="${x}" cy="${y - 4.5}" r="3.4" fill="#fff" transform="rotate(${a} ${x} ${y})"/>`).join('') +
    `<circle cx="${x}" cy="${y}" r="2.4" fill="#ffd23f"/>`;
  return `<svg viewBox="0 0 200 232" role="img" aria-label="Mochi the robot cat">
    <defs>
      <pattern id="${shirt}" width="34" height="34" patternUnits="userSpaceOnUse">
        <rect width="34" height="34" fill="#ff5d73"/>
        ${flower(10, 11)}
        <ellipse cx="26" cy="26" rx="6" ry="2.6" fill="#3ddc97" transform="rotate(-35 26 26)"/>
      </pattern>
    </defs>
    <path d="M146 206q40 2 34-38" fill="none" stroke="#9fb4c7" stroke-width="9" stroke-linecap="round"/>
    <circle cx="180" cy="166" r="7" fill="#ff5d73" stroke="${INK}" stroke-width="3"/>
    <path d="M100 38V14" stroke="${INK}" stroke-width="4"/>
    <circle cx="100" cy="11" r="7" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
    <path d="M46 66 56 20l32 26zM154 66l-10-46-32 26z" fill="#9fb4c7" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M56 54l5-22 15 12zM144 54l-5-22-15 12z" fill="#ffb3c1"/>
    <rect x="38" y="36" width="124" height="94" rx="36" fill="#c9d6e3" stroke="${INK}" stroke-width="4"/>
    <rect x="56" y="56" width="88" height="54" rx="20" fill="#1f2a44"/>
    <g class="cat-eyes" fill="#7df9ff">
      <ellipse cx="80" cy="78" rx="9" ry="11"/><ellipse cx="120" cy="78" rx="9" ry="11"/>
    </g>
    <path d="M96 90h8l-4 5z" fill="#ff8fb1"/>
    <path d="M91 97q4.5 6 9 0q4.5 6 9 0" fill="none" stroke="#7df9ff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M38 90 16 84M38 100l-22 4M162 90l22-6M162 100l22 4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <rect x="88" y="128" width="24" height="10" fill="#9fb4c7" stroke="${INK}" stroke-width="3"/>
    <path d="M70 214v12M130 214v12" stroke="#9fb4c7" stroke-width="16" stroke-linecap="round"/>
    <path d="M36 176 28 196" stroke="#c9d6e3" stroke-width="11" stroke-linecap="round"/>
    <g class="cat-wave">
      <path d="M164 172 178 150" stroke="#c9d6e3" stroke-width="11" stroke-linecap="round"/>
      <circle cx="180" cy="146" r="9" fill="#c9d6e3" stroke="${INK}" stroke-width="3"/>
    </g>
    <circle cx="27" cy="199" r="9" fill="#c9d6e3" stroke="${INK}" stroke-width="3"/>
    <path d="M52 148 30 168l14 14 12-10zM148 148l22 20-14 14-12-10z" fill="url(#${shirt})" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M52 152q0-16 20-16h56q20 0 20 16v62H52z" fill="url(#${shirt})" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M100 150v64" stroke="${INK}" stroke-width="2" opacity=".35"/>
    <path d="M82 135l18 17-24 8zM118 135l-18 17 24 8z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="172" r="3" fill="#fff"/><circle cx="100" cy="190" r="3" fill="#fff"/>
  </svg>`;
}

// the coconut who sails around the lagoon
function coconutBoatSVG() {
  return `<svg viewBox="0 0 150 124" aria-hidden="true">
    <path d="M82 12v78" stroke="#8d5a2b" stroke-width="5" stroke-linecap="round"/>
    <path d="M88 16 132 78H88z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M88 47h22l9 13H88z" fill="#ff5d73"/>
    <path d="M40 46q4-12 12-4q6-10 12 4" fill="none" stroke="#5c3a1a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="68" r="24" fill="#8d5a2b" stroke="${INK}" stroke-width="3"/>
    <circle cx="42" cy="63" r="5.5" fill="#fff"/><circle cx="58" cy="63" r="5.5" fill="#fff"/>
    <circle cx="43" cy="64" r="2.5" fill="${INK}"/><circle cx="59" cy="64" r="2.5" fill="${INK}"/>
    <path d="M42 75q8 7 16 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M10 88h130l-16 30H26z" fill="#ff9f1c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 100h106" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

// the orange who surfs
function surferSVG() {
  return `<svg viewBox="0 0 140 120" aria-hidden="true">
    <ellipse cx="70" cy="106" rx="64" ry="9" fill="#ffe066" stroke="${INK}" stroke-width="3"/>
    <path d="M20 106h100" stroke="#ff5d73" stroke-width="4" stroke-linecap="round"/>
    <path d="M58 84v18M82 84v18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 58 18 44M100 58l22-18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="70" cy="56" r="32" fill="#ff9f1c" stroke="${INK}" stroke-width="3"/>
    <path d="M70 24q4-14 18-12q-4 12-18 12z" fill="#3ddc97" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="47" y="43" width="21" height="14" rx="5" fill="${INK}"/>
    <rect x="72" y="43" width="21" height="14" rx="5" fill="${INK}"/>
    <path d="M66 48h8" stroke="${INK}" stroke-width="3"/>
    <path d="M56 66q14 15 28 0z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  </svg>`;
}

const RIDERS = {
  Fruits: ['🍍', '🍓', '🍉', '🍌', '🍊', '🥥', '🍒', '🥝', '🍇', '🍑'],
  Animals: ['🐱', '🐶', '🐢', '🐸', '🐵', '🦊', '🐼', '🐧', '🦄', '🐙'],
  Foods: ['🍕', '🍩', '🧁', '🌮', '🍔', '🍪', '🥞', '🍦', '🥨', '🍙'],
};
const BOAT_COLORS = ['#ff5d73', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0', '#6c4df6', '#f15bb5', '#8d6e63'];
const BOAT_DECOS = { plain: 'Plain', stripes: 'Stripes', dots: 'Dots', stars: 'Stars', hearts: 'Hearts', waves: 'Waves' };

// fruits and foods get a little face so they look like people
const NEEDS_FACE = new Set(RIDERS.Fruits.concat(RIDERS.Foods));

// a rowing boat for the rower { who, color, deco }
function boatSVG(r) {
  const row = (ch) => [42, 80, 118].map(x =>
    `<text x="${x}" y="87" font-size="22" text-anchor="middle" fill="#fff">${ch}︎</text>`).join('');
  const deco = {
    plain: '',
    stripes: '<path d="M16 72h128M24 85h112" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>',
    dots: [30, 55, 80, 105, 130].map(x => `<circle cx="${x}" cy="77" r="6" fill="#fff" opacity=".9"/>`).join(''),
    stars: row('★'),
    hearts: row('♥'),
    waves: '<path d="M20 79q10-11 20 0t20 0t20 0t20 0t20 0t20 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>',
  }[r.deco] || '';
  const face = !NEEDS_FACE.has(r.who) ? '' : `
    <circle cx="71" cy="35" r="6.5" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
    <circle cx="89" cy="35" r="6.5" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
    <circle cx="72.5" cy="36" r="2.8" fill="${INK}"/><circle cx="90.5" cy="36" r="2.8" fill="${INK}"/>
    <path d="M73 46q7 6 14 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  return `<svg class="boat" viewBox="0 0 160 112" aria-hidden="true">
    <text x="80" y="57" font-size="52" text-anchor="middle">${r.who}</text>${face}
    <path d="M8 60h144q-6 38-36 38H44Q14 98 8 60z" fill="${r.color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    ${deco}
    <g class="oar">
      <path d="M86 58 54 100" stroke="#8d5a2b" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="50" cy="104" rx="10" ry="5" fill="#c98b4b" stroke="${INK}" stroke-width="2" transform="rotate(-52 50 104)"/>
    </g>
  </svg>`;
}
