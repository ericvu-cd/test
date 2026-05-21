// =============================================
// 🌊 ocean.js — 海洋動畫（魚、氣泡、光束）
// =============================================

// ── 氣泡 ──────────────────────────────────────
const BUBBLE_MAX      = 6;
const BUBBLE_INTERVAL = 1200;
let _bubbleTimer = null;

function createBubble() {
    const container = document.getElementById("bubbles");
    if (!container || container.children.length >= BUBBLE_MAX) return;
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 4 + Math.random() * 18;
    b.style.left   = Math.random() * 100 + "%";
    b.style.width  = size + "px";
    b.style.height = size + "px";
    const duration = 6 + Math.random() * 9;
    b.style.animationDuration = duration + "s";
    b.style.setProperty("--drift-x", (Math.random() * 16 - 8).toFixed(1) + "px");
    container.appendChild(b);
    setTimeout(() => b.remove(), duration * 1000);
}

function startBubbles() {
    if (_bubbleTimer) return;
    _bubbleTimer = setInterval(createBubble, BUBBLE_INTERVAL);
}
function stopBubbles() {
    if (_bubbleTimer) { clearInterval(_bubbleTimer); _bubbleTimer = null; }
}

// ── 海洋光束 ──────────────────────────────────
function initOceanCaustics() {
    const ocean = document.getElementById("ocean");
    if (!ocean || document.getElementById("ocean-caustics")) return;
    const layer = document.createElement("div");
    layer.id = "ocean-caustics";
    for (let i = 0; i < 5; i++) {
        const beam = document.createElement("div");
        beam.className = "caustic-beam";
        layer.appendChild(beam);
    }
    ocean.insertBefore(layer, ocean.firstChild);
}

// ── 魚體調色盤 ──────────────────────────────────
const fishPalettes = [
    { hi: "rgba(190,235,255,1)", mid: "rgba(100,185,255,0.95)", lo: "rgba(40,110,200,0.9)",   tail: "rgba(60,140,220,0.95)",  fin: "rgba(80,160,235,0.8)",  glow: "rgba(100,190,255,0.45)" },
    { hi: "rgba(255,220,170,1)", mid: "rgba(255,165,80,0.95)",  lo: "rgba(200,100,30,0.9)",   tail: "rgba(215,120,50,0.95)",  fin: "rgba(240,150,70,0.8)",  glow: "rgba(255,175,90,0.40)"  },
    { hi: "rgba(195,250,210,1)", mid: "rgba(110,215,150,0.95)", lo: "rgba(40,150,90,0.9)",    tail: "rgba(60,175,110,0.95)",  fin: "rgba(90,200,130,0.8)",  glow: "rgba(130,225,165,0.45)" },
    { hi: "rgba(235,210,255,1)", mid: "rgba(180,130,255,0.95)", lo: "rgba(110,70,210,0.9)",   tail: "rgba(140,90,225,0.95)",  fin: "rgba(165,115,245,0.8)", glow: "rgba(185,145,255,0.45)" },
    { hi: "rgba(255,245,180,1)", mid: "rgba(255,210,60,0.95)",  lo: "rgba(190,145,10,0.9)",   tail: "rgba(210,165,30,0.95)",  fin: "rgba(245,200,50,0.8)",  glow: "rgba(255,215,80,0.40)"  },
    { hi: "rgba(185,250,255,1)", mid: "rgba(70,215,235,0.95)",  lo: "rgba(20,155,175,0.9)",   tail: "rgba(40,180,200,0.95)",  fin: "rgba(70,210,230,0.8)",  glow: "rgba(90,220,240,0.45)"  },
    { hi: "rgba(255,215,225,1)", mid: "rgba(255,150,175,0.95)", lo: "rgba(210,80,115,0.9)",   tail: "rgba(230,110,145,0.95)", fin: "rgba(255,140,165,0.8)", glow: "rgba(255,165,190,0.40)" },
    { hi: "rgba(240,248,255,1)", mid: "rgba(200,225,245,0.90)", lo: "rgba(140,175,210,0.85)", tail: "rgba(160,195,225,0.90)", fin: "rgba(185,215,240,0.75)",glow: "rgba(210,235,250,0.35)" },
];

// ── 魚體建立 ──────────────────────────────────
function createFish(forceSprint = false) {
    const palette  = fishPalettes[Math.floor(Math.random() * fishPalettes.length)];
    const isSprint = forceSprint || Math.random() < 0.05;
    const depth    = isSprint ? 2 : Math.floor(Math.random() * 3);

    const cfg = [
        { scale: 0.28, opacity: 0.28, speedBase: 22, speedVar: 10, waveAmp: 5,  tiltAmp: 1.5, wagSpeed: 0.55, finH: 0.30 },
        { scale: 0.58, opacity: 0.52, speedBase: 12, speedVar: 7,  waveAmp: 14, tiltAmp: 3.0, wagSpeed: 0.40, finH: 0.35 },
        { scale: 1.00, opacity: 0.90, speedBase: 5,  speedVar: 5,  waveAmp: 24, tiltAmp: 5.0, wagSpeed: 0.28, finH: 0.40 },
    ][depth];

    const speed     = isSprint ? 7 + Math.random() * 3 : cfg.speedBase + Math.random() * cfg.speedVar;
    const waveDur   = isSprint ? 1.4 : 1.8 + Math.random() * 2.5;
    const waveDelay = isSprint ? 0   : Math.random() * 2;
    const topPct    = isSprint ? 15 + Math.random() * 60 : 8 + Math.random() * 72;

    const size = 40 * cfg.scale;
    const h    = size * 0.48;

    const bodyGrad = `radial-gradient(ellipse at 38% 32%, ${palette.hi} 0%, ${palette.mid} 45%, ${palette.lo} 100%)`;
    const glowMult  = isSprint ? 0.6 : 0.5;
    const glowMult2 = isSprint ? 1.5 : 1.2;
    const bodyShadow = `
        inset -2px -2px 5px rgba(0,0,0,0.25),
        inset  1px  1px 4px rgba(255,255,255,0.15),
        0 0 ${size * glowMult}px ${palette.glow},
        0 0 ${size * glowMult2}px ${palette.glow.replace("0.4","0.15").replace("0.45","0.15").replace("0.35","0.12").replace("0.40","0.12").replace("0.30","0.10")}
    `;

    const wrapper = document.createElement("div");
    wrapper.className = "fish";
    wrapper.style.cssText = `
        position: absolute; top: ${topPct}%; right: -120px; opacity: ${cfg.opacity};
        --wave-amp: ${cfg.waveAmp}px; --tilt-amp: ${cfg.tiltAmp}deg;
        animation: fishWave ${waveDur}s ${waveDelay}s ease-in-out infinite;
        ${isSprint ? "filter: brightness(1.3) saturate(1.2);" : ""}
    `;

    const inner = document.createElement("div");
    inner.style.cssText = `animation: swim ${speed}s linear forwards;`;

    const body = document.createElement("div");
    body.className = "fish-body";
    body.style.cssText = `
        width: ${size}px; height: ${h}px;
        background: ${bodyGrad}; box-shadow: ${bodyShadow};
        animation: fishBodySway ${waveDur}s ${waveDelay}s ease-in-out infinite;
    `;

    const fin = document.createElement("div");
    fin.className = "fish-fin";
    const finH = h * cfg.finH;
    const finW = size * 0.28;
    fin.style.cssText = `
        border-left: ${finW * 0.35}px solid transparent;
        border-right: ${finW * 0.65}px solid transparent;
        border-bottom: ${finH}px solid ${palette.fin};
        animation-duration: ${waveDur * 0.9}s; animation-delay: ${waveDelay}s;
    `;

    const tail = document.createElement("div");
    tail.className = "fish-tail";
    const tailW = size * 0.25, tailH = h * 0.70, tailTop = (h - tailH) / 2;
    tail.style.cssText = `
        width: ${tailW}px; height: ${tailH}px; top: ${tailTop}px;
        background: ${palette.tail};
        animation: tailWag ${isSprint ? "0.22s" : cfg.wagSpeed + "s"} ${waveDelay}s ease-in-out infinite;
    `;

    const eye = document.createElement("div");
    eye.className = "fish-eye";
    const es = Math.max(3, h * 0.20);
    eye.style.cssText = `width:${es}px; height:${es}px;`;

    body.appendChild(fin); body.appendChild(tail); body.appendChild(eye);
    inner.appendChild(body);
    wrapper.appendChild(inner);
    document.getElementById("fish-layer").appendChild(wrapper);

    setTimeout(() => wrapper.remove(), speed * 1000 + 500);
}

// ── 魚排程 ──────────────────────────────────
const FISH_MAX      = 5;
const FISH_INTERVAL = 4500;
let _fishTimer   = null;
let _sprintTimer = null;

function startFish() {
    if (_fishTimer) return;
    _fishTimer = setInterval(() => {
        const layer = document.getElementById("fish-layer");
        if (layer && layer.children.length < FISH_MAX) createFish();
    }, FISH_INTERVAL);
    scheduleSprintFish();
}
function stopFish() {
    if (_fishTimer)   { clearInterval(_fishTimer);  _fishTimer   = null; }
    if (_sprintTimer) { clearTimeout(_sprintTimer); _sprintTimer = null; }
}
function scheduleSprintFish() {
    const delay = 15000 + Math.random() * 10000;
    _sprintTimer = setTimeout(() => {
        const layer = document.getElementById("fish-layer");
        if (layer && layer.children.length < FISH_MAX) createFish(true);
        scheduleSprintFish();
    }, delay);
}

// ── 預載圖片 ──────────────────────────────────
function preloadImages(prefix, count) {
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = `${prefix}${i}.jpg`;
        img.decode().catch(() => {});
    }
}
function preloadFishImages() {
    if (typeof fishDB === "undefined") return;
    fishDB.forEach(f => {
        const img = new Image();
        img.src = `fishdb/${f.n}.png`;
        img.decode().catch(() => {});
    });
}

// ── Page Visibility（背景省電） ──────────────
document.addEventListener('visibilitychange', () => {
    const inGame = document.body.classList.contains('game-started');
    if (document.hidden) {
        stopFish(); stopBubbles();
        const bgm = document.getElementById('bgm');
        if (bgm && !bgm.paused) { bgm._wasPlaying = true; bgm.pause(); }
    } else {
        if (inGame) { startFish(); startBubbles(); }
        const bgm = document.getElementById('bgm');
        if (bgm && bgm._wasPlaying && sfxEnabled) { bgm._wasPlaying = false; bgm.play().catch(() => {}); }
        else if (bgm) bgm._wasPlaying = false;
    }
});

// DOMContentLoaded 預載
document.addEventListener('DOMContentLoaded', () => {
    preloadImages('P', 9);
    preloadImages('F', 18);
    preloadFishImages();
    initOceanCaustics();
});
