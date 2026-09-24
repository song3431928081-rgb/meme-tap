// ===== BEAT TAP — Rhythm Meme Game =====

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ----- Image preload -----
const IMG = {};
['dancer1','dancer2','dancer3','bomb2','star2'].forEach(name => {
  const img = new Image();
  img.src = `assets/${name}.jpg`;
  IMG[name] = img;
});

// ----- Canvas sizing -----
let W, H, gridCols, gridRows, cellW, cellH;
function resize() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gridCols = W < 500 ? 3 : 4;
  gridRows = H < 600 ? 3 : 4;
  cellW = W / gridCols;
  cellH = (H - 80) / gridRows;
}
window.addEventListener('resize', resize);
resize();

// ===== Audio Engine (Catchy BGM) =====
let audioCtx = null, musicGain = null, isPlaying = false;
let musicStartTime = 0;
const BPM = 130;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LOOP = BAR * 4;
let tempoMul = 1;

// Catchy melody (C major, earworm)
const melody = [
  [0,'C5',0.25],[0.25,'E5',0.25],[0.5,'G5',0.25],[0.75,'E5',0.25],
  [1,'F5',0.25],[1.25,'A5',0.25],[1.5,'C6',0.25],[1.75,'A5',0.25],
  [2,'G5',0.25],[2.25,'B5',0.25],[2.5,'D6',0.25],[2.75,'B5',0.25],
  [3,'C6',0.25],[3.25,'E6',0.25],[3.5,'G6',0.25],[3.75,'C7',0.25],
];
const bass = [[0,'C3',1],[1,'F3',1],[2,'G3',1],[3,'C3',1]];
const noteFreq = {
  'C3':130.81,'F3':174.61,'G3':196.00,
  'C5':523.25,'D5':587.33,'E5':659.25,'F5':698.46,'G5':783.99,'A5':880.00,'B5':987.77,
  'C6':1046.50,'D6':1174.66,'E6':1318.51,'G6':1567.98,'C7':2093.00,
};

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.5;
  musicGain.connect(audioCtx.destination);
}

function playTone(freq, time, dur, type, vol) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(g); g.connect(musicGain);
  osc.start(time); osc.stop(time + dur);
}

function playDrum(time, type) {
  if (type === 'kick') {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    g.gain.setValueAtTime(0.4, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(g); g.connect(musicGain);
    osc.start(time); osc.stop(time + 0.15);
  } else if (type === 'snare') {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1000;
    g.gain.setValueAtTime(0.2, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(time);
  } else if (type === 'hat') {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.03, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.08, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.connect(g); g.connect(musicGain);
    src.start(time);
  }
}

function sfx(type) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  if (type === 'tap') {
    playTone(800 + Math.random() * 200, t, 0.06, 'square', 0.15);
  } else if (type === 'perfect') {
    playTone(1200, t, 0.08, 'square', 0.15);
    playTone(1600, t + 0.04, 0.08, 'square', 0.1);
  } else if (type === 'bomb') {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g); g.connect(musicGain);
    osc.start(t); osc.stop(t + 0.3);
  } else if (type === 'star') {
    [880, 1100, 1320, 1760].forEach((f, i) => {
      playTone(f, t + i * 0.04, 0.1, 'triangle', 0.12);
    });
  } else if (type === 'over') {
    [523, 466, 415, 349].forEach((f, i) => {
      playTone(f, t + i * 0.15, 0.3, 'sawtooth', 0.15);
    });
  } else if (type === 'levelup') {
    [523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, t + i * 0.06, 0.15, 'square', 0.12);
    });
  }
}

let nextLoopTime = 0, loopCount = 0;
function scheduleMusic() {
  if (!isPlaying) return;
  const now = audioCtx.currentTime;
  while (nextLoopTime < now + 1.5) {
    const ls = nextLoopTime;
    for (const [off, note, dur] of melody) {
      playTone(noteFreq[note], ls + off * BEAT, dur * 0.9, 'square', 0.08);
    }
    for (const [off, note, dur] of bass) {
      playTone(noteFreq[note], ls + off * BEAT, dur * BEAT * 0.8, 'triangle', 0.15);
    }
    for (let b = 0; b < 4; b++) {
      const bt = ls + b * BEAT;
      playDrum(bt, 'kick');
      playDrum(bt + BEAT * 0.5, 'snare');
      playDrum(bt, 'hat');
      playDrum(bt + BEAT * 0.5, 'hat');
    }
    nextLoopTime += LOOP;
    loopCount++;
    if (loopCount % 2 === 0 && tempoMul < 1.6) tempoMul = Math.min(1.6, tempoMul + 0.05);
  }
  setTimeout(scheduleMusic, 200);
}

function startMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  isPlaying = true;
  nextLoopTime = audioCtx.currentTime + 0.1;
  loopCount = 0;
  scheduleMusic();
}
function stopMusic() { isPlaying = false; }

function getBeatProgress() {
  if (!audioCtx || !isPlaying) return 0;
  const elapsed = (audioCtx.currentTime - musicStartTime) % (BAR / tempoMul);
  return elapsed / (BAR / tempoMul);
}

// ===== Game State =====
let state = 'START';
let score = 0, combo = 0, maxCombo = 0, perfectCount = 0;
let lives = 3, gameTime = 0;
let bestScore = parseInt(localStorage.getItem('beat-tap-best') || '0');
document.getElementById('best-display').textContent = bestScore;

const entities = [];
const popups = [];
const particles = [];
let shakeAmount = 0;
let flashColor = null, flashAlpha = 0;

// Western meme words
const MEME_WORDS = ['LET\'S GO!','POG!','SHEESH!','BET!','NO CAP!','COOKED!','RIZZ!','BASED!','LIT!','MID!','CRINGE!','SLAPS!'];
const COMBO_WORDS = {
  5: 'COMBO x5! WARMED UP!',
  10: 'COMBO x10! LOCKED IN!',
  20: 'COMBO x20! ARE YOU HUMAN?!',
  30: 'COMBO x30! UNSTOPPABLE!',
  50: 'COMBO x50! GOD MODE!!!',
  100: 'COMBO x100! LEGENDARY!!!',
};

// Character types — dancing characters
const TYPES = {
  dancer1: { img:'dancer1', score:1, life:1.8, weight:25 },
  dancer2: { img:'dancer2', score:1, life:1.8, weight:25 },
  dancer3: { img:'dancer3', score:1, life:1.8, weight:20 },
  star2:   { img:'star2',   score:5, life:1.2, weight:10 },
  bomb2:   { img:'bomb2',   score:0, life:1.8, weight:20 },
};

function pickType() {
  const total = Object.values(TYPES).reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const [k, t] of Object.entries(TYPES)) {
    r -= t.weight;
    if (r <= 0) return k;
  }
  return 'dancer1';
}

// ===== Spawn =====
let spawnTimer = 0;
function getSpawnInterval() {
  const base = 0.6;
  const speedup = Math.min(0.4, gameTime / 120);
  return (base - speedup) / tempoMul;
}

function spawnEntity() {
  const occupied = new Set(entities.map(e => `${e.col},${e.row}`));
  const free = [];
  for (let r = 0; r < gridRows; r++)
    for (let c = 0; c < gridCols; c++)
      if (!occupied.has(`${c},${r}`)) free.push({col:c, row:r});
  if (free.length === 0) return;

  const cell = free[Math.floor(Math.random() * free.length)];
  const type = pickType();
  const def = TYPES[type];
  entities.push({
    type, ...def,
    col: cell.col, row: cell.row,
    born: gameTime, maxLife: def.life,
    scale: 0, dead: false,
    danceOffset: Math.random() * Math.PI * 2, // unique dance phase
    danceSpeed: 8 + Math.random() * 6,
  });
}

// ===== Input =====
function handleTap(x, y) {
  if (state !== 'PLAYING') return;
  if (y < 70) return;
  const col = Math.floor(x / cellW);
  const row = Math.floor((y - 70) / cellH);
  if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return;
  const ent = entities.find(e => e.col === col && e.row === row && !e.dead);
  if (!ent) return;
  tapEntity(ent, x, y);
}

function tapEntity(ent, x, y) {
  if (ent.type === 'bomb2') {
    ent.dead = true;
    lives--;
    combo = 0;
    sfx('bomb');
    shakeAmount = 18;
    flashColor = '#ff0000'; flashAlpha = 0.6;
    addPopup(x, y, 'BOOM!', '#ff0000', 32);
    spawnParticles(x, y, '#ff0000', 15);
    updateLives();
    if (lives <= 0) gameOver();
    return;
  }

  const beatProg = getBeatProgress();
  const distToBeat = Math.min(beatProg, 1 - beatProg);
  const isPerfect = distToBeat < 0.12;

  ent.dead = true;
  combo++;
  if (combo > maxCombo) maxCombo = combo;

  const baseScore = ent.score;
  const mult = getComboMult();
  const gained = Math.round(baseScore * mult * (isPerfect ? 2 : 1));
  score += gained;
  perfectCount += isPerfect ? 1 : 0;

  if (isPerfect) {
    sfx('perfect');
    addPopup(x, y, `PERFECT +${gained}`, '#ffea00', 24);
    spawnParticles(x, y, '#ffea00', 12);
  } else {
    sfx('tap');
    addPopup(x, y, `+${gained}`, ent.type === 'star2' ? '#ffaa00' : '#00fff0', 20);
    spawnParticles(x, y, ent.type === 'star2' ? '#ffaa00' : '#00fff0', 8);
  }

  if (ent.type === 'star2') {
    sfx('star');
    flashColor = '#ffaa00'; flashAlpha = 0.3;
    spawnParticles(x, y, '#ffea00', 20);
  }

  // Meme popups
  if (combo >= 3 && Math.random() < 0.4) {
    const word = MEME_WORDS[Math.floor(Math.random() * MEME_WORDS.length)];
    addPopup(x + (Math.random()-0.5)*60, y - 40, word, '#ff2a6d', 22);
  }

  // Combo milestones
  if (COMBO_WORDS[combo]) {
    addPopup(W/2, H/2, COMBO_WORDS[combo], '#ff00ff', 30);
    flashColor = '#ff00ff'; flashAlpha = 0.4;
    sfx('levelup');
    showComboDisplay(combo);
  } else if (combo >= 3) {
    showComboDisplay(combo);
  }

  updateScore();
}

function getComboMult() {
  if (combo >= 50) return 3;
  if (combo >= 30) return 2.5;
  if (combo >= 20) return 2;
  if (combo >= 10) return 1.5;
  if (combo >= 5) return 1.2;
  return 1;
}

// ===== Effects =====
function addPopup(x, y, text, color, size) {
  popups.push({ x, y, text, color, size, life: 1, vy: -1.5 });
}
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1, color, size: 3 + Math.random()*4, life: 0.6 });
  }
}
function showComboDisplay(n) {
  const el = document.getElementById('combo-display');
  el.textContent = `COMBO x${n}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 800);
}
function updateScore() { document.getElementById('score-val').textContent = score; }
function updateLives() {
  const hearts = '❤'.repeat(Math.max(0, lives)) + '🤍'.repeat(Math.max(0, 3 - lives));
  document.getElementById('lives').textContent = hearts;
}

// ===== Render =====
function render(dt) {
  ctx.save();
  if (shakeAmount > 0) {
    ctx.translate((Math.random()-0.5)*shakeAmount, (Math.random()-0.5)*shakeAmount);
    shakeAmount *= 0.85;
  }

  ctx.fillStyle = '#0d0015';
  ctx.fillRect(-50, -50, W+100, H+100);

  // Beat glow
  const bp = getBeatProgress();
  const beatGlow = Math.max(0, 1 - bp * 2) * 0.15;
  if (beatGlow > 0) {
    ctx.fillStyle = `rgba(0,255,240,${beatGlow})`;
    ctx.fillRect(0, 70, W, H - 70);
  }

  // Draw entities with dance animation
  for (const e of entities) {
    if (e.dead) continue;
    const age = gameTime - e.born;
    const lifeRatio = age / e.maxLife;
    // Spawn animation
    if (age < 0.2) e.scale = age / 0.2;
    else e.scale = 1;
    if (lifeRatio > 0.8) e.scale = (1 - lifeRatio) / 0.2;

    const cx = e.col * cellW + cellW / 2;
    const cy = 70 + e.row * cellH + cellH / 2;
    const baseSize = Math.min(cellW, cellH) * 0.65 * e.scale;

    // ===== DANCE ANIMATION =====
    const dancePhase = gameTime * e.danceSpeed + e.danceOffset;
    const isBomb = e.type === 'bomb2';
    const isStar = e.type === 'star2';
    const dSpeed = isBomb ? 0.3 : 1; // bombs don't dance

    // Big hop bounce
    const bounceY = isBomb ? 0 : Math.abs(Math.sin(dancePhase)) * 18;
    // Wild body tilt
    const tilt = isBomb ? 0 : Math.sin(dancePhase * 0.7) * 0.3;
    // Strong squash & stretch
    const stretch = 1 + Math.sin(dancePhase * 2) * 0.15;
    // Horizontal wiggle
    const wiggleX = isBomb ? 0 : Math.sin(dancePhase * 1.3) * 6;
    // Spin for star
    const spin = isStar ? gameTime * 3 : 0;
    // Quick shake on beat hit
    const beatShake = isBomb ? 0 : Math.sin(dancePhase * 4) * 0.05;

    ctx.save();
    ctx.translate(cx + wiggleX, cy - bounceY);
    ctx.rotate(tilt + spin + beatShake);
    ctx.scale(stretch, 1 / stretch);
    ctx.scale(e.scale, e.scale);

    // Glow
    if (isBomb) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20; }
    else if (e.type === 'star2') { ctx.shadowColor = '#ffea00'; ctx.shadowBlur = 25; }
    else { ctx.shadowColor = '#00fff0'; ctx.shadowBlur = 12; }

    const sz = baseSize;
    if (IMG[e.img] && IMG[e.img].complete) {
      ctx.drawImage(IMG[e.img], -sz/2, -sz/2, sz, sz);
    }
    ctx.restore();

    // Life circle
    if (lifeRatio > 0.3) {
      ctx.strokeStyle = isBomb ? 'rgba(255,0,0,0.4)' : 'rgba(0,255,240,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, baseSize * 0.55, -Math.PI/2, -Math.PI/2 + (1 - lifeRatio) * Math.PI * 2);
      ctx.stroke();
    }
  }

  // Particles
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Popups
  for (const p of popups) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.font = `bold ${p.size}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Flash
  if (flashAlpha > 0 && flashColor) {
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashAlpha *= 0.85;
  }
}

// ===== Update =====
function update(dt) {
  if (state !== 'PLAYING') return;
  gameTime += dt;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEntity();
    spawnTimer = getSpawnInterval();
  }

  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    const age = gameTime - e.born;
    if (age >= e.maxLife && !e.dead) {
      if (e.type !== 'bomb2') combo = 0;
      e.dead = true;
    }
    if (e.dead) entities.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.3;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y += p.vy; p.vy *= 0.95;
    p.life -= dt * 1.5;
    if (p.life <= 0) popups.splice(i, 1);
  }

  const bp = getBeatProgress();
  document.getElementById('beat-pulse').style.transform = `scaleX(${bp})`;
}

// ===== Main Loop =====
let lastTime = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastTime) / 1000, 0.05);
  lastTime = t;
  update(dt);
  render(dt);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });

// ===== Leaderboard System =====
// Fake competitors that update over time
const LB_NAMES = [
  {name:'xX_GamerKing_Xx', flag:'🇺🇸', base:95},
  {name:'VibeChkBr0', flag:'🇬🇧', base:88},
  {name:'DiscoSt4r', flag:'🇨🇦', base:82},
  {name:'FlossMaster', flag:'🇦🇺', base:76},
  {name:'Rizzler_69', flag:'🇺🇸', base:70},
  {name:'BasedGod', flag:'🇩🇪', base:64},
  {name:'NoCapBro', flag:'🇫🇷', base:58},
  {name:'TouchGrass', flag:'🇯🇵', base:52},
  {name:'SLAY_queen', flag:'🇧🇷', base:46},
  {name:'DogLover42', flag:'🇮🇹', base:40},
  {name:'CringeLORD', flag:'🇪🇸', base:34},
  {name:'MidDiff', flag:'🇰🇷', base:28},
];

function getLeaderboard() {
  // Scores drift over time for "live" feel
  const now = Date.now();
  const scores = LB_NAMES.map(e => ({
    name: e.name,
    flag: e.flag,
    score: Math.round(e.base + Math.sin(now / 50000 + e.base) * 5 + (now / 1000000) % 3),
  }));
  // Add player's best
  if (bestScore > 0) {
    scores.push({ name: 'YOU', flag: '🎮', score: bestScore, you: true });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function showLeaderboard() {
  const lb = getLeaderboard();
  const list = document.getElementById('lb-list');
  list.innerHTML = '';
  lb.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row' + (entry.you ? ' you' : '');
    const rankClass = i < 3 ? `r${i+1}` : '';
    row.innerHTML = `
      <div class="lb-rank ${rankClass}">${i+1}</div>
      <div class="lb-flag">${entry.flag}</div>
      <div class="lb-name">${entry.name}</div>
      <div class="lb-score">${entry.score}</div>
    `;
    list.appendChild(row);
  });
  document.getElementById('lb-screen').classList.remove('hidden');
}

function getPlayerRank() {
  const lb = getLeaderboard();
  const idx = lb.findIndex(e => e.you);
  return idx >= 0 ? idx + 1 : lb.length + 1;
}

// ===== Game Flow =====
function startGame() {
  state = 'PLAYING';
  score = 0; combo = 0; maxCombo = 0; perfectCount = 0;
  lives = 3; gameTime = 0; tempoMul = 1;
  entities.length = 0; popups.length = 0; particles.length = 0;
  spawnTimer = 0.5;

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('over-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('beat-bar').classList.remove('hidden');
  document.getElementById('leaderboard-btn-game').classList.remove('hidden');

  updateScore(); updateLives();

  initAudio();
  musicStartTime = audioCtx.currentTime + 0.1;
  startMusic();
}

function gameOver() {
  state = 'OVER';
  stopMusic();
  sfx('over');

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('beat-tap-best', bestScore);
    document.getElementById('best-display').textContent = bestScore;
  }

  const rank = getRank(score);
  document.getElementById('final-score').textContent = score;
  document.getElementById('over-emoji').textContent = rank.emoji;
  document.getElementById('rank-title').textContent = rank.title;
  document.getElementById('rank-desc').textContent = rank.desc;
  document.getElementById('over-combo').textContent = maxCombo;
  document.getElementById('over-perfect').textContent = perfectCount;
  document.getElementById('over-rank').textContent = '#' + getPlayerRank();

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('beat-bar').classList.add('hidden');
  document.getElementById('leaderboard-btn-game').classList.add('hidden');
  setTimeout(() => document.getElementById('over-screen').classList.remove('hidden'), 600);
}

function getRank(s) {
  if (s <= 5)   return { emoji:'🐌', title:'SLOTH MODE', desc:'Bro is playing in slow motion' };
  if (s <= 15)  return { emoji:'🧓', title:'BOOMER', desc:'Try turning off your monitor next time' };
  if (s <= 30)  return { emoji:'😐', title:'MID', desc:'Absolutely average. Respect.' };
  if (s <= 50)  return { emoji:'😎', title:'CHAD', desc:'Decent fingers, not gonna lie' };
  if (s <= 80)  return { emoji:'🔥', title:'CRACKED', desc:'Are you cheating? For real?' };
  if (s <= 120) return { emoji:'👽', title:'ALIEN', desc:"This ain't your first rodeo" };
  return { emoji:'🌌', title:'GOAT', desc:'Touch grass. Touch it NOW.' };
}

// ===== Share Card =====
function generateShareCard() {
  const sc = document.getElementById('share-canvas');
  const sx = sc.getContext('2d');
  const rank = getRank(score);

  const grad = sx.createLinearGradient(0, 0, 0, 800);
  grad.addColorStop(0, '#1a0033'); grad.addColorStop(0.5, '#0d0015'); grad.addColorStop(1, '#1a0033');
  sx.fillStyle = grad; sx.fillRect(0, 0, 600, 800);

  sx.fillStyle = 'rgba(255,42,109,0.1)';
  sx.beginPath(); sx.arc(300, 150, 200, 0, Math.PI*2); sx.fill();
  sx.fillStyle = 'rgba(0,255,240,0.08)';
  sx.beginPath(); sx.arc(300, 650, 180, 0, Math.PI*2); sx.fill();

  sx.font = 'bold 52px Impact, Arial Black, sans-serif';
  sx.textAlign = 'center';
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#ff2a6d'; sx.lineWidth = 3;
  sx.strokeText('BEAT TAP', 300, 80);
  sx.fillText('BEAT TAP', 300, 80);

  sx.font = '100px sans-serif';
  sx.fillText(rank.emoji, 300, 220);

  sx.font = 'bold 28px Arial';
  sx.fillStyle = '#9090b0';
  sx.fillText('MY SCORE', 300, 300);

  sx.font = 'bold 90px Impact, Arial Black';
  sx.fillStyle = '#ffea00';
  sx.strokeStyle = '#ff2a6d'; sx.lineWidth = 4;
  sx.strokeText(score, 300, 390);
  sx.fillText(score, 300, 390);

  sx.font = 'bold 40px Impact, Arial Black';
  sx.fillStyle = '#00fff0';
  sx.strokeStyle = '#000'; sx.lineWidth = 3;
  sx.strokeText(rank.title, 300, 470);
  sx.fillText(rank.title, 300, 470);

  sx.font = '24px Arial';
  sx.fillStyle = '#ccc';
  sx.fillText(rank.desc, 300, 510);

  sx.font = '20px Arial';
  sx.fillStyle = '#9090b0';
  sx.fillText(`MAX COMBO ${maxCombo}  |  PERFECTS ${perfectCount}`, 300, 560);

  if (score >= bestScore) {
    sx.font = 'bold 28px Impact';
    sx.fillStyle = '#ff2a6d';
    sx.fillText('★ NEW RECORD ★', 300, 620);
  } else {
    sx.font = '20px Arial';
    sx.fillStyle = '#606080';
    sx.fillText(`Best: ${bestScore}`, 300, 620);
  }

  sx.font = 'bold 26px Impact, Arial Black';
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#00fff0'; sx.lineWidth = 2;
  sx.strokeText('Can you beat my score?', 300, 720);
  sx.fillText('Can you beat my score?', 300, 720);

  sx.font = '18px Arial';
  sx.fillStyle = '#00fff0';
  sx.fillText('Play BEAT TAP now!', 300, 760);
}

// ===== Event Bindings =====
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  handleTap(e.clientX - rect.left, e.clientY - rect.top);
});

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

document.getElementById('leaderboard-btn-start').addEventListener('click', showLeaderboard);
document.getElementById('leaderboard-btn-game').addEventListener('click', showLeaderboard);
document.getElementById('leaderboard-btn-over').addEventListener('click', showLeaderboard);
document.getElementById('lb-close-btn').addEventListener('click', () => {
  document.getElementById('lb-screen').classList.add('hidden');
});

document.getElementById('share-btn').addEventListener('click', () => {
  generateShareCard();
  document.getElementById('share-overlay').classList.remove('hidden');
});
document.getElementById('share-close-btn').addEventListener('click', () => {
  document.getElementById('share-overlay').classList.add('hidden');
});
