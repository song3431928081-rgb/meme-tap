// ===== 魔性拍拍 — 节奏反应 meme 游戏 =====

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ----- 图片预加载 -----
const IMG = {};
['cat', 'bomb', 'star'].forEach(name => {
  const img = new Image();
  img.src = `assets/${name}.jpg`;
  IMG[name] = img;
});

// ----- 画布自适应 -----
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
  cellH = (H - 80) / gridRows; // 留出顶部HUD空间
}
window.addEventListener('resize', resize);
resize();

// ===== 音频引擎（洗脑 BGM）=====
let audioCtx = null;
let musicGain = null;
let isPlaying = false;
let musicStartTime = 0;
const BPM = 130;
const BEAT = 60 / BPM; // 秒/拍
const BAR = BEAT * 4;  // 4拍一小节
const LOOP = BAR * 4;  // 4小节循环

// 洗脑旋律（C大调，简单上头）
const melody = [
  // 第1小节 C-E-G-E
  [0,'C5',0.25],[0.25,'E5',0.25],[0.5,'G5',0.25],[0.75,'E5',0.25],
  // 第2小节 F-A-C-A
  [1,'F5',0.25],[1.25,'A5',0.25],[1.5,'C6',0.25],[1.75,'A5',0.25],
  // 第3小节 G-B-D-B
  [2,'G5',0.25],[2.25,'B5',0.25],[2.5,'D6',0.25],[2.75,'B5',0.25],
  // 第4小节 C-E-G-C(高)
  [3,'C6',0.25],[3.25,'E6',0.25],[3.5,'G6',0.25],[3.75,'C7',0.25],
];
const bass = [
  [0,'C3',1],[1,'F3',1],[2,'G3',1],[3,'C3',1],
];
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
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(g); g.connect(musicGain);
  osc.start(time);
  osc.stop(time + dur);
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
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
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
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.08, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.connect(g); g.connect(musicGain);
    src.start(time);
  }
}

// 音效
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

// 音乐调度
let nextLoopTime = 0;
let loopCount = 0;
let scheduledNotes = [];

function scheduleMusic() {
  if (!isPlaying) return;
  const now = audioCtx.currentTime;
  // 提前调度下一个小节
  while (nextLoopTime < now + 1.5) {
    const loopStart = nextLoopTime;
    // 旋律
    for (const [offset, note, dur] of melody) {
      const t = loopStart + offset * BEAT;
      playTone(noteFreq[note], t, dur * 0.9, 'square', 0.08);
    }
    // 贝斯
    for (const [offset, note, dur] of bass) {
      const t = loopStart + offset * BEAT;
      playTone(noteFreq[note], t, dur * BEAT * 0.8, 'triangle', 0.15);
    }
    // 鼓
    for (let b = 0; b < 4; b++) {
      const bt = loopStart + b * BEAT;
      playDrum(bt, 'kick');
      playDrum(bt + BEAT * 0.5, 'snare');
      playDrum(bt, 'hat');
      playDrum(bt + BEAT * 0.5, 'hat');
    }
    nextLoopTime += LOOP;
    loopCount++;
    // 随循环加速
    if (loopCount % 2 === 0 && tempoMul < 1.6) {
      tempoMul = Math.min(1.6, tempoMul + 0.05);
    }
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

// 获取当前节拍位置（0-1 在一小节内）
function getBeatProgress() {
  if (!audioCtx || !isPlaying) return 0;
  const elapsed = (audioCtx.currentTime - musicStartTime) % (BAR / tempoMul);
  return elapsed / (BAR / tempoMul);
}

// ===== 游戏状态 =====
let state = 'START';
let score = 0, combo = 0, maxCombo = 0, perfectCount = 0;
let lives = 3;
let gameTime = 0;
let tempoMul = 1;
let bestScore = parseInt(localStorage.getItem('meme-tap-best') || '0');
document.getElementById('best-display').textContent = bestScore;

const entities = [];   // 网格上的角色
const popups = [];     // 飘字
const particles = [];  // 粒子
let shakeAmount = 0;
let flashColor = null;
let flashAlpha = 0;

// meme 弹幕词
const MEME_WORDS = ['好家伙!','离谱!','妙啊!','芜湖!','起飞!','炸裂!','绝了!','牛逼!','天秀!','离大谱!'];
const COMBO_WORDS = {
  5: '连击×5! 热身完毕!',
  10: '连击×10! 火力全开!',
  20: '连击×20! 你是外星人吧!',
  30: '连击×30! 停不下来!',
  50: '连击×50! 神之手速!',
  100: '连击×100! 传说降临!!!',
};

// 角色类型
const TYPES = {
  cat:   { img:'cat',   score:1,  life:1.8, weight:70 },
  star:  { img:'star',  score:5,  life:1.2, weight:10 },
  bomb:  { img:'bomb',  score:0,  life:1.8, weight:20 },
};

function pickType() {
  const total = Object.values(TYPES).reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const [k, t] of Object.entries(TYPES)) {
    r -= t.weight;
    if (r <= 0) return k;
  }
  return 'cat';
}

// ===== 生成角色 =====
let spawnTimer = 0;
function getSpawnInterval() {
  const base = 0.6;
  const speedup = Math.min(0.4, gameTime / 120);
  return (base - speedup) / tempoMul;
}

function spawnEntity() {
  // 找空格子
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
    born: gameTime,
    maxLife: def.life,
    scale: 0,
    dead: false,
  });
}

// ===== 输入 =====
function handleTap(x, y) {
  if (state !== 'PLAYING') return;
  // 排除HUD区域
  if (y < 70) return;

  const col = Math.floor(x / cellW);
  const row = Math.floor((y - 70) / cellH);
  if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return;

  // 找到对应格子的角色
  const ent = entities.find(e => e.col === col && e.row === row && !e.dead);
  if (!ent) return; // 空拍不惩罚

  tapEntity(ent, x, y);
}

function tapEntity(ent, x, y) {
  if (ent.type === 'bomb') {
    // 拍到炸弹
    ent.dead = true;
    lives--;
    combo = 0;
    sfx('bomb');
    shakeAmount = 18;
    flashColor = '#ff0000'; flashAlpha = 0.6;
    addPopup(x, y, '砰!', '#ff0000', 32);
    spawnParticles(x, y, '#ff0000', 15);
    updateLives();
    if (lives <= 0) gameOver();
    return;
  }

  // 判定 PERFECT/GOOD（基于节拍）
  const beatProg = getBeatProgress();
  const distToBeat = Math.min(beatProg, 1 - beatProg); // 离最近拍点的距离
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
    addPopup(x, y, `+${gained}`, ent.type === 'star' ? '#ffaa00' : '#00fff0', 20);
    spawnParticles(x, y, ent.type === 'star' ? '#ffaa00' : '#00fff0', 8);
  }

  if (ent.type === 'star') {
    sfx('star');
    flashColor = '#ffaa00'; flashAlpha = 0.3;
    spawnParticles(x, y, '#ffea00', 20);
  }

  // meme弹幕
  if (combo >= 3 && Math.random() < 0.4) {
    const word = MEME_WORDS[Math.floor(Math.random() * MEME_WORDS.length)];
    addPopup(x + (Math.random()-0.5)*60, y - 40, word, '#ff2a6d', 22);
  }

  // 连击里程碑
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

// ===== 特效 =====
function addPopup(x, y, text, color, size) {
  popups.push({ x, y, text, color, size, life: 1, vy: -1.5 });
}
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 5;
    particles.push({
      x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1,
      color, size: 3 + Math.random()*4, life: 0.6,
    });
  }
}

function showComboDisplay(n) {
  const el = document.getElementById('combo-display');
  el.textContent = `COMBO ×${n}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 800);
}

function updateScore() {
  document.getElementById('score-val').textContent = score;
}
function updateLives() {
  const hearts = '❤'.repeat(Math.max(0, lives)) + '🤍'.repeat(Math.max(0, 3 - lives));
  document.getElementById('lives').textContent = hearts;
}

// ===== 渲染 =====
function render(dt) {
  ctx.save();

  // 屏幕震动
  if (shakeAmount > 0) {
    ctx.translate((Math.random()-0.5)*shakeAmount, (Math.random()-0.5)*shakeAmount);
    shakeAmount *= 0.85;
  }

  // 背景
  ctx.fillStyle = '#0d0015';
  ctx.fillRect(-50, -50, W+100, H+100);

  // 网格线
  ctx.strokeStyle = 'rgba(106,42,255,0.1)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= gridCols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 70);
    ctx.lineTo(c * cellW, H);
    ctx.stroke();
  }
  for (let r = 0; r <= gridRows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, 70 + r * cellH);
    ctx.lineTo(W, 70 + r * cellH);
    ctx.stroke();
  }

  // 节拍背景脉冲
  const bp = getBeatProgress();
  const beatGlow = Math.max(0, 1 - bp * 2) * 0.15;
  if (beatGlow > 0) {
    ctx.fillStyle = `rgba(0,255,240,${beatGlow})`;
    ctx.fillRect(0, 70, W, H - 70);
  }

  // 绘制角色
  for (const e of entities) {
    if (e.dead) continue;
    const age = gameTime - e.born;
    const lifeRatio = age / e.maxLife;
    // 出生动画
    if (age < 0.2) e.scale = age / 0.2;
    else e.scale = 1;
    // 消失前缩小
    if (lifeRatio > 0.8) e.scale = (1 - lifeRatio) / 0.2;

    const cx = e.col * cellW + cellW / 2;
    const cy = 70 + e.row * cellH + cellH / 2;
    const size = Math.min(cellW, cellH) * 0.65 * e.scale;

    ctx.save();
    ctx.translate(cx, cy);
    // 节拍呼吸
    const breathe = 1 + Math.sin(gameTime * 8) * 0.04;
    ctx.scale(breathe, breathe);

    // 阴影/发光
    if (e.type === 'bomb') {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
    } else if (e.type === 'star') {
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 25;
    } else {
      ctx.shadowColor = '#00fff0';
      ctx.shadowBlur = 12;
    }

    // 画图片
    if (IMG[e.img] && IMG[e.img].complete) {
      ctx.drawImage(IMG[e.img], -size/2, -size/2, size, size);
    }
    ctx.restore();

    // 生命圈（倒计时）
    if (lifeRatio > 0.3) {
      ctx.strokeStyle = e.type === 'bomb' ? 'rgba(255,0,0,0.4)' : 'rgba(0,255,240,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.55, -Math.PI/2, -Math.PI/2 + (1 - lifeRatio) * Math.PI * 2);
      ctx.stroke();
    }
  }

  // 粒子
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 飘字
  for (const p of popups) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.font = `bold ${p.size}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // 闪屏
  if (flashAlpha > 0 && flashColor) {
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashAlpha *= 0.85;
  }
}

// ===== 更新 =====
function update(dt) {
  if (state !== 'PLAYING') return;
  gameTime += dt;

  // 生成角色
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEntity();
    spawnTimer = getSpawnInterval();
  }

  // 角色超时
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    const age = gameTime - e.born;
    if (age >= e.maxLife && !e.dead) {
      if (e.type !== 'bomb') {
        // 漏掉非炸弹 → 断连击
        combo = 0;
      }
      e.dead = true;
    }
    if (e.dead) entities.splice(i, 1);
  }

  // 粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.3;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // 飘字
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y += p.vy; p.vy *= 0.95;
    p.life -= dt * 1.5;
    if (p.life <= 0) popups.splice(i, 1);
  }

  // 节拍指示器
  const bp = getBeatProgress();
  document.getElementById('beat-pulse').style.transform = `scaleX(${bp})`;
}

// ===== 主循环 =====
let lastTime = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastTime) / 1000, 0.05);
  lastTime = t;
  update(dt);
  render(dt);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });

// ===== 游戏流程 =====
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
    localStorage.setItem('meme-tap-best', bestScore);
  }

  // 排名
  const rank = getRank(score);
  document.getElementById('final-score').textContent = score;
  document.getElementById('over-emoji').textContent = rank.emoji;
  document.getElementById('rank-title').textContent = rank.title;
  document.getElementById('rank-desc').textContent = rank.desc;
  document.getElementById('over-combo').textContent = maxCombo;
  document.getElementById('over-perfect').textContent = perfectCount;

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('beat-bar').classList.add('hidden');
  setTimeout(() => {
    document.getElementById('over-screen').classList.remove('hidden');
  }, 600);
}

function getRank(s) {
  if (s <= 5)   return { emoji:'🐌', title:'树懒本懒', desc:'你确定你不是慢动作回放？' };
  if (s <= 15)  return { emoji:'👴', title:'老年人反应', desc:'建议去公园下棋' };
  if (s <= 30)  return { emoji:'😐', title:'普通人类', desc:'就...挺普通的' };
  if (s <= 50)  return { emoji:'😎', title:'单身二十年', desc:'手速还行嘛' };
  if (s <= 80)  return { emoji:'🔥', title:'反应达人', desc:'你开挂了吧？' };
  if (s <= 120) return { emoji:'👽', title:'外星人手速', desc:'地球不适合你' };
  return { emoji:'🌌', title:'超越时空', desc:'你不是人类吧？' };
}

// ===== 分享功能 =====
function generateShareCard() {
  const sc = document.getElementById('share-canvas');
  const sx = sc.getContext('2d');
  const rank = getRank(score);

  // 背景渐变
  const grad = sx.createLinearGradient(0, 0, 0, 800);
  grad.addColorStop(0, '#1a0033');
  grad.addColorStop(0.5, '#0d0015');
  grad.addColorStop(1, '#1a0033');
  sx.fillStyle = grad;
  sx.fillRect(0, 0, 600, 800);

  // 装饰圆
  sx.fillStyle = 'rgba(255,42,109,0.1)';
  sx.beginPath(); sx.arc(300, 150, 200, 0, Math.PI*2); sx.fill();
  sx.fillStyle = 'rgba(0,255,240,0.08)';
  sx.beginPath(); sx.arc(300, 650, 180, 0, Math.PI*2); sx.fill();

  // 标题
  sx.font = 'bold 52px Impact, Arial Black, sans-serif';
  sx.textAlign = 'center';
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#ff2a6d'; sx.lineWidth = 3;
  sx.strokeText('魔性拍拍', 300, 80);
  sx.fillText('魔性拍拍', 300, 80);

  // emoji
  sx.font = '100px sans-serif';
  sx.fillText(rank.emoji, 300, 220);

  // 分数
  sx.font = 'bold 28px Arial';
  sx.fillStyle = '#9090b0';
  sx.fillText('我的分数', 300, 300);

  sx.font = 'bold 90px Impact, Arial Black';
  sx.fillStyle = '#ffea00';
  sx.strokeStyle = '#ff2a6d'; sx.lineWidth = 4;
  sx.strokeText(score, 300, 390);
  sx.fillText(score, 300, 390);

  // 排名标题
  sx.font = 'bold 40px Impact, Arial Black';
  sx.fillStyle = '#00fff0';
  sx.strokeStyle = '#000'; sx.lineWidth = 3;
  sx.strokeText(rank.title, 300, 470);
  sx.fillText(rank.title, 300, 470);

  // 排名描述
  sx.font = '24px Arial';
  sx.fillStyle = '#ccc';
  sx.fillText(rank.desc, 300, 510);

  // 统计
  sx.font = '20px Arial';
  sx.fillStyle = '#9090b0';
  sx.fillText(`最高连击 ${maxCombo}  |  PERFECT ${perfectCount}`, 300, 560);

  // 最高纪录
  if (score >= bestScore) {
    sx.font = 'bold 28px Impact';
    sx.fillStyle = '#ff2a6d';
    sx.fillText('★ 新纪录 ★', 300, 620);
  } else {
    sx.font = '20px Arial';
    sx.fillStyle = '#606080';
    sx.fillText(`最高纪录: ${bestScore}`, 300, 620);
  }

  // CTA
  sx.font = 'bold 26px Impact, Arial Black';
  sx.fillStyle = '#fff';
  sx.strokeStyle = '#00fff0'; sx.lineWidth = 2;
  sx.strokeText('来挑战你的手速极限！', 300, 720);
  sx.fillText('来挑战你的手速极限！', 300, 720);

  // 网址
  sx.font = '18px Arial';
  sx.fillStyle = '#00fff0';
  sx.fillText('搜索「魔性拍拍」开始游戏', 300, 760);
}

// ===== 事件绑定 =====
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  handleTap(e.clientX - rect.left, e.clientY - rect.top);
});

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

document.getElementById('share-btn').addEventListener('click', () => {
  generateShareCard();
  document.getElementById('share-overlay').classList.remove('hidden');
});
document.getElementById('share-close-btn').addEventListener('click', () => {
  document.getElementById('share-overlay').classList.add('hidden');
});
