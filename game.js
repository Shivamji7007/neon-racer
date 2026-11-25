const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('carPreviewCanvas');
const pCtx = previewCanvas.getContext('2d');

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch (_) {} },
};

const dotsBtn = document.getElementById('dotsBtn');
const dotsMenu = document.getElementById('dotsMenu');
const menuResume = document.getElementById('menuResume');
const menuRestart = document.getElementById('menuRestart');
const menuRaceDivider = document.getElementById('menuRaceDivider');
const menu1P = document.getElementById('menu1P');
const menu2P = document.getElementById('menu2P');
const menuOnline = document.getElementById('menuOnline');
const menuGarage = document.getElementById('menuGarage');
const menuRanks = document.getElementById('menuRanks');
const menuSound = document.getElementById('menuSound');
const menuHomeDivider = document.getElementById('menuHomeDivider');
const menuHome = document.getElementById('menuHome');

const startOverlay = document.getElementById('startOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const garageOverlay = document.getElementById('garageOverlay');
const ranksOverlay = document.getElementById('ranksOverlay');
const onlineOverlay = document.getElementById('onlineOverlay');

const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseRestartBtn = document.getElementById('pauseRestartBtn');
const pauseHomeBtn = document.getElementById('pauseHomeBtn');
const goRestartBtn = document.getElementById('goRestartBtn');
const goHomeBtn = document.getElementById('goHomeBtn');

const openGarageBtn = document.getElementById('openGarageBtn');
const closeGarageBtn = document.getElementById('closeGarageBtn');
const openRanksBtn = document.getElementById('openRanksBtn');
const closeRanksBtn = document.getElementById('closeRanksBtn');
const openOnlineBtn = document.getElementById('openOnlineBtn');
const closeOnlineBtn = document.getElementById('closeOnlineBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const copyCodeBtn = document.getElementById('copyCodeBtn');

const p1ScoreEl = document.getElementById('p1Score');
const p2ScoreEl = document.getElementById('p2Score');
const p2ScoreBox = document.getElementById('p2ScoreBox');
const coinsHudEl = document.getElementById('coinsHud');
const homeCoinsPill = document.getElementById('homeCoinsPill');
const bestEl = document.getElementById('best');
const p1NitroEl = document.getElementById('p1Nitro');
const p2NitroEl = document.getElementById('p2Nitro');
const p2NitroBox = document.getElementById('p2NitroBox');
const envLabelEl = document.getElementById('envLabel');
const activeCarNameEl = document.getElementById('activeCarName');
const driverNameInput = document.getElementById('driverNameInput');

let ROAD_LEFT = 141;
let LANES = 7;
let ROAD_WIDTH = 546;
let LANE_WIDTH = 78;

const isShown = (el) => getComputedStyle(el).display !== 'none';
let mode = '1p';
const isOnline = () => mode === 'host' || mode === 'guest';
const onlineRaceActive = () => isOnline() && gameStarted && !state.gameOver;

function applyRoadLayout(forcedLanes = null) {
  if (isOnline()) {
    LANES = forcedLanes || 5;
  } else {
    const isMobilePortrait = document.documentElement.getAttribute('data-input') === 'touch' && window.innerHeight >= window.innerWidth;
    LANES = forcedLanes || (isMobilePortrait ? 4 : 7);
  }
  LANE_WIDTH = 78;
  ROAD_WIDTH = LANES * LANE_WIDTH;
  ROAD_LEFT = LANES >= 7 ? 141 : 54;
  canvas.width = ROAD_LEFT * 2 + ROAD_WIDTH;
  const aspectVal = (canvas.width / canvas.height).toFixed(4);
  document.documentElement.style.setProperty('--aspect', aspectVal);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('button');
  if (b) b.blur();
});

function closeDotsMenu() {
  dotsMenu.style.display = 'none';
}

dotsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = dotsMenu.style.display === 'flex';
  if (isOpen) {
    closeDotsMenu();
  } else {
    if (gameStarted && !state.gameOver && !paused && !isOnline()) {
      paused = true;
      if (engineGain) engineGain.gain.value = 0;
      pauseOverlay.style.display = 'flex';
    }
    syncTopNavState();
    dotsMenu.style.display = 'flex';
  }
});

document.addEventListener('click', (e) => {
  if (!dotsMenu.contains(e.target) && e.target !== dotsBtn) {
    closeDotsMenu();
  }
});

let driverName = store.get('highwayRushDriver', 'Shivam');
driverNameInput.value = driverName;
driverNameInput.addEventListener('input', () => {
  driverName = driverNameInput.value.trim() || 'Driver';
  store.set('highwayRushDriver', driverName);
});

let leaderboard = [];
try {
  const savedLb = JSON.parse(store.get('highwayRushLeaderboard', '[]'));
  if (Array.isArray(savedLb)) leaderboard = savedLb.filter((e) => e && typeof e === 'object');
} catch (_) {}

function recordLeaderboardScore(name, carName, distKm, score) {
  if (score <= 0) return;
  leaderboard.push({
    name: (name || 'Driver').slice(0, 14),
    car: carName,
    dist: `${Math.floor(distKm)} km`,
    score: Math.floor(score),
  });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 5);
  store.set('highwayRushLeaderboard', JSON.stringify(leaderboard));
}

function renderLeaderboard() {
  const body = document.getElementById('ranksBody');
  body.innerHTML = '';
  if (leaderboard.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.style.color = '#8b949e';
    td.style.padding = '18px';
    td.textContent = 'No races recorded yet. Finish a run to set a record!';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  leaderboard.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
    const cells = [
      { text: medal, color: '#f0f6fc', bold: true },
      { text: entry.name, color: '#f0f6fc', bold: true },
      { text: entry.car, color: '#8b949e', bold: false },
      { text: entry.dist, color: '#3fb950', bold: false },
      { text: String(entry.score), color: '#ffa657', bold: true },
    ];
    cells.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = c.text;
      td.style.color = c.color;
      if (c.bold) td.style.fontWeight = '700';
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

const CARS = [
  { id: 'swift',  name: 'Swift GT',        tag: 'Balanced Starter',   cost: 0,    speedBonus: 0.0, handling: 6.6, nitroDrain: 0.65, nitroRegen: 0.22, bodyStyle: 'hatch', spdPct: 60, hndPct: 68, nitPct: 60 },
  { id: 'verna',  name: 'Verna Turbo',     tag: 'Fast Highway Sedan', cost: 250,  speedBonus: 0.7, handling: 7.4, nitroDrain: 0.58, nitroRegen: 0.25, bodyStyle: 'sedan', spdPct: 76, hndPct: 78, nitPct: 70 },
  { id: 'thar',   name: 'Thar 4x4',        tag: 'Heavy Nitro SUV',    cost: 600,  speedBonus: 1.1, handling: 7.1, nitroDrain: 0.45, nitroRegen: 0.30, bodyStyle: 'suv',   spdPct: 82, hndPct: 72, nitPct: 92 },
  { id: 'bharat', name: 'BHARAT Hyper-EV', tag: 'Prototype Supercar', cost: 1200, speedBonus: 1.8, handling: 8.4, nitroDrain: 0.42, nitroRegen: 0.34, bodyStyle: 'hyper', spdPct: 98, hndPct: 95, nitPct: 96 },
];

const rawCoins = Number(store.get('highwayRushCoins', 0));
let totalCoins = Number.isFinite(rawCoins) && rawCoins >= 0 ? rawCoins : 0;

let unlockedCars = ['swift'];
try {
  const savedUnlocked = JSON.parse(store.get('highwayRushUnlocked', '["swift"]'));
  if (Array.isArray(savedUnlocked)) unlockedCars = savedUnlocked;
} catch (_) {}
unlockedCars = unlockedCars.filter((id) => CARS.some((c) => c.id === id));
if (!unlockedCars.includes('swift')) unlockedCars.unshift('swift');

let equippedCarId = store.get('highwayRushEquipped', 'swift');
if (!unlockedCars.includes(equippedCarId)) equippedCarId = 'swift';

let selectedColor = '#2f81f7';

function getCarSpec(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

function renderCarPreviewCard() {
  const spec = getCarSpec(equippedCarId);
  activeCarNameEl.textContent = spec.name;
  document.getElementById('prevSpdBar').style.width = `${spec.spdPct}%`;
  document.getElementById('prevHndBar').style.width = `${spec.hndPct}%`;
  document.getElementById('prevNitBar').style.width = `${spec.nitPct}%`;

  pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pCtx.fillStyle = '#161b22';
  pCtx.fillRect(0, 0, 64, 84);
  pCtx.strokeStyle = 'rgba(255,255,255,0.18)';
  pCtx.setLineDash([8, 8]);
  pCtx.beginPath(); pCtx.moveTo(32, 0); pCtx.lineTo(32, 84); pCtx.stroke();
  pCtx.setLineDash([]);

  const grad = pCtx.createLinearGradient(32, 22, 32, 0);
 pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pCtx.fillStyle = '#090c10';
  pCtx.fillRect(0, 0, 64, 60);
  pCtx.strokeStyle = 'rgba(255,255,255,0.18)';
  pCtx.setLineDash([6, 6]);
  pCtx.beginPath(); pCtx.moveTo(32, 0); pCtx.lineTo(32, 60); pCtx.stroke();
  pCtx.setLineDash([]);

  const grad = pCtx.createLinearGradient(32, 12, 32, 0);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.38)');
  grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  pCtx.fillStyle = grad;
  pCtx.beginPath();
  pCtx.moveTo(20, 12); pCtx.lineTo(8, 0); pCtx.lineTo(56, 0); pCtx.lineTo(44, 12);
  pCtx.fill();

  const w = spec.bodyStyle === 'suv' ? 30 : 28;
  const h = 42;
  const x = (64 - w) / 2;
  const y = 11;
  } else if (spec.bodyStyle === 'hyper') {
    pCtx.fillStyle = '#facc15';
    pCtx.fillRect(x + w / 2 - 4, y + 3, 2.5, h - 6);
    pCtx.fillRect(x + w / 2 + 1.5, y + 3, 2.5, h - 6);
  } else {
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(x + w / 2 - 2, y + 3, 4, h - 6);
  }
}

function saveEconomy() {
  store.set('highwayRushCoins', Math.floor(totalCoins));
  store.set('highwayRushUnlocked', JSON.stringify(unlockedCars));
  store.set('highwayRushEquipped', equippedCarId);
  coinsHudEl.textContent = Math.floor(totalCoins);
  homeCoinsPill.textContent = `₹ ${Math.floor(totalCoins)}`;
  renderCarPreviewCard();
}
saveEconomy();

function renderGarage() {
  document.getElementById('garageCoins').textContent = `${Math.floor(totalCoins)} Coins`;
  const grid = document.getElementById('garageGrid');
  grid.innerHTML = '';

  CARS.forEach((car) => {
    const owned = unlockedCars.includes(car.id);
    const equipped = equippedCarId === car.id;
    const card = document.createElement('div');
    card.className = 'car-card' + (equipped ? ' equipped' : '');

    card.innerHTML = `
      <div>
        <div class="car-title">${car.name}</div>
        <div class="car-tag">${car.tag}</div>
        <div class="stat-bar-wrap">
          <div class="stat-bar-label"><span>SPEED</span><span>${car.spdPct}%</span></div>
          <div class="stat-track"><div class="stat-fill" style="width:${car.spdPct}%;background:#ffa657;"></div></div>
        </div>
        <div class="stat-bar-wrap">
          <div class="stat-bar-label"><span>HANDLING</span><span>${car.hndPct}%</span></div>
          <div class="stat-track"><div class="stat-fill" style="width:${car.hndPct}%;background:#58a6ff;"></div></div>
        </div>
        <div class="stat-bar-wrap" style="margin-bottom:7px;">
          <div class="stat-bar-label"><span>NITRO</span><span>${car.nitPct}%</span></div>
          <div class="stat-track"><div class="stat-fill" style="width:${car.nitPct}%;background:#3fb950;"></div></div>
        </div>
      </div>
    `;

    const actionBtn = document.createElement('button');
    actionBtn.style.width = '100%';
    if (equipped) {
      actionBtn.textContent = 'EQUIPPED';
      actionBtn.className = 'active';
    } else if (owned) {
      actionBtn.textContent = 'EQUIP CAR';
      actionBtn.onclick = () => {
        equippedCarId = car.id;
        saveEconomy();
        renderGarage();
        resetGame();
      };
    } else {
      actionBtn.textContent = `UNLOCK (${car.cost} COINS)`;
      actionBtn.className = 'gold-btn';
      actionBtn.onclick = () => {
        if (totalCoins >= car.cost) {
          totalCoins -= car.cost;
          unlockedCars.push(car.id);
          equippedCarId = car.id;
          saveEconomy();
          playTone(740, 'sine', 0.25, 0.12);
          renderGarage();
          resetGame();
        } else {
          actionBtn.textContent = `NEED ${car.cost - Math.floor(totalCoins)} MORE`;
          setTimeout(() => { if (isShown(garageOverlay)) renderGarage(); }, 1100);
        }
      };
    }
    card.appendChild(actionBtn);
    grid.appendChild(card);
  });
}

let muted = false;
let gameStarted = false;
let paused = false;
let p2Color = '#3fb950';
let p2CarId = 'swift';
let difficulty = 'medium';
let weatherPref = 'dynamic';
let guestBanked = false;

const DIFF_CONFIG = {
  easy:   { baseSpeed: 5.0, spawnMin: 38, spawnStart: 70 },
  medium: { baseSpeed: 6.2, spawnMin: 28, spawnStart: 58 },
  hard:   { baseSpeed: 7.6, spawnMin: 22, spawnStart: 46 },
};

const rawBest = Number(store.get('highwayRushBest', 0));
let bestScore = Number.isFinite(rawBest) && rawBest > 0 ? rawBest : 0;
bestEl.textContent = bestScore;

let particles = [];
let skidMarks = [];
let speedLines = [];
let rainDrops = [];
let roadProps = [];
let shakeTime = 0;
let shakeIntensity = 0;

function initPropsAndRain() {
  rainDrops = [];
  for (let i = 0; i < 65; i++) {
    rainDrops.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 8 + Math.random() * 9,
      speed: 10 + Math.random() * 5,
    });
  }
  roadProps = [];
  for (let y = 0; y < canvas.height + 120; y += 105) {
    roadProps.push({ y, side: 'left', kind: Math.random() < 0.65 ? 'tree' : 'lamp', outer: false });
    roadProps.push({ y: y + 52, side: 'right', kind: Math.random() < 0.65 ? 'tree' : 'lamp', outer: false });
    if (LANES >= 7) {
      roadProps.push({ y: y + 26, side: 'left', kind: 'tree', outer: true });
      roadProps.push({ y: y + 78, side: 'right', kind: 'tree', outer: true });
    }
  }
}

function triggerShake(duration = 14, intensity = 7) {
  shakeTime = duration;
  shakeIntensity = intensity;
}

function spawnParticles(x, y, color, count = 10, speedScale = 1, size = 3.5) {
  for (let i = 0; i < count; i++) {
    if (particles.length > 150) particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const spd = (1 + Math.random() * 3.5) * speedScale;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 18 + Math.random() * 14,
      maxLife: 32,
      color,
      size: size * (0.7 + Math.random() * 0.6),
    });
  }
}

function spawnSmoke(x, y, isWaterSpray = false) {
  if (particles.length > 150) particles.shift();
  particles.push({
    x: x + (Math.random() - 0.5) * 6,
    y,
    vx: (Math.random() - 0.5) * 1.1,
    vy: 1.6 + Math.random() * 1.6,
    life: 14,
    maxLife: 14,
    color: isWaterSpray ? 'rgba(186, 230, 253, 0.36)' : 'rgba(200, 210, 220, 0.42)',
    size: isWaterSpray ? 2.6 + Math.random() * 2 : 4 + Math.random() * 3,
  });
}

let audioCtx = null, engineOsc = null, engineGain = null;
function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(audioCtx.destination);
      engineOsc.start();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (_) { audioCtx = null; engineOsc = null; engineGain = null; }
}

function playTone(freq, type, duration, vol = 0.08) {
  if (!audioCtx || muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

let peer = null;
let conn = null;
const NO_INPUT = () => ({ left: false, right: false, up: false, down: false });
let guestInput = NO_INPUT();

function buildInviteUrl(code) {
  const cleanCode = (code || '').trim();
  if (!/^\d{4}$/.test(cleanCode)) return window.location.href;
  const url = new URL(window.location.href);
  url.searchParams.set('room', cleanCode);
  return url.toString();
}

function cleanupPeer() {
  const c = conn, p = peer;
  conn = null;
  peer = null;
  guestInput = NO_INPUT();
  try { if (c) c.close(); } catch (_) {}
  try { if (p) p.destroy(); } catch (_) {}
}

function resetOnlineLobbyUI() {
  document.getElementById('hostBox').style.display = 'none';
  document.getElementById('roomCodeDisplay').textContent = '----';
  document.getElementById('hostStatus').textContent = 'Waiting for friend to join...';
  document.getElementById('joinStatus').textContent = '';
}

function createOnlineRoom(retryCount = 0) {
  cleanupPeer();
  initAudio();
  if (typeof Peer === 'undefined') {
    document.getElementById('hostBox').style.display = 'block';
    document.getElementById('hostStatus').textContent = 'PeerJS failed to load. Check internet/adblocker.';
    return;
  }
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const peerId = 'nh44-rush-' + code;
  document.getElementById('hostBox').style.display = 'block';
  document.getElementById('roomCodeDisplay').textContent = code;
  document.getElementById('hostStatus').textContent = 'Creating room...';

  const myPeer = new Peer(peerId);
  peer = myPeer;
  myPeer.on('open', () => {
    if (peer !== myPeer) return;
    document.getElementById('hostStatus').textContent = 'Room ready! Waiting for friend...';
  });
  myPeer.on('connection', (connection) => {
    if (peer !== myPeer) { connection.close(); return; }
    if (conn && conn.open) { connection.close(); return; }
    conn = connection;
    document.getElementById('hostStatus').textContent = 'Friend connected! Starting race...';
    connection.on('data', (data) => {
      if (!data) return;
      if (data.type === 'input' && data.keys) guestInput = data.keys;
      if (data.type === 'guestProfile') {
        if (data.color) p2Color = data.color;
        if (data.carId) p2CarId = data.carId;
        if (state && state.players[1]) {
          const spec = getCarSpec(p2CarId);
          const g = state.players[1];
          g.color = p2Color;
          g.bodyStyle = spec.bodyStyle;
          g.w = spec.bodyStyle === 'suv' ? 38 : 36;
          g.handling = spec.handling;
          g.nitroDrain = spec.nitroDrain;
          g.nitroRegen = spec.nitroRegen;
        }
      }
      if (data.type === 'restart' && state && state.gameOver) {
        resetGame();
        if (conn && conn.open) conn.send({ type: 'state', state });
      }
    });
    connection.on('close', () => {
      if (conn === connection) quitToHome();
    });
    setTimeout(() => {
      if (conn !== connection || !connection.open) return;
      setActiveMode('host');
      startRaceSession();
    }, 600);
  });
  myPeer.on('error', (err) => {
    if (peer !== myPeer) return;
    if (err.type === 'unavailable-id' && retryCount < 3) createOnlineRoom(retryCount + 1);
    else document.getElementById('hostStatus').textContent = 'Network error: ' + err.type;
  });
}

function joinOnlineRoom(forcedCode = null) {
  initAudio();
  if (typeof Peer === 'undefined') {
    document.getElementById('joinStatus').textContent = 'PeerJS failed to load. Check internet/adblocker.';
    return;
  }
  const joinInputEl = document.getElementById('joinCodeInput');
  const code = (forcedCode !== null ? String(forcedCode) : joinInputEl.value).trim();
  if (forcedCode !== null) joinInputEl.value = code;
  if (!/^\d{4}$/.test(code)) {
    document.getElementById('joinStatus').textContent = 'Enter 4-digit room code.';
    return;
  }
  cleanupPeer();
  document.getElementById('joinStatus').textContent = 'Connecting to room ' + code + '...';
  const myPeer = new Peer();
  peer = myPeer;
  myPeer.on('open', () => {
    if (peer !== myPeer) return;
    const c = myPeer.connect('nh44-rush-' + code);
    conn = c;
    c.on('open', () => {
      if (conn !== c) return;
      document.getElementById('joinStatus').textContent = 'Connected! Race starting...';
      c.send({ type: 'guestProfile', color: selectedColor, carId: equippedCarId });
      setActiveMode('guest');
      startRaceSession();
    });
    c.on('data', (data) => {
      if (!data) return;
      if (data.type === 'state') {
        state = data.state;
        if (state.lanes && state.lanes !== LANES) {
          applyRoadLayout(state.lanes);
          initPropsAndRain();
        }
        if (state.gameOver && gameStarted) {
          bankGuestRun();
          updateHudFromState();
          showGameOverModal();
        } else {
          guestBanked = false;
          updateHudFromState();
          gameOverOverlay.style.display = 'none';
        }
      }
      if (data.type === 'sfx') playTone(data.freq, data.wave, data.dur, data.vol);
      if (data.type === 'vfx') {
        if (data.kind === 'shake') triggerShake(14, 7);
        if (data.kind === 'sparks') spawnParticles(data.x, data.y, data.color, 14, 1.2, 3.5);
      }
    });
    c.on('close', () => {
      if (conn === c) quitToHome();
    });
  });
  myPeer.on('error', () => {
    if (peer !== myPeer) return;
    document.getElementById('joinStatus').textContent = 'Room not found. Check code & retry.';
  });
}

function bankGuestRun() {
  if (guestBanked || !state || !state.players[1]) return;
  guestBanked = true;
  const g = state.players[1];
  const bonus = Math.floor(state.distanceKm * 4);
  totalCoins += g.runCoins + bonus;
  saveEconomy();
  state.earnedSummary = `+${g.runCoins + bonus} Coins Banked! (${g.runCoins} pickup + ${bonus} km)`;
  recordLeaderboardScore(driverName, getCarSpec(equippedCarId).name, state.distanceKm, g.score);
  if (g.score > bestScore) {
    bestScore = g.score;
    store.set('highwayRushBest', bestScore);
    bestEl.textContent = bestScore;
  }
}

function broadcastSfx(freq, wave, dur, vol) {
  playTone(freq, wave, dur, vol);
  if (mode === 'host' && conn && conn.open) conn.send({ type: 'sfx', freq, wave, dur, vol });
}

function broadcastVfx(kind, x = 0, y = 0, color = '#ffa657') {
  if (kind === 'shake') triggerShake(14, 7);
  if (kind === 'sparks') spawnParticles(x, y, color, 14, 1.2, 3.5);
  if (mode === 'host' && conn && conn.open) conn.send({ type: 'vfx', kind, x, y, color });
}

createRoomBtn.addEventListener('click', () => createOnlineRoom(0));
joinRoomBtn.addEventListener('click', () => joinOnlineRoom());
copyCodeBtn.addEventListener('click', () => {
  const code = document.getElementById('roomCodeDisplay').textContent.trim();
  const inviteUrl = buildInviteUrl(code);
  const done = () => {
    copyCodeBtn.textContent = 'LINK COPIED!';
    setTimeout(() => (copyCodeBtn.textContent = 'COPY CODE'), 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inviteUrl).then(done).catch(() => {
      copyCodeBtn.textContent = 'COPY FAILED';
      setTimeout(() => (copyCodeBtn.textContent = 'COPY CODE'), 1500);
    });
  } else {
    copyCodeBtn.textContent = 'COPY FAILED';
    setTimeout(() => (copyCodeBtn.textContent = 'COPY CODE'), 1500);
  }
});

function hideAllOverlays() {
  startOverlay.style.display = 'none';
  pauseOverlay.style.display = 'none';
  gameOverOverlay.style.display = 'none';
  garageOverlay.style.display = 'none';
  ranksOverlay.style.display = 'none';
  onlineOverlay.style.display = 'none';
}

function syncTopNavState() {
  const inOfflineRace = gameStarted && !state.gameOver && !isOnline();
  menuResume.style.display = inOfflineRace ? 'flex' : 'none';
  menuRestart.style.display = inOfflineRace ? 'flex' : 'none';
  menuRaceDivider.style.display = inOfflineRace ? 'block' : 'none';
  menuHomeDivider.style.display = gameStarted ? 'block' : 'none';
  menuHome.style.display = gameStarted ? 'flex' : 'none';

  const lockMidOnline = onlineRaceActive();
  menu1P.style.display = lockMidOnline ? 'none' : 'flex';
  menu2P.style.display = lockMidOnline ? 'none' : 'flex';
  menuOnline.style.display = lockMidOnline ? 'none' : 'flex';
  menuGarage.style.display = lockMidOnline ? 'none' : 'flex';
  menuRanks.style.display = lockMidOnline ? 'none' : 'flex';

  menu1P.classList.toggle('active-item', mode === '1p');
  menu2P.classList.toggle('active-item', mode === '2p');
  menuOnline.classList.toggle('active-item', isOnline());
}

function startRaceSession() {
  closeDotsMenu();
  initAudio();
  hideAllOverlays();
  paused = false;
  gameStarted = true;
  guestBanked = false;
  guestInput = NO_INPUT();
  resetGame();
  syncTopNavState();
}

function togglePause() {
  if (!gameStarted || state.gameOver) return;
  if (isOnline()) return;
  if ([startOverlay, gameOverOverlay, garageOverlay, ranksOverlay, onlineOverlay].some(isShown)) return;
  closeDotsMenu();
  paused = !paused;
  if (paused) {
    if (engineGain) engineGain.gain.value = 0;
    pauseOverlay.style.display = 'flex';
  } else {
    pauseOverlay.style.display = 'none';
  }
  syncTopNavState();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameStarted && !paused && !state.gameOver && !isOnline()) togglePause();
});

function quitToHome() {
  closeDotsMenu();
  cleanupPeer();
  paused = false;
  gameStarted = false;
  if (engineGain) engineGain.gain.value = 0;
  if (mode === 'host' || mode === 'guest') {
    mode = '1p';
    p2ScoreBox.style.display = 'none';
    p2NitroBox.style.display = 'none';
  }
  hideAllOverlays();
  resetGame();
  startOverlay.style.display = 'flex';
  syncTopNavState();
}

function showGameOverModal() {
  closeDotsMenu();
  syncTopNavState();
  document.getElementById('goTitle').textContent = mode !== '1p' ? state.winnerText : 'CRASHED!';
  document.getElementById('goP1Score').textContent = `P1 Score: ${state.players[0].score}`;
  const goP2 = document.getElementById('goP2Score');
  if (mode !== '1p' && state.players[1]) {
    goP2.style.display = 'block';
    goP2.textContent = `P2 Score: ${state.players[1].score}`;
  } else {
    goP2.style.display = 'none';
  }
  document.getElementById('goCoinsText').textContent = mode === 'guest'
    ? (state.earnedSummary || 'Guest Run Complete!')
    : (state.earnedSummary || '');
  if (gameOverOverlay.style.display !== 'flex') goRestartBtn.textContent = '↻ RACE AGAIN';
  gameOverOverlay.style.display = 'flex';
}

function setActiveMode(newMode) {
  mode = newMode;
  const isMulti = mode !== '1p';
  p2ScoreBox.style.display = isMulti ? 'block' : 'none';
  p2NitroBox.style.display = isMulti ? 'block' : 'none';
  syncTopNavState();
  if (mode !== 'guest') resetGame();
}

menu1P.addEventListener('click', () => {
  closeDotsMenu();
  cleanupPeer();
  paused = false;
  gameStarted = false;
  if (engineGain) engineGain.gain.value = 0;
  hideAllOverlays();
  setActiveMode('1p');
  startOverlay.style.display = 'flex';
});

menu2P.addEventListener('click', () => {
  closeDotsMenu();
  cleanupPeer();
  paused = false;
  gameStarted = false;
  if (engineGain) engineGain.gain.value = 0;
  hideAllOverlays();
  setActiveMode('2p');
  startOverlay.style.display = 'flex';
});

menuOnline.addEventListener('click', () => {
  closeDotsMenu();
  if (onlineRaceActive()) return;
  if (gameStarted && !state.gameOver) {
    paused = true;
    if (engineGain) engineGain.gain.value = 0;
  }
  hideAllOverlays();
  resetOnlineLobbyUI();
  onlineOverlay.style.display = 'flex';
  syncTopNavState();
});
openOnlineBtn.addEventListener('click', () => { hideAllOverlays(); resetOnlineLobbyUI(); onlineOverlay.style.display = 'flex'; });

let returnToPausedRace = false;

function openGarage() {
  closeDotsMenu();
  if (onlineRaceActive()) return;
  returnToPausedRace = gameStarted && !state.gameOver;
  if (returnToPausedRace) paused = true;
  if (engineGain) engineGain.gain.value = 0;
  hideAllOverlays();
  renderGarage();
  garageOverlay.style.display = 'flex';
  syncTopNavState();
}
menuGarage.addEventListener('click', openGarage);
openGarageBtn.addEventListener('click', openGarage);
closeGarageBtn.addEventListener('click', () => {
  hideAllOverlays();
  if (returnToPausedRace) {
    returnToPausedRace = false;
    pauseOverlay.style.display = 'flex';
    syncTopNavState();
  } else {
    startOverlay.style.display = 'flex';
  }
});

function openRanks() {
  closeDotsMenu();
  if (onlineRaceActive()) return;
  returnToPausedRace = gameStarted && !state.gameOver;
  if (returnToPausedRace) paused = true;
  if (engineGain) engineGain.gain.value = 0;
  hideAllOverlays();
  renderLeaderboard();
  ranksOverlay.style.display = 'flex';
  syncTopNavState();
}
menuRanks.addEventListener('click', openRanks);
openRanksBtn.addEventListener('click', openRanks);
closeRanksBtn.addEventListener('click', () => {
  hideAllOverlays();
  if (returnToPausedRace) {
    returnToPausedRace = false;
    pauseOverlay.style.display = 'flex';
    syncTopNavState();
  } else {
    startOverlay.style.display = 'flex';
  }
});

closeOnlineBtn.addEventListener('click', () => {
  onlineOverlay.style.display = 'none';
  if (!isOnline()) cleanupPeer();
  if (gameStarted && !state.gameOver) {
    pauseOverlay.style.display = 'flex';
    syncTopNavState();
  } else {
    startOverlay.style.display = 'flex';
  }
});

menuSound.addEventListener('click', () => {
  muted = !muted;
  menuSound.innerHTML = muted ? '<span>🔇 Sound: OFF</span>' : '<span>🔊 Sound: ON</span>';
  if (engineGain) engineGain.gain.value = muted ? 0 : (gameStarted && !paused ? 0.02 : 0);
  closeDotsMenu();
});

menuResume.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);

function restartActiveRun() {
  closeDotsMenu();
  paused = false;
  hideAllOverlays();
  resetGame();
  syncTopNavState();
}
menuRestart.addEventListener('click', restartActiveRun);
pauseRestartBtn.addEventListener('click', restartActiveRun);

menuHome.addEventListener('click', quitToHome);
pauseHomeBtn.addEventListener('click', quitToHome);
goHomeBtn.addEventListener('click', quitToHome);
goRestartBtn.addEventListener('click', triggerRestart);

document.querySelectorAll('#p1Colors .swatch').forEach((el) => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#p1Colors .swatch').forEach((s) => s.classList.remove('selected'));
    el.classList.add('selected');
    selectedColor = el.dataset.color;
    renderCarPreviewCard();
    if (mode === 'guest' && conn && conn.open) {
      conn.send({ type: 'guestProfile', color: selectedColor, carId: equippedCarId });
    } else if (!(gameStarted && !state.gameOver && !paused)) {
      resetGame();
    } else {
      state.players[0].color = selectedColor;
    }
  });
});

document.querySelectorAll('#diffRow button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#diffRow button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
    resetGame();
  });
});

document.querySelectorAll('#weatherRow button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#weatherRow button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    weatherPref = btn.dataset.weather;
    resetGame();
  });
});

startBtn.addEventListener('click', startRaceSession);

const keys = {};
const touchState = { left: false, right: false, up: false, down: false };
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyP', 'Escape']);
const touchButtons = Array.from(document.querySelectorAll('#touchControls .touch-btn'));

function syncTouchVisuals() {
  touchButtons.forEach((btn) => {
    const ctrl = btn.dataset.ctrl;
    if (ctrl) btn.classList.toggle('pressed', !!touchState[ctrl]);
  });
}

function clearAllInputs() {
  Object.keys(keys).forEach((k) => (keys[k] = false));
  touchState.left = touchState.right = touchState.up = touchState.down = false;
  syncTouchVisuals();
}

window.addEventListener('blur', clearAllInputs);

window.addEventListener('resize', () => {
  if (!gameStarted && !isOnline()) {
    const prevLanes = LANES;
    applyRoadLayout();
    if (LANES !== prevLanes) {
      initPropsAndRain();
      resetGame();
    }
  }
});

function triggerRestart() {
  if (!state.gameOver || !gameStarted) return;
  clearAllInputs();
  if (mode === 'guest' && conn && conn.open) {
    goRestartBtn.textContent = 'WAITING FOR HOST...';
    conn.send({ type: 'restart' });
  } else {
    gameOverOverlay.style.display = 'none';
    resetGame();
    syncTopNavState();
  }
}

const touchContainer = document.getElementById('touchControls');
function updateActiveTouches(e) {
  e.preventDefault();
  initAudio();
  touchState.left = touchState.right = touchState.up = touchState.down = false;
  for (let i = 0; i < e.touches.length; i++) {
    const t = e.touches[i];
    const target = document.elementFromPoint(t.clientX, t.clientY);
    const btn = target && target.closest && target.closest('.touch-btn');
    if (btn && btn.dataset.ctrl) {
      touchState[btn.dataset.ctrl] = true;
    }
  }
  syncTouchVisuals();
}

if (touchContainer) {
  touchContainer.addEventListener('touchstart', updateActiveTouches, { passive: false });
  touchContainer.addEventListener('touchmove', updateActiveTouches, { passive: false });
  touchContainer.addEventListener('touchend', updateActiveTouches, { passive: false });
  touchContainer.addEventListener('touchcancel', clearAllInputs);
}

touchButtons.forEach((btn) => {
  const prop = btn.dataset.ctrl;
  if (!prop) return;
  btn.addEventListener('mousedown', () => { initAudio(); touchState[prop] = true; syncTouchVisuals(); });
  btn.addEventListener('mouseup', () => { touchState[prop] = false; syncTouchVisuals(); });
  btn.addEventListener('mouseleave', () => { touchState[prop] = false; syncTouchVisuals(); });
});

window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();

  if (!e.repeat) {
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (dotsMenu.style.display === 'flex') closeDotsMenu();
      else togglePause();
      return;
    }
    if (e.code === 'Space') {
      if (state.gameOver && gameStarted) {
        triggerRestart();
      } else if (!gameStarted && isShown(startOverlay)) {
        startRaceSession();
      }
    }
  }
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));

let state;

function createPlayer(x, color, label, spec) {
  return {
    x, y: 450, w: spec.bodyStyle === 'suv' ? 38 : 36, h: 64,
    vx: 0, tilt: 0, boosting: false, braking: false,
    color, label, bodyStyle: spec.bodyStyle,
    handling: spec.handling, nitroDrain: spec.nitroDrain, nitroRegen: spec.nitroRegen,
    nitro: 100, score: 0, runCoins: 0, shield: false, alive: true,
  };
}

function resolveAtmosphere(distanceKm) {
  if (weatherPref === 'day') return { timeOfDay: 'DAY', raining: false, label: 'DAY' };
  if (weatherPref === 'night') return { timeOfDay: 'NIGHT', raining: false, label: 'NIGHT' };
  if (weatherPref === 'rain') return { timeOfDay: 'DUSK', raining: true, label: 'MONSOON' };

  const phase = Math.floor(distanceKm / 4) % 4;
  if (phase === 0) return { timeOfDay: 'DAY', raining: false, label: 'DAY' };
  if (phase === 1) return { timeOfDay: 'SUNSET', raining: false, label: 'SUNSET' };
  if (phase === 2) return { timeOfDay: 'NIGHT', raining: false, label: 'NIGHT' };
  return { timeOfDay: 'NIGHT', raining: true, label: 'MONSOON' };
}

function resetGame() {
  if (mode !== 'guest') applyRoadLayout();
  clearAllInputs();
  gameOverOverlay.style.display = 'none';
  particles = [];
  skidMarks = [];
  speedLines = [];
  shakeTime = 0;
  guestBanked = false;

  const cfg = DIFF_CONFIG[difficulty];
  const p1Spec = getCarSpec(equippedCarId);
  const p2Spec = mode === 'host' ? getCarSpec(p2CarId) : CARS[0];
  const isMulti = mode !== '1p';

  const p1StartX = ROAD_LEFT + LANE_WIDTH + (LANE_WIDTH - 36) / 2;
  const p2StartX = ROAD_LEFT + (LANES - 2) * LANE_WIDTH + (LANE_WIDTH - 36) / 2;

  const players = isMulti
    ? [createPlayer(p1StartX, selectedColor, 'P1', p1Spec), createPlayer(p2StartX, p2Color, 'P2', p2Spec)]
    : [createPlayer(canvas.width / 2 - 18, selectedColor, 'P1', p1Spec)];

  const atm = resolveAtmosphere(0);

  state = {
    lanes: LANES,
    players,
    baseSpeed: cfg.baseSpeed + p1Spec.speedBonus,
    currentSpeed: cfg.baseSpeed + p1Spec.speedBonus,
    boostingAny: false,
    roadOffset: 0,
    distanceKm: 0,
    nextTollKm: 5,
    tollBannerY: -120,
    nextRivalKm: 2,
    rival: null,
    nextPoliceKm: 6,
    police: null,
    timeOfDay: atm.timeOfDay,
    raining: atm.raining,
    envLabel: atm.label,
    traffic: [],
    pickups: [],
    coins: [],
    popups: [],
    spawnTimer: 0,
    pickupTimer: 0,
    coinTimer: 0,
    gameOver: false,
    winnerText: '',
    earnedSummary: '',
  };
  updateHudFromState();
}

function updateAttractDemo() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life--;
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  for (let i = skidMarks.length - 1; i >= 0; i--) {
    skidMarks[i].alpha -= 0.04;
    if (skidMarks[i].alpha <= 0) skidMarks.splice(i, 1);
  }

  const demoSpd = 4.5;
  state.roadOffset = (state.roadOffset + demoSpd) % 48;
  state.distanceKm += demoSpd * 0.002;
  state.timeOfDay = 'NIGHT';
  state.raining = false;

  roadProps.forEach((prop) => {
    prop.y += demoSpd;
    if (prop.y > canvas.height + 50) prop.y = -50;
  });

  state.spawnTimer++;
  if (state.spawnTimer >= (LANES >= 7 ? 32 : 46)) {
    spawnTraffic();
    state.spawnTimer = 0;
  }

  const p1 = state.players[0];
  if (p1) {
    const curLane = Math.max(0, Math.min(LANES - 1, Math.floor((p1.x + p1.w / 2 - ROAD_LEFT) / LANE_WIDTH)));
    const danger = state.traffic.some((v) => {
      const vLane = Math.floor((v.x + v.w / 2 - ROAD_LEFT) / LANE_WIDTH);
      return vLane === curLane && v.y > 180 && v.y < p1.y + 40;
    });
    if (danger) {
      for (let l = 0; l < LANES; l++) {
        const safe = !state.traffic.some((v) => {
          const vLane = Math.floor((v.x + v.w / 2 - ROAD_LEFT) / LANE_WIDTH);
          return vLane === l && v.y > 160 && v.y < p1.y + 40;
        });
        if (safe) {
          const targetX = ROAD_LEFT + l * LANE_WIDTH + (LANE_WIDTH - p1.w) / 2;
          p1.vx = (targetX - p1.x) * 0.14;
          break;
        }
      }
    } else {
      p1.vx *= 0.85;
    }
    p1.x += p1.vx;
    p1.tilt = Math.max(-0.15, Math.min(0.15, p1.vx * 0.025));
  }

  for (let i = state.traffic.length - 1; i >= 0; i--) {
    state.traffic[i].y += demoSpd - state.traffic[i].speed * 0.35;
    if (state.traffic[i].y > canvas.height + 120) state.traffic.splice(i, 1);
  }
}

function spawnRivalAI() {
  const openLanes = [];
  for (let l = 0; l < LANES; l++) {
    const occupied = state.traffic.some((v) => {
      const vLane = Math.floor((v.x + v.w / 2 - ROAD_LEFT) / LANE_WIDTH);
      return vLane === l && v.y < 170;
    });
    if (!occupied) openLanes.push(l);
  }
  if (openLanes.length === 0) return;

  const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
  const x = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - 36) / 2;
  state.rival = {
    x, y: -90, w: 36, h: 64,
    targetX: x, tilt: 0,
    color: '#ef4444',
    overtaken: false,
  };
  addPopup(canvas.width / 2 - 18, 95, 'RIVAL AI CHALLENGER AHEAD!', '#ff7b72');
}

function updateRivalAI(currentSpeed) {
  const r = state.rival;
  if (!r) return;

  const curLane = Math.max(0, Math.min(LANES - 1, Math.floor((r.x + r.w / 2 - ROAD_LEFT) / LANE_WIDTH)));
  const blocked = state.traffic.some((v) => {
    const vLane = Math.floor((v.x + v.w / 2 - ROAD_LEFT) / LANE_WIDTH);
    return vLane === curLane && Math.abs(v.y - r.y) < 160;
  });

  if (blocked) {
    for (const offset of [-1, 1, -2, 2]) {
      const cand = curLane + offset;
      if (cand >= 0 && cand < LANES) {
        const safe = !state.traffic.some((v) => {
          const vLane = Math.floor((v.x + v.w / 2 - ROAD_LEFT) / LANE_WIDTH);
          return vLane === cand && Math.abs(v.y - r.y) < 160;
        });
        if (safe) {
          r.targetX = ROAD_LEFT + cand * LANE_WIDTH + (LANE_WIDTH - r.w) / 2;
          break;
        }
      }
    }
  }

  const dx = r.targetX - r.x;
  r.x += dx * 0.14;
  r.tilt = Math.max(-0.16, Math.min(0.16, dx * 0.012));

  r.y += currentSpeed - (state.baseSpeed + 1.15);

  const p1 = state.players[0];
  if (!r.overtaken && p1.alive && r.y > p1.y + p1.h) {
    r.overtaken = true;
    p1.score += 250;
    p1.runCoins += 15;
    broadcastSfx(960, 'triangle', 0.2, 0.09);
    broadcastVfx('sparks', p1.x + p1.w / 2, p1.y, '#facc15');
    addPopup(p1.x, p1.y - 22, '+250 RIVAL OVERTAKE!', '#facc15');
  }

  if (r.y > canvas.height + 140 || r.y < -260) {
    state.rival = null;
  }
}

function spawnPoliceChase() {
  const activeTarget = state.players.find((p) => p.alive);
  if (!activeTarget) return;
  state.police = {
    x: activeTarget.x,
    y: canvas.height + 60,
    w: 38,
    h: 66,
    timer: 480,
    sirenTick: 0,
  };
  broadcastSfx(620, 'sawtooth', 0.28, 0.09);
  addPopup(canvas.width / 2 - 18, 110, 'POLICE INTERCEPTOR PURSUIT!', '#60a5fa');
}

function updatePoliceChase() {
  const cop = state.police;
  if (!cop) return;
  const targetPlayer = state.players.find((p) => p.alive);
  if (!targetPlayer) { state.police = null; return; }

  cop.timer--;
  cop.sirenTick++;
  if (cop.sirenTick % 42 === 0) {
    broadcastSfx(cop.sirenTick % 84 === 0 ? 780 : 580, 'sine', 0.22, 0.045);
  }

  const targetY = targetPlayer.boosting ? canvas.height - 42 : canvas.height - 74;
  cop.y += (targetY - cop.y) * 0.06;
  cop.x += (targetPlayer.x - cop.x) * 0.07;

  if (cop.timer <= 0) {
    targetPlayer.score += 500;
    targetPlayer.runCoins += 25;
    broadcastSfx(1080, 'sine', 0.28, 0.1);
    broadcastVfx('sparks', targetPlayer.x + targetPlayer.w / 2, targetPlayer.y, '#60a5fa');
    addPopup(targetPlayer.x, targetPlayer.y - 24, '+500 PURSUIT ESCAPED!', '#60a5fa');
    state.police = null;
  }
}

const MIN_PASS_GAP = 66;

function hasPassableGap(extra) {
  const left = ROAD_LEFT + 4, right = ROAD_LEFT + ROAD_WIDTH - 4;
  const blockers = state.traffic.filter((v) => v.y < 230).map((v) => [v.x, v.x + v.w]);
  if (extra) blockers.push([extra.x, extra.x + extra.w]);
  blockers.sort((a, b) => a[0] - b[0]);
  let cursor = left, best = 0;
  for (const [a, b] of blockers) {
    best = Math.max(best, a - cursor);
    cursor = Math.max(cursor, b);
  }
  best = Math.max(best, right - cursor);
  return best >= MIN_PASS_GAP;
}

function spawnTraffic() {
  const activeTopLanes = new Set();
  state.traffic.forEach((v) => {
    if (v.y < 165) {
      const l = Math.floor((v.x - ROAD_LEFT) / LANE_WIDTH);
      activeTopLanes.add(l);
    }
  });
  if (activeTopLanes.size >= LANES - 1) return;

  const roll = Math.random();
  let type = 'car', w = 36, h = 64, speed = 2.6 + Math.random() * 1.6;
  const carColors = ['#ff7b72', '#d2a8ff', '#79c0ff', '#e6edf3'];
  let color = carColors[Math.floor(Math.random() * carColors.length)];

  if (roll < 0.25) { type = 'auto'; w = 30; h = 48; speed = 2.2; color = '#f1c40f'; }
  else if (roll > 0.78) { type = 'truck'; w = 42; h = 92; speed = 2.0; color = '#d97706'; }

  let x;
  const alive = gameStarted ? state.players.filter((p) => p.alive) : [];
  if (alive.length && Math.random() < 0.45) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    const cx = target.x + target.w / 2 + (Math.random() - 0.5) * 30;
    x = Math.max(ROAD_LEFT + 4, Math.min(ROAD_LEFT + ROAD_WIDTH - w - 4, cx - w / 2));
  } else {
    const availableLanes = [];
    for (let l = 0; l < LANES; l++) {
      if (!activeTopLanes.has(l)) availableLanes.push(l);
    }
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    x = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - w) / 2;
  }

  if (!hasPassableGap({ x, w })) return;

  state.traffic.push({ x, y: -110, w, h, speed, color, type, nearMissedBy: {} });
}

function spawnShield() {
  const lane = Math.floor(Math.random() * LANES);
  const x = ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
  state.pickups.push({ x, y: -40, r: 13 });
}

function spawnCoinLine() {
  const lane = Math.floor(Math.random() * LANES);
  const x = ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
  for (let k = 0; k < 3; k++) {
    state.coins.push({ x, y: -30 - k * 34, r: 9 });
  }
}

function addPopup(x, y, text, color) {
  if (state.popups.length > 14) state.popups.shift();
  state.popups.push({ x, y, text, color, life: 48 });
}

function drawPoliceInterceptor(cop) {
  const { x, y, w, h, sirenTick } = cop;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);

  const beamGrad = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 - 95);
  beamGrad.addColorStop(0, 'rgba(147, 197, 253, 0.35)');
  beamGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 4, -h / 2);
  ctx.lineTo(-w / 2 - 22, -h / 2 - 95);
  ctx.lineTo(w / 2 + 22, -h / 2 - 95);
  ctx.lineTo(w / 2 - 4, -h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-w / 2 + 2, -10, w - 4, 22);

  const redActive = Math.floor(sirenTick / 6) % 2 === 0;
  ctx.fillStyle = redActive ? '#ef4444' : '#7f1d1d';
  ctx.shadowColor = redActive ? '#ef4444' : 'transparent';
  ctx.shadowBlur = redActive ? 16 : 0;
  ctx.fillRect(-13, -3, 12, 6);

  ctx.fillStyle = !redActive ? '#3b82f6' : '#1e3a8a';
  ctx.shadowColor = !redActive ? '#3b82f6' : 'transparent';
  ctx.shadowBlur = !redActive ? 16 : 0;
  ctx.fillRect(1, -3, 12, 6);
  ctx.shadowBlur = 0;

  ctx.restore();

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 10px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(`INTERCEPTOR ${Math.ceil(cop.timer / 60)}s`, x + w / 2, y - 8);
}

function drawVehicle(v, isPlayer = false, tagOverride = null) {
  const { x, y, w, h, color, type, bodyStyle, shield, label, tilt = 0, boosting = false, braking = false } = v;
  const isNight = state.timeOfDay === 'NIGHT' || state.timeOfDay === 'DUSK';

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);

  if (isPlayer) {
    const beamLen = isNight ? 145 : 80;
    const beamAlpha = isNight ? 0.34 : 0.16;
    const beamGrad = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 - beamLen);
    beamGrad.addColorStop(0, `rgba(254, 240, 138, ${beamAlpha})`);
    beamGrad.addColorStop(0.65, `rgba(254, 240, 138, ${beamAlpha * 0.35})`);
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2);
    ctx.lineTo(-w / 2 - 26, -h / 2 - beamLen);
    ctx.lineTo(w / 2 + 26, -h / 2 - beamLen);
    ctx.lineTo(w / 2 - 4, -h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur = isNight ? 18 : 10;
  } else if (isNight) {
    ctx.shadowColor = '#ff4d4d';
    ctx.shadowBlur = 10;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);

  if (type === 'auto') {
    ctx.fillStyle = '#161b22';
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-w / 2 + 2, -h / 2 + 14, w - 4, h - 18);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(-w / 2 + 5, h / 2 - 4, 6, 3);
    ctx.fillRect(w / 2 - 11, h / 2 - 4, 6, 3);
    ctx.restore();
    return;
  }
  if (type === 'truck') {
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(-w / 2 + 2, -h / 2, w - 4, h - 22);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-w / 2 + 5, -h / 2 + 6, w - 10, h - 32);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.roundRect(-w / 2, h / 2 - 22, w, 22, 5); ctx.fill();
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(-w / 2 + 5, h / 2 - 4, 8, 3);
    ctx.fillRect(w / 2 - 13, h / 2 - 4, 8, 3);
    ctx.restore();
    return;
  }

  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, bodyStyle === 'suv' ? 5 : 8); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(-w / 2 + 5, -h / 2 + 14, w - 10, 14);
  ctx.fillRect(-w / 2 + 6, h / 2 - 19, w - 12, 9);

  if (isPlayer) {
    if (bodyStyle === 'suv') {
      ctx.fillStyle = '#161b22';
      ctx.fillRect(-w / 2 + 4, -4, w - 8, 16);
    } else if (bodyStyle === 'hyper') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-5, -h / 2 + 4, 3, h - 8);
      ctx.fillRect(2, -h / 2 + 4, 3, h - 8);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(-w / 2 - 1, h / 2 - 5, w + 2, 4);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.5, -h / 2 + 4, 5, h - 8);
    }

    if (boosting && !state.gameOver) {
      const flameLen = 16 + Math.random() * 12;
      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath();
      ctx.moveTo(-11, h / 2);
      ctx.lineTo(-8, h / 2 + flameLen);
      ctx.lineTo(-5, h / 2);
      ctx.moveTo(5, h / 2);
      ctx.lineTo(8, h / 2 + flameLen);
      ctx.lineTo(11, h / 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-8, h / 2 + 4, 3, 0, Math.PI * 2);
      ctx.arc(8, h / 2 + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (braking) {
      ctx.fillStyle = '#ff2a2a';
      ctx.shadowColor = '#ff2a2a';
      ctx.shadowBlur = 10;
      ctx.fillRect(-w / 2 + 4, h / 2 - 4, 9, 4);
      ctx.fillRect(w / 2 - 13, h / 2 - 4, 9, 4);
      ctx.shadowBlur = 0;
    }
  }

  ctx.fillStyle = isPlayer ? '#fef08a' : '#ff4d4d';
  ctx.fillRect(-w / 2 + 5, isPlayer ? -h / 2 + 2 : h / 2 - 5, 7, 4);
  ctx.fillRect(w / 2 - 12, isPlayer ? -h / 2 + 2 : h / 2 - 5, 7, 4);

  if (shield) {
    ctx.strokeStyle = '#39d353';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.restore();

  if (tagOverride) {
    ctx.fillStyle = '#ff7b72';
    ctx.font = 'bold 10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(tagOverride, x + w / 2, y - 8);
  } else if (isPlayer && mode !== '1p') {
    ctx.fillStyle = '#f0f6fc';
    ctx.font = 'bold 11px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y - 8);
  }
}

function checkCollision(a, b, pad = 4) {
  return a.x + pad < b.x + b.w - pad && a.x + a.w - pad > b.x + pad &&
         a.y + pad < b.y + b.h - pad && a.y + a.h - pad > b.y + pad;
}

function updateHudFromState() {
  const p1 = state.players[0];
  const p2 = state.players[1];
  p1ScoreEl.textContent = p1.score;
  p1NitroEl.textContent = p1.alive ? `${Math.round(p1.nitro)}%` : 'OUT';
  const me = mode === 'guest' && p2 ? p2 : p1;
  const coins = state.gameOver ? totalCoins : totalCoins + me.runCoins;
  coinsHudEl.textContent = Math.floor(coins);
  homeCoinsPill.textContent = `₹ ${Math.floor(coins)}`;
  if (p2) {
    p2ScoreEl.textContent = p2.score;
    p2NitroEl.textContent = p2.alive ? `${Math.round(p2.nitro)}%` : 'OUT';
  }
  if (state.envLabel) envLabelEl.textContent = state.envLabel;
}

function updateLocalVfx() {
  const spd = state.currentSpeed || 6;

  if (gameStarted && !state.gameOver) {
    roadProps.forEach((prop) => {
      prop.y += spd;
      if (prop.y > canvas.height + 50) {
        prop.y = -50;
        prop.kind = prop.outer ? 'tree' : (Math.random() < 0.65 ? 'tree' : 'lamp');
      }
    });
  }

  if (state.raining) {
    rainDrops.forEach((r) => {
      r.y += r.speed + spd * 0.55;
      r.x -= 1.4;
      if (r.y > canvas.height) { r.y = -15; r.x = Math.random() * (canvas.width + 40); }
      if (r.x < 0) r.x += canvas.width;
    });
  }

  for (let i = skidMarks.length - 1; i >= 0; i--) {
    skidMarks[i].y += spd;
    skidMarks[i].alpha -= 0.015;
    if (skidMarks[i].alpha <= 0 || skidMarks[i].y > canvas.height + 20) skidMarks.splice(i, 1);
  }

  if (gameStarted && !state.gameOver) {
    state.players.forEach((p) => {
      if (!p.alive) return;
      const drifting = Math.abs(p.tilt) > 0.11 || p.braking;
      if (drifting) {
        if (skidMarks.length < 180) {
          skidMarks.push({ x: p.x + 6, y: p.y + p.h - 6, alpha: 0.45 });
          skidMarks.push({ x: p.x + p.w - 9, y: p.y + p.h - 6, alpha: 0.45 });
        }
        if (Math.random() < 0.55) spawnSmoke(p.x + p.w / 2, p.y + p.h, false);
      } else if (state.raining && Math.random() < 0.35) {
        spawnSmoke(p.x + p.w / 2, p.y + p.h, true);
      }
    });

    if (state.boostingAny && Math.random() < 0.7) {
      const leftSide = Math.random() < 0.5;
      speedLines.push({
        x: leftSide ? 6 + Math.random() * (ROAD_LEFT - 14) : ROAD_LEFT + ROAD_WIDTH + 8 + Math.random() * (ROAD_LEFT - 14),
        y: -40,
        len: 35 + Math.random() * 45,
        speed: spd * 2.2,
      });
    }
  }

  for (let i = speedLines.length - 1; i >= 0; i--) {
    speedLines[i].y += speedLines[i].speed;
    if (speedLines[i].y > canvas.height + 60) speedLines.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  if (shakeTime > 0) shakeTime--;
}

function update() {
  if (!gameStarted) {
    updateAttractDemo();
    return;
  }
  if (paused) return;

  updateLocalVfx();

  if (mode === 'guest') {
    if (engineOsc && !muted && !state.gameOver && state.players[1] && state.players[1].alive) {
      engineGain.gain.value = 0.02;
      engineOsc.frequency.setTargetAtTime(48 + (state.currentSpeed || 6) * 6.5, audioCtx.currentTime, 0.05);
    } else if (engineGain) {
      engineGain.gain.value = 0;
    }
    if (conn && conn.open) {
      conn.send({
        type: 'input',
        keys: {
          left: !!(keys['ArrowLeft'] || keys['KeyA'] || touchState.left),
          right: !!(keys['ArrowRight'] || keys['KeyD'] || touchState.right),
          up: !!(keys['ArrowUp'] || keys['KeyW'] || touchState.up),
          down: !!(keys['ArrowDown'] || keys['KeyS'] || touchState.down),
        },
      });
    }
    return;
  }

  if (state.gameOver) {
    if (engineGain) engineGain.gain.value = 0;
    if (mode === 'host' && conn && conn.open) conn.send({ type: 'state', state });
    return;
  }

  const cfg = DIFF_CONFIG[difficulty];
  const p1 = state.players[0];
  const p2 = state.players[1];

  const p1Left = keys['KeyA'] || (mode !== '2p' && (keys['ArrowLeft'] || touchState.left));
  const p1Right = keys['KeyD'] || (mode !== '2p' && (keys['ArrowRight'] || touchState.right));
  const p1Up = keys['KeyW'] || (mode !== '2p' && (keys['ArrowUp'] || touchState.up));
  const p1Down = keys['KeyS'] || (mode !== '2p' && (keys['ArrowDown'] || touchState.down));

  const p2Left = mode === 'host' ? guestInput.left : keys['ArrowLeft'];
  const p2Right = mode === 'host' ? guestInput.right : keys['ArrowRight'];
  const p2Up = mode === 'host' ? guestInput.up : keys['ArrowUp'];
  const p2Down = mode === 'host' ? guestInput.down : keys['ArrowDown'];

  const p1Boost = p1.alive && p1Up && p1.nitro > (p1.boosting ? 1 : 10);
  const p2Boost = p2 && p2.alive && p2Up && p2.nitro > (p2.boosting ? 1 : 10);

  p1.boosting = !!p1Boost;
  p1.braking = p1.alive && !!p1Down;
  if (p2) {
    p2.boosting = !!p2Boost;
    p2.braking = p2.alive && !!p2Down;
  }

  if (p1.alive) {
    p1.nitro = p1Boost ? Math.max(0, p1.nitro - p1.nitroDrain) : Math.min(100, p1.nitro + p1.nitroRegen);
  }
  if (p2 && p2.alive) {
    p2.nitro = p2Boost ? Math.max(0, p2.nitro - p2.nitroDrain) : Math.min(100, p2.nitro + p2.nitroRegen);
  }

  const maxScore = Math.max(p1.score, p2 ? p2.score : 0);
  let currentSpeed = state.baseSpeed + Math.min(maxScore / 950, 6.5);
  state.boostingAny = !!(p1Boost || p2Boost);
  if (state.boostingAny) currentSpeed *= 1.45;
  if ((p1.alive && p1.braking) || (p2 && p2.alive && p2.braking)) currentSpeed *= 0.65;
  state.currentSpeed = currentSpeed;

  if (engineOsc && !muted) {
    engineGain.gain.value = 0.02;
    engineOsc.frequency.setTargetAtTime(48 + currentSpeed * 6.5, audioCtx.currentTime, 0.05);
  }

  const minX = ROAD_LEFT + 6;
  const maxX = ROAD_LEFT + ROAD_WIDTH - 42;

  function applyCarPhysics(p, left, right, boost) {
    if (!p.alive) return;
    p.score += Math.round(currentSpeed * (boost ? 0.38 : 0.25));
    const targetVx = (right ? p.handling : 0) - (left ? p.handling : 0);
    p.vx += (targetVx - p.vx) * 0.35;
    p.x = Math.max(minX, Math.min(maxX, p.x + p.vx));
    const targetTilt = (p.vx / p.handling) * 0.17;
    p.tilt += (targetTilt - p.tilt) * 0.28;
  }

  applyCarPhysics(p1, p1Left, p1Right, p1Boost);
  if (p2) applyCarPhysics(p2, p2Left, p2Right, p2Boost);

  state.roadOffset = (state.roadOffset + currentSpeed) % 48;
  state.distanceKm += currentSpeed * 0.0025;

  const atm = resolveAtmosphere(state.distanceKm);
  if (atm.label !== state.envLabel) {
    state.timeOfDay = atm.timeOfDay;
    state.raining = atm.raining;
    state.envLabel = atm.label;
    addPopup(canvas.width / 2 - 18, 120, atm.label, '#ffa657');
  }

  if (state.distanceKm >= state.nextTollKm) {
    state.tollBannerY = -60;
    state.nextTollKm += 5;
    broadcastSfx(520, 'sine', 0.15, 0.06);
  }
  if (state.tollBannerY > -100) {
    state.tollBannerY += currentSpeed;
    if (state.tollBannerY > canvas.height + 80) state.tollBannerY = -120;
  }

  if (mode === '1p' && !state.rival && state.distanceKm >= state.nextRivalKm) {
    spawnRivalAI();
    state.nextRivalKm += 3.5;
  }
  updateRivalAI(currentSpeed);

  if (!state.police && state.distanceKm >= state.nextPoliceKm && state.tollBannerY < -80) {
    spawnPoliceChase();
    state.nextPoliceKm += 6.5;
  }
  updatePoliceChase();

  state.spawnTimer++;
  const densityScale = LANES >= 7 ? 0.68 : 1.0;
  const baseSpawn = Math.round(cfg.spawnStart * densityScale);
  const minSpawn = Math.round(cfg.spawnMin * densityScale);
  const spawnInterval = Math.max(minSpawn, baseSpawn - Math.floor(maxScore / 600));
  if (state.spawnTimer >= spawnInterval) { spawnTraffic(); state.spawnTimer = 0; }

  state.pickupTimer++;
  if (state.pickupTimer >= 360) { spawnShield(); state.pickupTimer = 0; }

  state.coinTimer++;
  if (state.coinTimer >= 165) { spawnCoinLine(); state.coinTimer = 0; }

  for (let i = state.coins.length - 1; i >= 0; i--) {
    const c = state.coins[i];
    c.y += currentSpeed * 0.9;
    let collected = false;
    state.players.forEach((p) => {
      if (!p.alive || collected) return;
      if (Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y) < 36) {
        collected = true;
        p.runCoins += 10;
        p.score += 40;
        broadcastSfx(1040, 'sine', 0.1, 0.06);
        broadcastVfx('sparks', c.x, c.y, '#facc15');
        addPopup(p.x, p.y - 14, '+10 COINS', '#facc15');
      }
    });
    if (collected || c.y > canvas.height + 40) state.coins.splice(i, 1);
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const orb = state.pickups[i];
    orb.y += currentSpeed * 0.85;
    let collected = false;
    state.players.forEach((p) => {
      if (!p.alive || collected) return;
      if (Math.hypot(p.x + p.w / 2 - orb.x, p.y + p.h / 2 - orb.y) < 40) {
        p.shield = true; collected = true;
        broadcastSfx(660, 'sine', 0.22, 0.1);
        broadcastVfx('sparks', p.x + p.w / 2, p.y + p.h / 2, '#39d353');
        addPopup(p.x, p.y - 15, `${p.label} SHIELD!`, '#39d353');
      }
    });
    if (collected || orb.y > canvas.height + 50) state.pickups.splice(i, 1);
  }

  for (let i = state.traffic.length - 1; i >= 0; i--) {
    const v = state.traffic[i];
    v.y += currentSpeed - v.speed * 0.45;
    let removed = false;

    for (const p of state.players) {
      if (!p.alive) continue;
      if (!v.nearMissedBy[p.label] && v.y > p.y && v.y < p.y + 42) {
        const gap = Math.abs(p.x + p.w / 2 - (v.x + v.w / 2));
        if (gap >= 34 && gap <= 68) {
          v.nearMissedBy[p.label] = true;
          p.score += 150;
          p.runCoins += 5;
          broadcastSfx(880, 'triangle', 0.14, 0.07);
          broadcastVfx('sparks', p.x + p.w / 2, p.y + 10, '#ffa657');
          addPopup(p.x, p.y - 20, `${p.label} +150!`, '#ffa657');
        }
      }
      if (checkCollision(p, v)) {
        if (p.shield) {
          p.shield = false;
          removed = true;
          broadcastSfx(180, 'sawtooth', 0.25, 0.12);
          broadcastVfx('shake');
          broadcastVfx('sparks', p.x + p.w / 2, p.y, '#58a6ff');
          addPopup(p.x, p.y - 20, 'SHIELD SAVED!', '#58a6ff');
          break;
        } else {
          p.alive = false;
          broadcastSfx(90, 'sawtooth', 0.45, 0.16);
          broadcastVfx('shake');
          broadcastVfx('sparks', p.x + p.w / 2, p.y + p.h / 2, '#ff7b72');

          const survivor = state.players.find((pl) => pl.alive);
          if (survivor && mode !== '1p') {
            addPopup(canvas.width / 2 - 18, 145, `${p.label} CRASHED! ${survivor.label} KEEP GOING!`, '#ff7b72');
          }
        }
      }
    }
    if (removed || v.y > canvas.height + 120) state.traffic.splice(i, 1);
  }

  const alivePlayers = state.players.filter((p) => p.alive);
  if (alivePlayers.length === 0) {
    state.gameOver = true;
    if (mode !== '1p' && p2) {
      if (p1.score > p2.score) state.winnerText = 'P1 WINS!';
      else if (p2.score > p1.score) state.winnerText = 'P2 WINS!';
      else state.winnerText = 'TIE GAME!';
    }
    const distanceBonus = Math.floor(state.distanceKm * 4);
    const localPickupCoins = mode === '2p' && p2 ? (p1.runCoins + p2.runCoins) : p1.runCoins;
    const totalEarned = localPickupCoins + distanceBonus;
    totalCoins += totalEarned;
    saveEconomy();
    state.earnedSummary = `+${totalEarned} Coins Banked! (${localPickupCoins} pickup + ${distanceBonus} km)`;

    const topIdx = p2 && p2.score > p1.score ? 1 : 0;
    const top = state.players[topIdx];
    let lbName = driverName;
    let lbCar = getCarSpec(equippedCarId).name;
    if (topIdx === 1) {
      lbName = mode === 'host' ? 'Guest' : 'Player 2';
      lbCar = getCarSpec(mode === 'host' ? p2CarId : 'swift').name;
    }
    recordLeaderboardScore(lbName, lbCar, state.distanceKm, top.score);

    if (top.score > bestScore) {
      bestScore = top.score;
      store.set('highwayRushBest', bestScore);
      bestEl.textContent = bestScore;
    }
    showGameOverModal();
  }

  for (let i = state.popups.length - 1; i >= 0; i--) {
    state.popups[i].y -= 1.2;
    state.popups[i].life--;
    if (state.popups[i].life <= 0) state.popups.splice(i, 1);
  }

  updateHudFromState();
  if (mode === 'host' && conn && conn.open) conn.send({ type: 'state', state });
}

function render() {
  ctx.save();
  if (shakeTime > 0) {
    const dx = (Math.random() - 0.5) * shakeIntensity * (shakeTime / 14);
    const dy = (Math.random() - 0.5) * shakeIntensity * (shakeTime / 14);
    ctx.translate(dx, dy);
  }

  let grassColor = '#1b4332';
  let roadColor = '#2a3038';
  if (state.timeOfDay === 'SUNSET') {
    grassColor = '#432d1c';
    roadColor = '#28222a';
  } else if (state.timeOfDay === 'DUSK') {
    grassColor = '#132226';
    roadColor = '#1d242b';
  } else if (state.timeOfDay === 'NIGHT') {
    grassColor = '#08130e';
    roadColor = '#12161c';
  }

  ctx.fillStyle = grassColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  roadProps.forEach((prop) => {
    const offset = prop.outer ? 88 : 30;
    const px = prop.side === 'left' ? ROAD_LEFT - offset : ROAD_LEFT + ROAD_WIDTH + offset;
    if (prop.kind === 'tree') {
      ctx.fillStyle = state.timeOfDay === 'NIGHT' ? '#072417' : '#15803d';
      ctx.beginPath();
      ctx.arc(px, prop.y, prop.outer ? 18 : 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state.timeOfDay === 'NIGHT' ? '#0b3824' : '#22c55e';
      ctx.beginPath();
      ctx.arc(px - 3, prop.y - 3, prop.outer ? 12 : 9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#6e7681';
      ctx.fillRect(px - 2, prop.y - 2, 4, 4);
      if (state.timeOfDay === 'NIGHT' || state.timeOfDay === 'DUSK' || state.timeOfDay === 'SUNSET') {
        const glowX = prop.side === 'left' ? ROAD_LEFT + 14 : ROAD_LEFT + ROAD_WIDTH - 14;
        const lampGrad = ctx.createRadialGradient(glowX, prop.y, 2, glowX, prop.y, 40);
        lampGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        lampGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = lampGrad;
        ctx.beginPath();
        ctx.arc(glowX, prop.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  const milestoneY = ((state.distanceKm * 180) % (canvas.height + 120)) - 60;
  const signX = Math.max(5, ROAD_LEFT - 50);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(signX, milestoneY, 42, 44);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(signX + 1, milestoneY + 1, 40, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText('NH-44', signX + 21, milestoneY + 13);
  ctx.fillText('DELHI', signX + 21, milestoneY + 25);
  ctx.fillText(`${Math.floor(state.distanceKm)} KM`, signX + 21, milestoneY + 37);

  ctx.fillStyle = roadColor;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);

  if (state.timeOfDay === 'SUNSET') {
    ctx.fillStyle = 'rgba(251, 146, 60, 0.06)';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);
  }
  if (state.raining) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);
  }

  skidMarks.forEach((sk) => {
    ctx.fillStyle = `rgba(10, 12, 16, ${sk.alpha})`;
    ctx.fillRect(sk.x, sk.y, 3, 10);
  });

  for (let y = -48 + state.roadOffset; y < canvas.height; y += 48) {
    ctx.fillStyle = Math.floor((y - state.roadOffset) / 48) % 2 === 0 ? '#da3633' : '#f0f6fc';
    ctx.fillRect(ROAD_LEFT - 8, y, 8, 24);
    ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, y, 8, 24);
  }

  ctx.strokeStyle = 'rgba(240, 246, 252, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 24]);
  ctx.lineDashOffset = -state.roadOffset;
  for (let i = 1; i < LANES; i++) {
    const lx = ROAD_LEFT + i * LANE_WIDTH;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, canvas.height); ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.tollBannerY > -80 && state.tollBannerY < canvas.height + 60) {
    ctx.fillStyle = '#1f6feb';
    ctx.fillRect(ROAD_LEFT - 6, state.tollBannerY, ROAD_WIDTH + 12, 26);
    ctx.strokeStyle = '#f0f6fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(ROAD_LEFT - 6, state.tollBannerY, ROAD_WIDTH + 12, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('NHAI FASTag TOLL PLAZA', canvas.width / 2, state.tollBannerY + 17);
  }

  state.coins.forEach((c) => {
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('₹', c.x, c.y + 3.5);
  });

  state.pickups.forEach((orb) => {
    ctx.fillStyle = 'rgba(57, 211, 83, 0.25)';
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#39d353';
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2); ctx.fill();
  });

  state.traffic.forEach((v) => drawVehicle(v, false));
  if (state.rival) drawVehicle(state.rival, true, 'RIVAL AI');
  state.players.forEach((p) => { if (p.alive) drawVehicle(p, true); });
  if (state.police) drawPoliceInterceptor(state.police);

  particles.forEach((pt) => {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (state.raining) {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.30)';
    ctx.lineWidth = 1.1;
    rainDrops.forEach((r) => {
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 1.6, r.y + r.len);
      ctx.stroke();
    });
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  speedLines.forEach((sl) => {
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(sl.x, sl.y + sl.len);
    ctx.stroke();
  });

  state.popups.forEach((pop) => {
    ctx.fillStyle = pop.color;
    ctx.font = 'bold 13px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(pop.text, pop.x + 18, pop.y);
  });

  ctx.restore();
}

const STEP_MS = 1000 / 60;
let lastTime = 0;
let accumulator = 0;

function loop(now) {
  if (!lastTime) lastTime = now;
  accumulator += Math.min(100, now - lastTime);
  lastTime = now;
  while (accumulator >= STEP_MS) {
    update();
    accumulator -= STEP_MS;
  }
  render();
  requestAnimationFrame(loop);
}

applyRoadLayout();
initPropsAndRain();
resetGame();
renderCarPreviewCard();
syncTopNavState();
requestAnimationFrame(loop);

(function autoJoinFromInviteLink() {
  const params = new URLSearchParams(window.location.search);
  const inviteCode = (params.get('room') || '').trim();
  if (!/^\d{4}$/.test(inviteCode)) return;
  hideAllOverlays();
  resetOnlineLobbyUI();
  onlineOverlay.style.display = 'flex';
  const tryJoin = () => {
    if (typeof Peer !== 'undefined') {
      joinOnlineRoom(inviteCode);
    } else {
      setTimeout(tryJoin, 250);
    }
  };
  tryJoin();
})();
