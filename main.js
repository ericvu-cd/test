let gameDifficulty = 0.4;

// ── 對話排隊系統 ──────────────────────────────
const chatQueue = {
    _q: [],
    _timer: null,
    _interval: 1800,

    push(p, msg) {
        this._q.push({ p, msg });
        if (!this._timer) this._flush();
    },

    _flush() {
        if (!this._q.length) { this._timer = null; return; }
        const { p, msg } = this._q.shift();
        showChat(p, msg);
        this._timer = setTimeout(() => this._flush(), this._interval);
    },

    clear() {
        this._q = [];
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    }
};

// ── 玩家收集進度系統 ──────────────────────────
const progress = {
    _key(name) { return "progress_" + name; },

    load(name) {
        if (!name || !name.trim()) return null;
        try {
            const raw = localStorage.getItem(this._key(name.trim()));
            return raw ? JSON.parse(raw) : { badges: [], fish: [], difficulty: [] };
        } catch(e) { return { badges: [], fish: [] }; }
    },

    save(name, data) {
        if (!name || !name.trim()) return;
        try { localStorage.setItem(this._key(name.trim()), JSON.stringify(data)); } catch(e) {}
    },

    unlockBadge(name, badgeName) {
        if (!name || !name.trim() || name.trim() === '守護員') return;
        const data = this.load(name);
        if (!data.badges.includes(badgeName)) {
            data.badges.push(badgeName);
            this.save(name, data);
        }
    },

    unlockFish(name, fishName) {
        if (!name || !name.trim() || name.trim() === '守護員') return;
        const data = this.load(name);
        if (!data.fish.includes(fishName)) {
            data.fish.push(fishName);
            this.save(name, data);
        }
    },

    unlockDifficulty(name, label) {
        if (!name || !name.trim() || name.trim() === '守護員') return;
        const data = this.load(name);
        if (!data.difficulty) data.difficulty = [];
        if (!data.difficulty.includes(label)) {
            data.difficulty.push(label);
            this.save(name, data);
        }
    }
};

let roundChatCount = 0; // 每回合對話上限計數器（上限 2）
let sfxEnabled = sessionStorage.getItem("sfxEnabled") !== "false";
let showSummaryMode = true; // 預設開啟結算頁面
let roundReport = [];       // 每回合出牌結果紀錄
let handFlipTimers = [];     // 手牌翻轉計時器

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 預載圖片功能
function preloadImages(prefix, count) {
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = `${prefix}${i}.jpg`;
        img.decode().catch(() => {}); // 背景解碼，避免顯示時卡頓
    }
}

// DOMContentLoaded 即刻預載（比 load 早，不等 BGM/大圖載完）
document.addEventListener('DOMContentLoaded', () => {
    preloadImages('P', 9);  // 預載故事 P1-P9
    preloadImages('F', 18); // 預載說明 F1-F18
    preloadFishImages();     // 預載所有魚圖片
    initOceanCaustics();     // 初始化海洋光束
});

// 預載魚圖片
function preloadFishImages() {
    if (typeof fishDB === "undefined") return;
    fishDB.forEach(f => {
        const img = new Image();
        img.src = `fishdb/${f.n}.png`;
        img.decode().catch(() => {}); // 背景解碼，顯示時零延遲
    });
}

// --- 故事與說明功能 ---
let storyIdx = 1;
let storyTimer = null;
const totalStories = 9;
// 新增說明專用的背景音樂
const infoBGM = new Audio('MZ.mp3'); 
infoBGM.loop = true; // 設定循環播放

// --- 故事滑動控制變數 ---
let touchStartX = 0;
let touchEndX = 0;

function prevStory() {
    stopStoryTimer();
    if (storyIdx > 1) { storyIdx--; updateStory(); startStoryTimer(); }
}

function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (diff < -50) nextStory();
    else if (diff > 50) prevStory();
}

// --- 說明功能變數 ---
let infoIdx = 1;
let infoTimer = null;
const totalInfo = 18;
let infoTouchStartX = 0;
let infoTouchEndX = 0;

// 判斷滑動方向（左滑下一頁，右滑上一頁）
function prevInfo() {
    stopInfoTimer();
    if (infoIdx > 1) { infoIdx--; updateInfo(); startInfoTimer(); }
}

function handleSwipeInfo() {
    const diff = infoTouchEndX - infoTouchStartX;
    if (diff < -50) nextInfo();
    else if (diff > 50) prevInfo();
}

function openInfo() {
    infoIdx = 1;
    updateInfo();
    const overlay = document.getElementById("info-overlay");
    overlay.style.display = "flex";
    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";
	
	infoBGM.currentTime = 0; // 從頭播放
    if (sfxEnabled) {
        infoBGM.play().catch(e => console.log("音樂播放受阻，需使用者互動過才能播放:", e));
    }
	
    startInfoTimer();

    // 綁定觸控事件 (使用 on 避免重複綁定)
    overlay.ontouchstart = (e) => {
        infoTouchStartX = e.changedTouches[0].screenX;
    };

    overlay.ontouchend = (e) => {
        infoTouchEndX = e.changedTouches[0].screenX;
        handleSwipeInfo();
    };
}

function updateInfo() {
    document.getElementById("info-img").src = `F${infoIdx}.jpg`;
    document.getElementById("info-page-num").innerText = `${infoIdx} / ${totalInfo}`;
}

function nextInfo() {
    stopInfoTimer();
    if (infoIdx < totalInfo) {
        infoIdx++;
        updateInfo();
        startInfoTimer();
    } else {
        closeInfo();
    }
}

function startInfoTimer() {
    stopInfoTimer();
    infoTimer = setTimeout(() => {
        if (infoIdx < totalInfo) {
            infoIdx++;
            updateInfo();
            startInfoTimer();
        } else {
            closeInfo();
        }
    }, 10000); // 10秒自動換頁
}

function stopInfoTimer() {
    if (infoTimer) clearTimeout(infoTimer);
}

function closeInfo() {
    stopInfoTimer();
    document.getElementById("info-overlay").style.display = "none";
	infoBGM.pause();
}

// 日誌視窗功能
function openLog() {
    document.getElementById("log-modal").style.display = "flex";
}
function closeLog() {
    document.getElementById("log-modal").style.display = "none";
}

function openCollection() {
    const name = window.playerName && window.playerName !== '守護員' ? window.playerName : null;
    const data = name ? (progress.load(name) || { badges: [], fish: [], difficulty: [] }) : { badges: [], fish: [], difficulty: [] };

    const locationBadges = typeof locationDB !== 'undefined'
        ? locationDB.map(l => l.badge)
        : [];
    const difficultyBadges = ["新手", "標準", "專業"];
    const fishList = typeof fishDB !== 'undefined' ? fishDB.map(f => f.n) : [];

    const unlockedB = data.badges || [];
    const unlockedD = data.difficulty || [];
    const unlockedF = data.fish || [];

    const totalAll = locationBadges.length + difficultyBadges.length + fishList.length;
    const totalUnlocked = unlockedB.length + unlockedD.length + unlockedF.length;

    function pct(got, total) { return total ? Math.round(got / total * 100) : 0; }

    function badgeBlock(label, list, unlocked, imgPath) {
        const got = list.filter(n => unlocked.includes(n)).length;
        const isFish = label === '魚紋章';
        const cols = isFish ? 4 : 3;
        return `
        <div style="margin-bottom:1.4rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.6);letter-spacing:0.04em;">${label}</span>
            <span style="font-size:12px;color:rgba(255,255,255,0.45);">${got} / ${list.length}</span>
          </div>
          <div style="background:rgba(255,255,255,0.08);border-radius:99px;height:3px;margin-bottom:10px;overflow:hidden;">
            <div style="height:100%;border-radius:99px;background:#1D9E75;width:${pct(got,list.length)}%;transition:width 0.6s ease;"></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${isFish ? 6 : 10}px;">
            ${list.map(n => {
                const isUnlocked = unlocked.includes(n);
                const nameSize = isFish ? '9px' : '10px';
                const imgStyle = isFish
                    ? `width:100%;aspect-ratio:3/2;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,${isUnlocked?'0.18':'0.06'});background:rgba(255,255,255,0.05);${isUnlocked?'':'filter:grayscale(1) brightness(0.3)'};`
                    : `width:100%;aspect-ratio:3/2;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,${isUnlocked?'0.22':'0.06'});background:rgba(255,255,255,0.05);${isUnlocked?'':'filter:grayscale(1) brightness(0.3)'};`;
                return `
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                  <div style="${imgStyle}">
                    <img src="${imgPath(n)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                  </div>
                  <div style="font-size:${nameSize};text-align:center;color:rgba(255,255,255,${isUnlocked?'0.75':'0.25'});line-height:1.2;">${n}</div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    const existing = document.getElementById('collection-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'collection-modal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:6000;
        background:rgba(0,0,0,0.7);
        display:flex;flex-direction:column;justify-content:flex-end;
        backdrop-filter:blur(4px);
    `;

    modal.innerHTML = `
        <div style="background:rgba(10,18,35,0.97);border-radius:20px 20px 0 0;max-height:85vh;display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);margin:12px auto 0;flex-shrink:0;"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;">
            <div style="font-size:16px;font-weight:500;color:rgba(255,255,255,0.9);">🐠 我的海紋收集</div>
            <button onclick="closeCollection()" style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
          ${name ? `
          <div style="padding:10px 16px;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;background:rgba(29,158,117,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:#5DCAA5;">${name.charAt(0)}</div>
            <div>
              <div style="font-size:14px;font-weight:500;color:rgba(255,255,255,0.85);">${name}</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.4);">已收集 ${totalUnlocked} / ${totalAll}</div>
            </div>
          </div>` : `
          <div style="padding:10px 16px;font-size:13px;color:rgba(255,255,255,0.4);border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">未輸入暱稱，不記錄收集進度</div>`}
          <div style="overflow-y:auto;padding:16px;-webkit-overflow-scrolling:touch;">
            ${badgeBlock('漁港章', locationBadges, unlockedB, n => `${n}.jpg`)}
            ${badgeBlock('難度章', difficultyBadges, unlockedD, n => `${n}.jpg`)}
            ${badgeBlock('魚紋章', fishList, unlockedF, n => `fishdb/${n}.png`)}
          </div>
        </div>
    `;

    modal.addEventListener('click', e => { if (e.target === modal) closeCollection(); });
    document.body.appendChild(modal);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        modal.querySelector('div[style*="border-radius:20px"]').style.transform = 'translateY(0)';
    }));
}

function closeCollection() {
    const modal = document.getElementById('collection-modal');
    if (modal) modal.remove();
}

let players = [], deckS = [], table = [], currentS = null, callerIdx = 0, phase = "WAIT";
let initialHands = []; // 各局開始時的初始手牌快照，遊戲結束時寫入 LOG

// 真正均勻的 Fisher-Yates 洗牌（取代有偏的 sort+random）
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// UI 鎖定：等待動畫/AI計算時，攔截所有使用者觸控
function lockUI() {
    const el = document.getElementById("ui-lock");
    if (el) el.style.display = "block";
}
function unlockUI() {
    const el = document.getElementById("ui-lock");
    if (el) el.style.display = "none";
}

// --- 標籤生成邏輯 ---
function getFishTags(f) {
    let html = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1px;">';
    
    if (f.s.includes("全年")) html += `<span class="tag tag-all">全年</span>`;
    else {
        if (f.s.includes("春")) html += `<span class="tag tag-spring">春</span>`;
        if (f.s.includes("夏")) html += `<span class="tag tag-summer">夏</span>`;
        if (f.s.includes("秋")) html += `<span class="tag tag-autumn">秋</span>`;
        if (f.s.includes("冬")) html += `<span class="tag tag-winter">冬</span>`;
    }

    const ecoMethods = ["一支釣", "定置", "養殖", "手釣", "棒受網", "籠具", "釣具", "標槍"];
    f.m.forEach(method => {
        const isEco = ecoMethods.some(eco => method.includes(eco));
        html += `<span class="tag ${isEco ? 'tag-eco' : 'tag-warn'}">${method}</span>`;
    });

    const hClass = f.h.includes("洄游") ? "tag-migratory" : "tag-sedentary";
    html += `<span class="tag ${hClass}">${f.h}</span>`;

    let dClass = "tag-coastal";
    if (f.d.includes("遠洋")) dClass = "tag-ocean";
    if (f.d.includes("養殖")) dClass = "tag-farm";
    html += `<span class="tag ${dClass}">${f.d}</span>`;

    html += '</div>';
    return html;
}

// 手牌反面標籤：輸出純 span 串，由 .card-back-tags 容器排版
function getHandBackTags(f) {
    let html = "";
    const ecoMethods = ["一支釣", "定置", "養殖", "手釣", "棒受網", "籠具", "釣具", "標槍"];

    if (f.s.includes("全年")) html += `<span class="tag tag-all">全年</span>`;
    else {
        if (f.s.includes("春")) html += `<span class="tag tag-spring">春</span>`;
        if (f.s.includes("夏")) html += `<span class="tag tag-summer">夏</span>`;
        if (f.s.includes("秋")) html += `<span class="tag tag-autumn">秋</span>`;
        if (f.s.includes("冬")) html += `<span class="tag tag-winter">冬</span>`;
    }

    f.m.forEach(method => {
        const isEco = ecoMethods.some(eco => method.includes(eco));
        html += `<span class="tag ${isEco ? 'tag-eco' : 'tag-warn'}">${method}</span>`;
    });

    const hClass = f.h.includes("洄游") ? "tag-migratory" : "tag-sedentary";
    html += `<span class="tag ${hClass}">${f.h}</span>`;

    let dClass = "tag-coastal";
    if (f.d.includes("遠洋")) dClass = "tag-ocean";
    if (f.d.includes("養殖")) dClass = "tag-farm";
    html += `<span class="tag ${dClass}">${f.d}</span>`;

    return html;
}

// 卡牌預覽功能 (2X放大)
let previewTimeout = null;

/**
 * @param {number|null} idx - 手牌索引，如果是海洋區卡片則傳 null
 * @param {HTMLElement} originalCardEl - 原始卡片 DOM
 * @param {boolean} isHand - 是否為手牌 (決定是否顯示操作按鈕)
 */
function showCardPreview(idx, fish, isHand = true) {
    const overlay = document.getElementById("card-preview-overlay");
    const container = document.getElementById("card-preview-container");

    container.innerHTML = "";
    if (previewTimeout) clearTimeout(previewTimeout);

    // 燈號對應淡色背景
    const lightBg = fish.l === 1 ? "#d4f5e2" : fish.l === 2 ? "#fef3cd" : "#ffd6da";
    const lightBorder = fish.l === 1 ? "#77D9A8" : fish.l === 2 ? "#f9e1a9" : "#ffb3ba";

    // 詳情卡片
    const card = document.createElement("div");
    card.className = "preview-detail-card";
    card.style.borderColor = lightBorder;

    card.innerHTML = `
        <div class="preview-fish-img-wrap">
            <img src="fishdb/${fish.n}.png"
                 onerror="this.style.display='none'; this.parentNode.classList.add('no-img')"
                 alt="${fish.n}" class="preview-fish-img">
        </div>
        <div class="preview-fish-name" style="background:${lightBg};">${fish.n}</div>
        <div class="preview-fish-tags">${getFishTags(fish)}</div>
        <div class="preview-fish-desc">${fish.i || ""}</div>
    `;

    container.appendChild(card);

    // 出牌模式：手牌 + 玩家回合 → 綠勾紅叉；閱覽模式 → 只有紅叉
    if (isHand && phase.includes("PLAYER")) {
        const controls = document.createElement("div");
        controls.className = "preview-controls";

        const btnCancel = document.createElement("button");
        btnCancel.className = "preview-btn btn-cancel";
        btnCancel.innerHTML = "❌";
        btnCancel.onclick = (e) => { e.stopPropagation(); closePreview(); };

        const btnConfirm = document.createElement("button");
        btnConfirm.className = "preview-btn btn-confirm";
        btnConfirm.innerHTML = "✔️";
        btnConfirm.onclick = (e) => { e.stopPropagation(); closePreview(); playerAction(idx); };

        controls.appendChild(btnConfirm);
        controls.appendChild(btnCancel);
        container.appendChild(controls);
    } else {
        // 閱覽模式：紅叉提早關閉（計時器仍會自動關閉）
        const controls = document.createElement("div");
        controls.className = "preview-controls";

        const btnClose = document.createElement("button");
        btnClose.className = "preview-btn btn-cancel";
        btnClose.innerHTML = "❌";
        btnClose.onclick = (e) => { e.stopPropagation(); closePreview(); };

        controls.appendChild(btnClose);
        container.appendChild(controls);
    }

    overlay.style.display = "flex";

    // 手牌時自動關閉延長到 6 秒，桌面牌 4 秒
    previewTimeout = setTimeout(closePreview, isHand ? 6000 : 4000);
}

function closePreview() {
    if (previewTimeout) clearTimeout(previewTimeout);
    document.getElementById("card-preview-overlay").style.display = "none";
    document.getElementById("card-preview-container").innerHTML = "";
}

// --- 遊戲運行邏輯與 UI 渲染 ---
function renderUI() {

    players.forEach((p, i) => { 
        if(i > 0) {
			const isLastCard = p.hand.length === 1;
            const dangerClass = isLastCard ? "ai-last-card-danger" : "";
            
            // 將閃爍類別套用在包覆 🎴 的容器上
            const cardsIcon = `
                <span class="${dangerClass}" style="letter-spacing: -5px; display: inline-block; white-space: nowrap;">
                    ${"🎴".repeat(p.hand.length)}
                </span>`;
            
            document.getElementById(p.id).innerHTML = `
                <div class="avatar-img">${p.avatar}</div>
                <div class="ai-name">${p.n}</div>
                <div class="ai-cards">${cardsIcon}</div>
            `;
        }
    });

// --- 優化 3: 牌組告急閃爍 ---
    const deckInfo = document.getElementById("deck-info");
    deckInfo.innerText = `剩餘${deckS.length}次召喚`;
    if (deckS.length <= 5) {
        deckInfo.classList.add("deck-danger");
    } else {
        deckInfo.classList.remove("deck-danger");
    }
    
	const handEl = document.getElementById("player-hand");
    handEl.innerHTML = "";

    // 清除所有舊翻轉計時器，避免疊加
    handFlipTimers.forEach(t => clearInterval(t));
    handFlipTimers = [];

    const isNormalTask = currentS && !currentS.isMazu && phase === "PLAYER_TURN" && callerIdx === 0;

    players[0].hand.forEach((f, idx) => {
        const c = document.createElement("div");
        c.className = `card light-${f.l}`;
        const isValid = isNormalTask && currentS.c(f);

        // 正面：魚名 + 魚圖
        const front = document.createElement("div");
        front.className = "card-front";
        front.innerHTML = `<div class="card-n">${f.n}</div><div class="card-img"><img src="fishdb/${f.n}.png" alt="${f.n}" onerror="this.style.display='none'"></div>`;

        // 反面：魚名 + 特性標籤
        const back = document.createElement("div");
        back.className = "card-back";
        back.innerHTML = `<div class="card-n">${f.n}</div><div class="card-back-tags">${getHandBackTags(f)}</div>`;

        c.appendChild(front);
        c.appendChild(back);

        if (isValid) {
            const dot = document.createElement("span");
            dot.className = "valid-dot";
            c.appendChild(dot);
        }

        // 手牌點擊：放大預覽，並帶有出牌功能
        c.onclick = () => showCardPreview(idx, f, true);

        // 每 5 秒翻轉；若卡片已離開 DOM 則自動清除
        const timer = setInterval(() => {
            if (c.isConnected) {
                c.classList.toggle("flipped");
            } else {
                clearInterval(timer);
            }
        }, 5000);
        handFlipTimers.push(timer);

        handEl.appendChild(c);
    });
    // 玩家回合時強高亮手牌區
    const isMyTurn = phase === "PLAYER_TURN" || phase === "PLAYER_MAZU";
    document.getElementById("player-zone").classList.toggle("my-turn", isMyTurn);
    setTimeout(updateHandArrows, 50);

    // 抽屜：玩家回合顯示上滑提示，非玩家回合隱藏
    updateDrawerArrow(isMyTurn);
}

function updateHandArrows() {
    const hand = document.getElementById('player-hand');
    const leftArrow  = document.getElementById('arrow-left');
    const rightArrow = document.getElementById('arrow-right');
    if (!hand || !leftArrow || !rightArrow) return;

    const isOverflowing = hand.scrollWidth > hand.clientWidth + 2;
    if (isOverflowing) {
        leftArrow.style.display  = hand.scrollLeft > 5 ? 'flex' : 'none';
        const maxScroll = hand.scrollWidth - hand.clientWidth;
        rightArrow.style.display = hand.scrollLeft < maxScroll - 5 ? 'flex' : 'none';
    } else {
        leftArrow.style.display  = 'none';
        rightArrow.style.display = 'none';
    }
}

// 確保點擊遮罩背景也能關閉預覽
document.getElementById("card-preview-overlay").onclick = (e) => {
    if(e.target.id === "card-preview-overlay") {
        closePreview();
    }
};

function renderTable() {
    const zone = document.getElementById("table");
    zone.innerHTML = "";
    table.forEach((t, index) => {
        const c = document.createElement("div");
        c.className = `card light-${t.card.l}`;
        c.innerHTML = `<div class="card-n">${t.card.n}</div><div class="card-i">${getFishTags(t.card)}</div>`;
        
        // 海洋區卡片點擊：放大預覽，但不帶功能
        c.onclick = () => showCardPreview(null, t.card, false);
        
        zone.appendChild(c);
        if (index === table.length - 1) { 
            void c.offsetWidth; 
            c.classList.add("card-played"); 
        }
    });
}



let logPlainText = []; // 純文字 log，供複製分析用

function addLog(m, type="") {
    const l = document.getElementById("log-messages");
    let className = "log-entry";
    if(type === "cmd") className += " log-cmd";
    if(type === "secret") className += " log-secret";
    if(type === "success") className += " log-success";
    const rPrefix = roundCount > 0 ? `[R${roundCount}] ` : "";
    // 純文字版本（移除 HTML 標籤）
    const plainLine = `${rPrefix}${m.replace(/<[^>]*>/g, "")}`;
    logPlainText.unshift(plainLine); // 同樣最新在前
    const prefix = roundCount > 0 ? `<span style="color:#aaa; font-size:0.85em;">[R${roundCount}]</span> ` : "";
    l.insertAdjacentHTML('afterbegin', `<div class="${className}">> ${prefix}${m}</div>`);
}

function copyLog() {
    const text = logPlainText.join("\n");
    const btn = document.getElementById("log-copy-btn");
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "✓ 已複製";
        btn.style.background = "#b9f6ca";
        btn.style.color = "#1b5e20";
        setTimeout(() => {
            btn.textContent = "📋 複製";
            btn.style.background = "";
            btn.style.color = "";
        }, 2000);
    }).catch(() => {
        // fallback：建立 textarea 手動選取
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;height:50vh;z-index:9999;font-size:12px;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        btn.textContent = "👆 長按選取";
        setTimeout(() => {
            ta.remove();
            btn.textContent = "📋 複製";
        }, 8000);
    });
}

function toggleMusic() {
    const music = document.getElementById("bgm");
    const btn = document.getElementById("music-control");
    if (music.paused) {
        music.play();
        sfxEnabled = true;
        btn.innerText = "🎵";
        btn.style.filter = "sepia(1) saturate(3) hue-rotate(175deg) brightness(1.4)";
        btn.style.opacity = "1";
    } else {
        music.pause();
        sfxEnabled = false;
        btn.innerText = "🔇";
        btn.style.filter = "";
        btn.style.opacity = "0.4";
    }
}

const BUBBLE_MAX = 6;       // 同時最多幾顆
const BUBBLE_INTERVAL = 1200; // 每 1200ms 嘗試生一顆
let _bubbleTimer = null;

function createBubble() {
    const container = document.getElementById("bubbles");
    if (!container) return;
    if (container.children.length >= BUBBLE_MAX) return; // 超過上限就跳過
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 4 + Math.random() * 18;
    b.style.left = Math.random() * 100 + "%";
    b.style.width  = size + "px";
    b.style.height = size + "px";
    const duration = 6 + Math.random() * 9;
    b.style.animationDuration = duration + "s";
    // 每顆泡泡獨立的左右飄移方向與距離（-8px ~ +8px）
    const drift = (Math.random() * 16 - 8).toFixed(1);
    b.style.setProperty("--drift-x", drift + "px");
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

// =============================================
// 🐟 魚體調色盤（每種魚有亮色/中色/暗色三層）
// =============================================
const fishPalettes = [
    // 海藍色
    { hi: "rgba(190,235,255,1)", mid: "rgba(100,185,255,0.95)", lo: "rgba(40,110,200,0.9)",  tail: "rgba(60,140,220,0.95)", fin: "rgba(80,160,235,0.8)",  glow: "rgba(100,190,255,0.45)" },
    // 珊瑚橘
    { hi: "rgba(255,220,170,1)", mid: "rgba(255,165,80,0.95)",  lo: "rgba(200,100,30,0.9)",  tail: "rgba(215,120,50,0.95)", fin: "rgba(240,150,70,0.8)",  glow: "rgba(255,175,90,0.40)" },
    // 翠綠色
    { hi: "rgba(195,250,210,1)", mid: "rgba(110,215,150,0.95)", lo: "rgba(40,150,90,0.9)",   tail: "rgba(60,175,110,0.95)", fin: "rgba(90,200,130,0.8)",  glow: "rgba(130,225,165,0.45)" },
    // 薰衣草紫
    { hi: "rgba(235,210,255,1)", mid: "rgba(180,130,255,0.95)", lo: "rgba(110,70,210,0.9)",  tail: "rgba(140,90,225,0.95)", fin: "rgba(165,115,245,0.8)", glow: "rgba(185,145,255,0.45)" },
    // 金黃色
    { hi: "rgba(255,245,180,1)", mid: "rgba(255,210,60,0.95)",  lo: "rgba(190,145,10,0.9)",  tail: "rgba(210,165,30,0.95)", fin: "rgba(245,200,50,0.8)",  glow: "rgba(255,215,80,0.40)" },
    // 青藍色
    { hi: "rgba(185,250,255,1)", mid: "rgba(70,215,235,0.95)",  lo: "rgba(20,155,175,0.9)",  tail: "rgba(40,180,200,0.95)", fin: "rgba(70,210,230,0.8)",  glow: "rgba(90,220,240,0.45)" },
    // 玫瑰粉（新增）
    { hi: "rgba(255,215,225,1)", mid: "rgba(255,150,175,0.95)", lo: "rgba(210,80,115,0.9)",  tail: "rgba(230,110,145,0.95)",fin: "rgba(255,140,165,0.8)", glow: "rgba(255,165,190,0.40)" },
    // 銀白色（遠景常見）
    { hi: "rgba(240,248,255,1)", mid: "rgba(200,225,245,0.90)", lo: "rgba(140,175,210,0.85)", tail: "rgba(160,195,225,0.90)",fin: "rgba(185,215,240,0.75)",glow: "rgba(210,235,250,0.35)" },
];

// =============================================
// 🌊 海洋光束初始化（只執行一次）
// =============================================
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
    // 插在 ocean 的最前面（最底層）
    ocean.insertBefore(layer, ocean.firstChild);
}

// =============================================
// 🐟 魚體建立（完整強化版）
// =============================================
function createFish(forceSprint = false) {
    const palette = fishPalettes[Math.floor(Math.random() * fishPalettes.length)];

    // ── 深度分層 ──────────────────────────────────
    const isSprint = forceSprint || Math.random() < 0.05;
    const depth = isSprint ? 2 : Math.floor(Math.random() * 3);

    const cfg = [
        { scale: 0.28, opacity: 0.28, speedBase: 22, speedVar: 10, waveAmp: 5,  tiltAmp: 1.5, wagSpeed: 0.55, finH: 0.30 },
        { scale: 0.58, opacity: 0.52, speedBase: 12, speedVar: 7,  waveAmp: 14, tiltAmp: 3.0, wagSpeed: 0.40, finH: 0.35 },
        { scale: 1.00, opacity: 0.90, speedBase: 5,  speedVar: 5,  waveAmp: 24, tiltAmp: 5.0, wagSpeed: 0.28, finH: 0.40 },
    ][depth];

    const speed    = isSprint ? 7 + Math.random() * 3 : cfg.speedBase + Math.random() * cfg.speedVar;
    const waveDur  = isSprint ? 1.4 : 1.8 + Math.random() * 2.5;
    const waveDelay = isSprint ? 0 : Math.random() * 2;
    const topPct   = isSprint ? 15 + Math.random() * 60 : 8 + Math.random() * 72;

    const size = 40 * cfg.scale;
    const h    = size * 0.48;

    const bodyGrad = `
        radial-gradient(ellipse at 38% 32%,
            ${palette.hi}   0%,
            ${palette.mid}  45%,
            ${palette.lo}   100%
        )
    `;

    // 衝刺魚發光加強
    const glowMult = isSprint ? 0.6 : 0.5;
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
        position: absolute;
        top: ${topPct}%;
        right: -120px;
        opacity: ${cfg.opacity};
        --wave-amp: ${cfg.waveAmp}px;
        --tilt-amp: ${cfg.tiltAmp}deg;
        animation: fishWave ${waveDur}s ${waveDelay}s ease-in-out infinite;
        ${isSprint ? "filter: brightness(1.3) saturate(1.2);" : ""}
    `;

    const inner = document.createElement("div");
    inner.style.cssText = `animation: swim ${speed}s linear forwards;`;

    const body = document.createElement("div");
    body.className = "fish-body";
    body.style.cssText = `
        width: ${size}px;
        height: ${h}px;
        background: ${bodyGrad};
        box-shadow: ${bodyShadow};
        animation: fishBodySway ${waveDur}s ${waveDelay}s ease-in-out infinite;
    `;

    const fin = document.createElement("div");
    fin.className = "fish-fin";
    const finH = h * cfg.finH;
    const finW = size * 0.28;
    fin.style.cssText = `
        border-left:   ${finW * 0.35}px solid transparent;
        border-right:  ${finW * 0.65}px solid transparent;
        border-bottom: ${finH}px solid ${palette.fin};
        animation-duration: ${waveDur * 0.9}s;
        animation-delay:    ${waveDelay}s;
    `;

    const tail = document.createElement("div");
    tail.className = "fish-tail";
    const tailW = size * 0.25;
    const tailH = h * 0.70;
    const tailTop = (h - tailH) / 2;
    tail.style.cssText = `
        width:      ${tailW}px;
        height:     ${tailH}px;
        top:        ${tailTop}px;
        background: ${palette.tail};
        animation:  tailWag ${isSprint ? "0.22s" : cfg.wagSpeed + "s"} ${waveDelay}s ease-in-out infinite;
    `;

    const eye = document.createElement("div");
    eye.className = "fish-eye";
    const es = Math.max(3, h * 0.20);
    eye.style.cssText = `width:${es}px; height:${es}px;`;

    body.appendChild(fin);
    body.appendChild(tail);
    body.appendChild(eye);
    inner.appendChild(body);
    wrapper.appendChild(inner);
    document.getElementById("fish-layer").appendChild(wrapper);

    setTimeout(() => wrapper.remove(), speed * 1000 + 500);
}

// 普通魚：遊戲開始後才啟動，4.5 秒一條，最多同時 6 條
const FISH_MAX = 5;
const FISH_INTERVAL = 4500;
let _fishTimer = null;
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
    if (_fishTimer)  { clearInterval(_fishTimer);  _fishTimer  = null; }
    if (_sprintTimer){ clearTimeout(_sprintTimer); _sprintTimer = null; }
}

// ── Page Visibility API：背景時暫停動畫省電 ──────────────
document.addEventListener('visibilitychange', () => {
    const inGame = document.body.classList.contains('game-started');
    if (document.hidden) {
        stopFish();
        stopBubbles();
        const bgm = document.getElementById('bgm');
        if (bgm && !bgm.paused) { bgm._wasPlaying = true; bgm.pause(); }
    } else {
        if (inGame) {
            startFish();
            startBubbles();
        }
        const bgm = document.getElementById('bgm');
        if (bgm && bgm._wasPlaying && sfxEnabled) { bgm._wasPlaying = false; bgm.play().catch(() => {}); }
        else if (bgm) { bgm._wasPlaying = false; } // 靜音狀態下也清旗標
    }
});

// 衝刺魚：每 15-25 秒強制產生一條近景快魚
function scheduleSprintFish() {
    const delay = 15000 + Math.random() * 10000;
    _sprintTimer = setTimeout(() => {
        const layer = document.getElementById("fish-layer");
        if (layer && layer.children.length < FISH_MAX) createFish(true);
        scheduleSprintFish();
    }, delay);
}

function initGame() {
	initOceanCaustics();
	startFish();    // ← 遊戲開始才啟動魚
	startBubbles(); // ← 遊戲開始才啟動氣泡
	document.body.classList.add('game-started');
	
    // ✅ 改用加入 class 的方式觸發淡出
    const welcomeScreen = document.getElementById("welcome-screen");
    welcomeScreen.classList.add("fade-out");
	
    // 啟動音樂與日誌
    document.getElementById("music-control").style.display = "flex";
	document.getElementById("report-control").style.display = "flex";
    document.getElementById("log-btn").style.display = "flex";
    document.getElementById("collection-btn").style.display = "flex";
    const music = document.getElementById("bgm");
    const btn = document.getElementById("music-control");
    if (sfxEnabled) {
        music.play().then(() => {
            music.volume = 0.1;
            btn.style.filter = "sepia(1) saturate(3) hue-rotate(175deg) brightness(1.4)";
            btn.innerText = "🎵";
            btn.style.opacity = "1";
        }).catch(() => {
            btn.innerText = "🔇";
            btn.style.opacity = "0.4";
        });
    } else {
        music.pause();
        btn.innerText = "🔇";
        btn.style.filter = "";
        btn.style.opacity = "0.4";
    }

    // 直接切換畫面並開始遊戲
    document.getElementById('player-hand').addEventListener('scroll', updateHandArrows);
    initDrawerGesture();
    setTimeout(() => {
        startGame();
    }, 3500); // 保留 3.5 秒的淡出過渡效果
}

function startGame() {
// 1. 從資料庫中隨機挑選 3 個角色
    let aiPool = shuffle([...characterDB]).slice(0, 3);
    
    // 2. 初始化玩家與隨機選出的 AI
    players = [
        { n: (window.playerName && window.playerName.trim()) ? window.playerName.trim() : "你", hand: [], isAI: false }
    ];

    // 3. 將選出的 AI 加入 players 陣列
    aiPool.forEach((char, index) => {
        players.push({
            n: char.n,
            hand: [],
            isAI: true,
            id: `ai-${index + 1}`,
            personality: char.personality,
            // 統一頭像渲染方式
            avatar: `<img src="${char.img}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
        });
    });	
	
    const selectedLocationId = window.selectedLocationId || sessionStorage.getItem("selectedLocationId") || "longfeng";
    const currentLocation = (typeof locationDB !== "undefined" && locationDB.find)
        ? locationDB.find(loc => loc.id === selectedLocationId) || locationDB[0]
        : null;
    const locationFishNames = currentLocation ? new Set(currentLocation.fishPool) : null;

    // ── 解鎖漁港章 & 難度紋章 ──
    if (currentLocation && currentLocation.badge) {
        progress.unlockBadge(window.playerName, currentLocation.badge);
    }
    const diffLabelShort = gameDifficulty <= 0.4 ? "新手" : gameDifficulty >= 0.9 ? "專業" : "標準";
    progress.unlockDifficulty(window.playerName, diffLabelShort);
    let fishD = shuffle(locationFishNames
        ? fishDB.filter(f => locationFishNames.has(f.n))
        : [...fishDB]
    );
    
    // 新手難度：玩家優先從 e:1（容易）牌池抽牌，AI 從剩餘隨機抽
    // 專業難度：完全隨機，不分等級
    if (gameDifficulty <= 0.4) {
        const easyPool   = fishD.filter(f => f.e === 1);
        const otherPool  = fishD.filter(f => f.e !== 1);
        const playerHand = [];
        // 玩家盡量拿 e:1 的牌（最多 6 張，不夠就從 otherPool 補）
        while (playerHand.length < 6) {
            if (easyPool.length > 0) playerHand.push(easyPool.splice(0, 1)[0]);
            else playerHand.push(otherPool.splice(0, 1)[0]);
        }
        players[0].hand = playerHand;
        // ── 解鎖初始手牌魚紋章 ──
        playerHand.forEach(f => progress.unlockFish(window.playerName, f.n));
        // AI 從剩餘（easyPool 剩餘 + otherPool）隨機抽
        const remaining = shuffle([...easyPool, ...otherPool]);
        players.slice(1).forEach(p => p.hand = remaining.splice(0, 6));
    } else {
        // 普通/專業：完全隨機
        players.forEach(p => p.hand = fishD.splice(0, 6));
        // ── 解鎖初始手牌魚紋章 ──
        players[0].hand.forEach(f => progress.unlockFish(window.playerName, f.n));
    }

    deckS = shuffle([...summonDB, ...mazuCards]);

    // 新手保護：確保玩家前2次召喚不會抽到沒牌可出的召喚卡
    // 4人輪流，玩家(callerIdx=0)的召喚在 deckS 末端：
    //   第1次玩家召喚 → deckS[length-1]（第1回合）
    //   第2次玩家召喚 → deckS[length-5]（第5回合）
    if (gameDifficulty <= 0.4) {
        const playerHand = players[0].hand;
        const isSafe = s => !s.isMazu && playerHand.some(f => { try { return s.c(f); } catch(e) { return false; } });

        const len = deckS.length;
        const slots = [len - 1, len - 5];
        const usedSwapSlots = new Set(slots); // 保護位置本身不能作為來源

        slots.forEach(slot => {
            if (slot < 0 || slot >= len) return;
            if (isSafe(deckS[slot])) return; // 已經安全，不換
            // 找一個不在保護位置、且是安全牌的位置來交換
            let swapFrom = -1;
            for (let i = 0; i < len; i++) {
                if (!usedSwapSlots.has(i) && isSafe(deckS[i])) { swapFrom = i; break; }
            }
            if (swapFrom === -1) return; // 找不到就放棄
            [deckS[slot], deckS[swapFrom]] = [deckS[swapFrom], deckS[slot]];
            usedSwapSlots.add(swapFrom); // 這個來源已被用，下次不能再用
        });
    }

    // 記錄初始手牌快照（遊戲結束時寫入 LOG 供分析）
    initialHands = players.map(p => ({
        name: p.n,
        hand: p.hand.map(f => ({ n: f.n, l: f.l, d: f.d, m: [...f.m], h: f.h, s: f.s }))
    }));
    logPlainText = []; // 清空上局紀錄
    
    const diffLabel = gameDifficulty <= 0.4 ? "新手(難度0.4)" : gameDifficulty >= 0.9 ? "專業(難度0.9)" : "標準(難度0.7)";
    const locationLabel = currentLocation ? currentLocation.name : "未指定海線";
    addLog(`守護團集結！任務地點：${locationLabel}。難度：${diffLabel}。注意觀察大家的出牌...`);

    // 顯示等待藍框（HTML 已預先填好文字）
    const overlay = document.getElementById("summon-focus-overlay");
    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "none";

    renderUI();
    setTimeout(autoStep, 2000);
}

function updateCallerHighlight() {
    players.forEach((p, idx) => {
        let el = (idx === 0) ? document.getElementById("player-zone") : document.getElementById(p.id);
        if (el) {
            if (idx === callerIdx) el.classList.add("is-caller");
            else el.classList.remove("is-caller");
        }
    });
    // 玩家回合（含媽祖）才全開光束，其他時間只留第3條
    const caustics = document.getElementById("ocean-caustics");
    if (caustics) {
        const isPlayerActive = phase === "PLAYER_TURN" || phase === "PLAYER_MAZU";
        caustics.classList.toggle("beams-active", isPlayerActive);
    }
}

let summonFocusTimer = null;

function showSummonFocus(duration, callback) {
    const overlay = document.getElementById("summon-focus-overlay");
    const box     = document.getElementById("summon-focus-box");

    // 清除上一輪殘留的 timer
    if (summonFocusTimer) {
        clearTimeout(summonFocusTimer);
        summonFocusTimer = null;
    }

    // 把召喚文字複製進遮罩框
    box.innerText = document.getElementById("summon-display").innerText;

    // 媽祖特殊樣式
    if (currentS && currentS.isMazu) {
        box.classList.add("mazu-style");
    } else {
        box.classList.remove("mazu-style");
    }

    // 重新觸發彈入動畫
    box.style.animation = "none";
    void box.offsetWidth;
    box.style.animation = "summonPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";

    // 顯示遮罩
    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "all";

    // duration 後自動淡出，再執行 callback
    summonFocusTimer = setTimeout(() => {
        overlay.style.transition = "opacity 0.8s ease";
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        summonFocusTimer = setTimeout(() => {
            summonFocusTimer = null;
            if (callback) callback();
        }, 800);
    }, duration);
}

function autoStep() {
    lockUI(); // 每回合開始立刻鎖定
    if (deckS.length === 0) { 
        addLog("召喚卡已用盡！開始結算剩餘手牌...", "cmd");
                // 找出手中剩餘卡牌最少的玩家
        let winner = players[0];
        for (let i = 1; i < players.length; i++) {
            // 若牌數相同，目前邏輯會保留順位較前（例如玩家本人）的優先權
            if (players[i].hand.length < winner.hand.length) {
                winner = players[i];
            }
        }
        // 延遲一秒後顯示勝利畫面
        const isPlayerWin = winner === players[0];
        showCountdownBubble(4, () => {
            isPlayerWin ? SFX.win() : SFX.lose();
            showWinScreen(winner);
        });
        return;
    }
	
    table = [];
    roundCount++;
    chatQueue.clear(); // 新回合開始，清空對話佇列
    roundChatCount = 0; // 重置對話計數器
	document.getElementById("table").innerHTML = "";
    document.getElementById("summon-display").classList.remove("mazu-glow");
    const causticsReset = document.getElementById("ocean-caustics");
    if (causticsReset) causticsReset.classList.remove("mazu-beams");
    
    currentS = deckS.pop();
    renderUI();
    const caller = players[callerIdx];
    updateCallerHighlight(); 

    if (callerIdx === 0) {
        SFX.draw(); // 玩家抽到召喚牌
        addLog(`【${players[0].n}】抽到召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
        const sdEl = document.getElementById("summon-display");
        sdEl.style.display = "flex";
        sdEl.innerText = (currentS.isMazu ? "【神明指示】\n" : "【你的召喚】\n") + currentS.t;
        phase = currentS.isMazu ? "PLAYER_MAZU" : "PLAYER_TURN";
        renderUI();
    } else {
        addLog(`【${caller.n}】抽到了一張神祕召喚。`, "secret");
        const sdEl2 = document.getElementById("summon-display");
        sdEl2.style.display = "flex";
        sdEl2.innerText = `【${caller.n}】抽到了神祕召喚！\n觀察對手出的魚，推敲召喚是什麼...`;
        phase = "WAIT";
    }

    // 教學模式不顯示遮罩，直接執行後續動作
    if (typeof tutorialMode !== "undefined" && tutorialMode) {
        if (currentS && currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow");
            if (callerIdx !== 0) { handleMazuAI(caller); }
        } else {
            if (callerIdx !== 0) {
                let idx = aiChooseCard(players[callerIdx]);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
            }
        }
        return;
    }

    // 聚焦遮罩：1.5秒後自動關閉才開放行動
    showSummonFocus(1500, () => {
        if (currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow");
            const caustics = document.getElementById("ocean-caustics");
            if (caustics) caustics.classList.add("mazu-beams");
            SFX.mazu();
            if (callerIdx === 0) unlockUI(); // 玩家是媽祖召喚者，解鎖讓選牌
            else handleMazuAI(caller);
        } else {
            if (callerIdx !== 0) {
                let idx = aiChooseCard(players[callerIdx]);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
                unlockUI(); // AI 召喚完畢，玩家要跟牌，解鎖
            } else {
                unlockUI(); // 玩家自己是召喚者，解鎖讓出牌
            }
        }
    });
}

function handleMazuAI(caller) {
    document.getElementById("summon-display").innerText = "【神明庇佑揭曉】\n" + currentS.t;
    addLog(`揭曉神明召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");

    setTimeout(() => {
        if (caller.hand.length === 0) { finishRound(); return; }

        let card = caller.hand.pop();

        // 目標選擇：70% 送給手牌最少的人（多人並列時隨機選一位），30% 隨機送給任一人
        // 新手模式：AI 只能送給其他 AI，不能送給玩家
        const isNovice = gameDifficulty <= 0.4;
        const others = players.filter(p => p !== caller && (isNovice ? p.isAI : true));

        // 若新手模式下其他 AI 全空，fallback 到所有人（避免死鎖）
        const pool = others.length > 0 ? others : players.filter(p => p !== caller);

        let target;
        if (Math.random() < 0.70) {
            const minCount = Math.min(...pool.map(p => p.hand.length));
            const fewest = pool.filter(p => p.hand.length === minCount);
            target = fewest[Math.floor(Math.random() * fewest.length)];
        } else {
            target = pool[Math.floor(Math.random() * pool.length)];
        }
        const callerEl = document.getElementById(caller.id); // 送牌者的實際 AI 格子
        const targetEl = target.isAI
            ? document.getElementById(target.id)
            : document.getElementById("player-zone");
        showMazuGiftEffect(caller.n, target.n, card, targetEl, callerEl);

        // 1. 送牌者先說話
        aiTalkMazuGive(caller, target, card);

        // 2. 停頓 2 秒後，執行送牌動作與接收者說話
        setTimeout(() => {
            target.hand.push(card);
            // ── 若送給玩家，解鎖魚紋章 ──
            if (!target.isAI) progress.unlockFish(window.playerName, card.n);
            SFX.gift();
            addLog(`✨ ${caller.n} 分享了一張【${card.n}】給 ${target.n}！`, "success");
            
            // 3. 如果接收者是 AI，接著說話
            if (target.isAI) {
                aiTalkMazuReceive(target, caller, card);
            }
            
            renderUI();

            // 不顯示倒數氣泡，等 banner 自然消失後才進入下一回合
            setTimeout(finishRound, 5500);
            
        }, 2000); // 這裡是兩次說話之間的 2 秒停頓

    }, 3000);
}

// 媽祖贈牌：選擇對象
function showMazuTargetSelect(cardIdx) {
    const existing = document.getElementById("mazu-target-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "mazu-target-overlay";

    const card = players[0].hand[cardIdx];
    const targets = players.slice(1); // 排除玩家自己

    overlay.innerHTML = `
        <div class="mazu-overlay-title">🙏 神明指示：分享資源</div>
        <div class="mazu-overlay-sub">
            送出【${card.n}】給誰？
        </div>
    `;

    targets.forEach((p, i) => {
        const btn = document.createElement("button");
        btn.className = "mazu-target-btn";
        btn.innerHTML = `
            <span>${p.n}</span>
            <span class="btn-cards">🎴×${p.hand.length}</span>
        `;
        btn.onclick = () => {
            overlay.remove();
            confirmMazuGift(cardIdx, p);
        };
        overlay.appendChild(btn);
    });

    document.body.appendChild(overlay);
}

// 媽祖贈牌：確認送出
function confirmMazuGift(cardIdx, target) {
    const card = players[0].hand.splice(cardIdx, 1)[0];

    const targetEl = document.getElementById(target.id);
    const playerEl = document.getElementById("player-zone");
    showMazuGiftEffect("你", target.n, card, targetEl, playerEl);

    target.hand.push(card);
    SFX.gift();
    addLog(`✨ ${players[0].n}分享了【${card.n}】給 ${target.n}！`, "success");

    if (target.isAI) {
        aiTalkMazuReceive(target, players[0], card);
    }

    phase = "RESULT";
    renderUI();
    lockUI(); // 等 banner 顯示完畢
    setTimeout(finishRound, 5500);
}

// =============================================
// 🎴 出牌飛行動畫
// =============================================
function playCardFlyAnimation(card, fromEl, callback) {
    const tableEl = document.getElementById("table");
    const oceanEl = document.getElementById("ocean");
    if (!fromEl || !oceanEl) { if (callback) callback(); return; }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect   = (tableEl || oceanEl).getBoundingClientRect();

    const startX = fromRect.left + fromRect.width  / 2 - 45;
    const startY = fromRect.top  + fromRect.height / 2 - 65;
    const endX   = toRect.left   + toRect.width    / 2 - 45;
    const endY   = toRect.top    + 20;

    const fly = document.createElement("div");
    fly.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 90px;
        border-radius: 10px;
        overflow: hidden;
        pointer-events: none;
        z-index: 5000;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(160,200,255,0.3);
        box-shadow: 0 0 0 3px rgba(80,120,180,0.2), 0 8px 24px rgba(0,10,40,0.6), 0 0 16px rgba(100,160,255,0.25);
        transition: none;
    `;

    const lightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    fly.innerHTML = `
        <div style="background:${lightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    document.body.appendChild(fly);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const dx = endX - startX;
            const dy = endY - startY;
            fly.style.transition = "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.5s ease";
            fly.style.transform  = `translate(${dx}px, ${dy}px) scale(0.75)`;
            fly.style.opacity    = "0";
        });
    });

    setTimeout(() => {
        fly.remove();
        if (callback) callback();
    }, 1550);
}

async function playerAction(idx) {
    if (navigator.vibrate) navigator.vibrate(30);

    if (phase === "PLAYER_MAZU") {
        // 先選目標，再確認送牌
        showMazuTargetSelect(idx);
        return;
    } else if (phase === "PLAYER_TURN") {
        const fish = players[0].hand[idx];
        players[0].hand.splice(idx, 1);
        SFX.card();
        table.push({ pIdx: 0, card: fish });
        phase = "AI_FOLLOWING";
        lockUI(); // 出牌後鎖定，防止亂點

        renderUI();

        const fromEl = document.getElementById("player-zone");
        playCardFlyAnimation(fish, fromEl, () => renderTable());

        // 玩家出牌後：隨機抽 1～2 個 AI 說話，受回合上限控制
        const aiPlayers = players.filter(p => p.isAI);
        const shuffled = aiPlayers.sort(() => Math.random() - 0.5);
        const count = Math.random() < 0.5 ? 1 : 2;
        shuffled.slice(0, count).forEach(p => {
            if (roundChatCount >= 2) return;
            const isCorrect = currentS && currentS.c ? currentS.c(fish) : null;
            queueAITalk(p, fish, isCorrect);
            roundChatCount++;
        });

        await new Promise(resolve => setTimeout(resolve, 1550));
        for (let pi = 0; pi < players.length; pi++) {
            const p = players[pi];
            if (p.isAI && pi !== callerIdx) {
                let matchIdx = aiChooseCard(p);
                await new Promise(resolve => setTimeout(resolve, 600));
                aiMove(pi, matchIdx); 
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        unlockUI(); // AI 全部出完才解鎖
        showResult();
		
    }
}

function aiMove(pI, cI) {
    const p = players[pI];
	if (!p.hand[cI]) return;
	
    const f = p.hand.splice(cI, 1)[0];

    SFX.cardAI();
    table.push({ pIdx: pI, card: f });

    const fromEl = document.getElementById(p.id);
    playCardFlyAnimation(f, fromEl, () => renderTable());

    renderUI();

    const isCorrect = currentS && currentS.c ? currentS.c(f) : null;

    // 出牌的 AI：50% 機率說話，受回合上限控制
    if (roundChatCount < 2 && Math.random() < 0.5) {
        queueAITalk(p, f, isCorrect);
        roundChatCount++;
    }

    // 其他 AI：隨機抽 1 個說話，受回合上限控制
    if (roundChatCount < 2) {
        const others = players.filter(other => other.isAI && other !== p);
        if (others.length) {
            const speaker = others[Math.floor(Math.random() * others.length)];
            queueAITalk(speaker, f, null);
            roundChatCount++;
        }
    }
}

// =============================================
// 🔙 退牌飛行動畫（ocean → 手牌區）
// =============================================
function playCardReturnAnimation(card, toEl, callback) {
    const tableEl = document.getElementById("table");
    const oceanEl = document.getElementById("ocean");
    if (!toEl || !oceanEl) { if (callback) callback(); return; }

    const fromRect = (tableEl || oceanEl).getBoundingClientRect();
    const toRect   = toEl.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width  / 2 - 45;
    const startY = fromRect.top  + 20;
    const endX   = toRect.left   + toRect.width    / 2 - 45;
    const endY   = toRect.top    + toRect.height   / 2 - 65;

    const fly = document.createElement("div");
    const lightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    fly.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 90px;
        border-radius: 10px;
        overflow: hidden;
        pointer-events: none;
        z-index: 5000;
        opacity: 0;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(255,100,100,0.5);
        box-shadow: 0 0 0 3px rgba(180,60,60,0.2), 0 8px 24px rgba(40,0,0,0.5), 0 0 16px rgba(255,80,80,0.2);
        transition: none;
    `;
    fly.innerHTML = `
        <div style="background:${lightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    document.body.appendChild(fly);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const dx = endX - startX;
            const dy = endY - startY;
            fly.style.transition = "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.5s ease";
            fly.style.transform  = `translate(${dx}px, ${dy}px) scale(1.1)`;
            fly.style.opacity    = "1";
        });
    });

    setTimeout(() => {
        fly.style.transition = "opacity 0.3s ease";
        fly.style.opacity = "0";
        setTimeout(() => {
            fly.remove();
            if (callback) callback();
        }, 300);
    }, 1500);
}

// 全域暫存：本回合需要退回的牌
let pendingReturns = [];
let roundCount = 0;

function showResult() {
    phase = "RESULT";
    roundReport = [];
    pendingReturns = [];

    // 空白期提示，避免玩家以為當機
    const hint = document.createElement("div");
    hint.className = "countdown-bubble";
    hint.style.cssText = `position:fixed; left:50%; transform:translateX(-50%); bottom:130px; z-index:3000; pointer-events:none;`;
    hint.innerText = "🔍 計算結果中…";
    document.body.appendChild(hint);

    setTimeout(() => {
        hint.remove();
        // AI 是召喚者時，全員出牌後才揭曉召喚條件
        if (callerIdx !== 0 && currentS && !currentS.isMazu) {
            const callerName = players[callerIdx].n;
            addLog(`揭曉《${callerName}》的神秘召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
            document.getElementById("summon-display").innerText = `【${callerName}的召喚】\n${currentS.t}`;
        }
        table.forEach(t => {
            const isSuccess = currentS.c(t.card);
            const player = players[t.pIdx];
            const condText = currentS.t; 
            
            // 使用陣列來收集所有相關的特性
            let featuresFound = [];

            // 1. 檢查是否包含「燈號/永續等級」相關關鍵字
            if (["燈", "綠", "黃", "紅"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "黃燈" : "紅燈"));
            }

            // 2. 檢查是否包含「捕撈方式」相關關鍵字
            if (["網", "釣", "一支", "延繩", "圍網", "刺網", "籠具", "禁止捕撈", "標槍"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.m.join("、"));
            }

            // 3. 檢查是否包含「來源/產地」相關關鍵字
            if (["養殖", "近海", "遠洋"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.d);
            }

            // 4. 檢查是否包含「季節」相關關鍵字
            if (["春", "夏", "秋", "冬", "全年"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.s);
            }

            // 5. 檢查是否包含「棲息地」相關關鍵字
            if (["洄游", "定棲", "底棲"].some(k => condText.includes(k))) {
                featuresFound.push(t.card.h);
            }

            // 最終呈現字串：如果以上都沒對應到，預設顯示燈號；若有多項則用 " | " 隔開
            let finalFeatureStr = featuresFound.length > 0 
                ? featuresFound.join(" | ") 
                : (t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "黃燈" : "紅燈"));

            roundReport.push({
                name: player.n,
                fishName: t.card.n,
                isSuccess: isSuccess,
                feature: finalFeatureStr
            });

            if (isSuccess) {
                addLog(`${player.n} 成功送出【${t.card.n}】`, "success");
                // 更新玩家出牌紀錄的 success 狀態
            } else {
                // 先暫存，等結算頁關閉後再動畫退回
                pendingReturns.push({ card: t.card, player });
                addLog(`${player.n} 的【${t.card.n}】不符規律，退回。`);
                // 更新玩家出牌紀錄的 success 狀態
            }
        });

        renderUI();

        // ⚠️ 勝負判定：排除仍在 pendingReturns 等待退牌的玩家
        // hand.length===0 但牌還在退回途中，不算真正出完
        const realWin = players.find(p =>
            p.hand.length === 0 &&
            !pendingReturns.some(r => r.player === p)
        );
        if (realWin) {
            const isPlayerWin = realWin === players[0];
            showCountdownBubble(4, () => {
                isPlayerWin ? SFX.win() : SFX.lose();
                showWinScreen(realWin);
            });
            return;
        }

        // 顯示倒數氣泡，4秒後進入結算
        showCountdownBubble(4, () => {
            if (showSummaryMode) {
                showRoundSummary();
            } else {
                playPendingReturns(() => finishRound());
            }
        });

    }, 1000);
}

function showCountdownBubble(seconds, callback) {
    const layer = document.getElementById("chat-layer");
    const ocean = document.getElementById("ocean");
    if (!layer || !ocean) { callback(); return; }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble countdown-bubble";
    bubble.style.cssText = `
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 130px;
        z-index: 1500;
        font-size: 1.2rem;
        text-align: center;
        pointer-events: none;
    `;
    layer.appendChild(bubble);

    let remaining = seconds;
    function tick() {
        bubble.innerText = `📋 ${remaining} 秒後進入結算，可先點牌放大查看`;
        if (remaining <= 0) {
            bubble.remove();
            callback();
            return;
        }
        remaining--;
        setTimeout(tick, 1000);
    }
    tick();
}

function finishRound() {
    let win = players.find(p => p.hand.length === 0);
    if (win) {
        const isPlayerWin = win === players[0];
        isPlayerWin ? SFX.win() : SFX.lose();
        showWinScreen(win);
        return;
    }
    proceedToNextRound();
}

// 新增：處理下一回合的邏輯轉換
function proceedToNextRound() {
    // 每回合結束後重排所有玩家手牌，避免 AI 因陣列順序固定而每次選同一張
    players.forEach(p => { if (p.isAI) shuffle(p.hand); });
    callerIdx = (callerIdx + 1) % players.length;
    phase = "WAIT";
    autoStep();
}

// 結算頁關閉後，同時播所有退牌動畫，全部結束後才加入手牌
function playPendingReturns(callback) {
    if (pendingReturns.length === 0) { if (callback) callback(); return; }

    const playerZone = document.getElementById("player-zone");
    let done = 0;
    const total = pendingReturns.length;

    pendingReturns.forEach(({ card, player }) => {
        const toEl = player.isAI ? document.getElementById(player.id) : playerZone;
        playCardReturnAnimation(card, toEl, () => {
            player.hand.push(card);
            done++;
            if (done === total) {
                pendingReturns = [];
                renderUI();
                if (callback) callback();
            }
        });
    });
}

// 新增：彈出視窗函式
function showRoundSummary() {

    if (!showSummaryMode) {
        proceedToNextRound();
        return;
    }

    if (roundReport.some(r => r.isSuccess)) SFX.success();

    // ── 屬性條產生器 ──
    function buildAttrBars(feature, isSuccess) {
        const attrs = feature.split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean);
        if (!attrs.length) return '';
        const barW  = isSuccess ? '100%' : '22%';
        const barC  = isSuccess ? '#3ecf6e' : '#e05555';
        const textC = isSuccess ? '#7eeaa8' : '#f08080';
        const mark  = isSuccess ? '✓' : '✗';
        return attrs.map(attr => `
            <div style="display:flex;align-items:center;gap:6px;margin-top:3px;min-width:0;">
                <span style="flex:1;min-width:0;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;flex-shrink:0;">
                    <span style="display:block;width:${barW};height:100%;background:${barC};border-radius:2px;"></span>
                </span>
                <span style="font-size:10px;color:${textC};word-break:break-all;flex-shrink:1;text-align:right;">${attr} ${mark}</span>
            </div>`).join('');
    }

    // ── 玩家卡（2欄 grid）──
    // 偶數：正常 1 欄，奇數最後一張跨欄
    const total = roundReport.length;
    const cardsHtml = roundReport.map((r, i) => {
        const delay   = 0.10 + i * 0.08;
        const isLast  = i === total - 1;
        const isOdd   = total % 2 === 1;
        const span    = (isLast && isOdd) ? 'grid-column:1/-1;' : '';
        const bg      = r.isSuccess
            ? 'background:linear-gradient(135deg,#0a2e1a,#0d3d22);border:1.5px solid #3a9e5f;'
            : 'background:linear-gradient(135deg,#2a0f0f,#361212);border:1.5px solid #8b3030;';
        const nameC   = r.isSuccess ? '#90f0b8' : '#f4a0a0';
        const badge   = r.isSuccess
            ? `<span style="font-size:14px;animation:rsPulse 1.4s infinite;display:inline-block;">⭐</span>`
            : `<span style="font-size:10px;color:#f07070;background:rgba(200,50,50,0.2);border:1px solid rgba(200,50,50,0.4);padding:1px 7px;border-radius:8px;">退牌</span>`;

        // 跨欄時橫向排列
        if (isLast && isOdd) {
            return `
            <div style="${bg}${span}border-radius:13px;padding:8px 10px;min-width:0;overflow:hidden;
                        animation:rsSlideUp .26s ${delay}s ease both;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="flex:0 0 auto;">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
                            <span style="font-size:11px;color:rgba(255,255,255,0.42);">${r.name}</span>
                            ${badge}
                        </div>
                        <div style="font-size:16px;font-weight:bold;color:${nameC};">${r.fishName}</div>
                    </div>
                    <div style="flex:1;min-width:0;">
                        ${buildAttrBars(r.feature, r.isSuccess)}
                    </div>
                </div>
            </div>`;
        }

        return `
        <div style="${bg}border-radius:13px;padding:8px 9px;min-width:0;overflow:hidden;
                    animation:rsSlideUp .26s ${delay}s ease both;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:18px;color:rgba(255,255,255,0.42);">${r.name}</span>
                ${badge}
            </div>
            <div style="font-size:20px;font-weight:bold;color:${nameC};margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.fishName}</div>
            ${buildAttrBars(r.feature, r.isSuccess)}
        </div>`;
    }).join('');

    // ── 共用卡片樣式（召喚條件 & 生態知識）──
    const sharedCard = `background:linear-gradient(135deg,rgba(0,70,110,0.7),rgba(0,40,80,0.7));
                        border:1.5px solid rgba(60,170,255,0.28);border-radius:13px;`;

    // ── 生態知識 ──
    const ecoDelay = 0.10 + total * 0.08 + 0.06;
    const ecoHtml  = currentS.why ? `
        <div style="${sharedCard}padding:7px 11px;margin-bottom:10px;
                    animation:rsSlideUp .26s ${ecoDelay}s ease both;">
            <div style="font-size:12px;color:#60c8f0;font-weight:bold;margin-bottom:3px;">🌊 生態小知識</div>
            <div style="font-size:16px;color:rgba(190,235,255,0.88);line-height:1.6;">${currentS.why}</div>
        </div>` : '';

    // ── overlay ──
    const overlay = document.createElement("div");
    overlay.id = "round-summary-overlay";
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(4,12,22,0.92);display:flex;justify-content:center;
        align-items:center;box-sizing:border-box;
        z-index:4000;
    `;

    // ── modal ──
    const modal = document.createElement("div");
    modal.style.cssText = `
        background:linear-gradient(170deg,#0d2137 0%,#081626 100%);
        border-radius:20px;border:1px solid rgba(255,255,255,0.07);
        width:92%;max-width:400px;
        max-height:82vh;overflow-y:auto;
        padding:12px 11px 14px;box-sizing:border-box;
        animation:rsSlideDown .36s ease-out both;
    `;

    modal.innerHTML = `
        <style>
            @keyframes rsSlideDown {
                from { transform:translateY(-30px); opacity:0; }
                to   { transform:translateY(0);     opacity:1; }
            }
            @keyframes rsSlideUp {
                from { transform:translateY(13px); opacity:0; }
                to   { transform:translateY(0);    opacity:1; }
            }
            @keyframes rsPulse {
                0%,100% { opacity:1; } 50% { opacity:.4; }
            }
            #round-summary-overlay ::-webkit-scrollbar { width:3px; }
            #round-summary-overlay ::-webkit-scrollbar-track { background:transparent; }
            #round-summary-overlay ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15);border-radius:2px; }
        </style>

        <div style="${sharedCard}padding:7px 11px;margin-bottom:8px;
                    animation:rsSlideUp .26s .04s ease both;">
            <div style="font-size:12px;color:#60c8f0;letter-spacing:1.5px;margin-bottom:2px;">📜 本回召喚條件 📜</div>
            <div style="font-size:16px;color:#fff;font-weight:bold;line-height:1.4;">${currentS.t}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;min-width:0;">
            ${cardsHtml}
        </div>

        ${ecoHtml}

        <button id="close-summary-btn" style="
            width:100%;padding:11px;border:none;border-radius:50px;
            font-size:22px;font-weight:900;cursor:pointer;letter-spacing:0.5px;
            background:linear-gradient(135deg,#f5c842,#e07828);
            color:#1a0800;
            box-shadow:0 4px 0 #8a4200, 0 6px 14px rgba(200,100,0,0.3);
            text-shadow:none;
        ">整理魚獲，繼續冒險</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("close-summary-btn").onclick = () => {
        overlay.remove();
        lockUI();
        playPendingReturns(() => proceedToNextRound());
    };
}

function aiChooseCard(p) {
    let difficulty = gameDifficulty;

    if (p.personality === "smart")   difficulty += 0.15;
    if (p.personality === "chaotic") difficulty -= 0.25;
    if (p.personality === "tricky")  difficulty -= 0.1;

    difficulty = Math.max(0.05, Math.min(0.97, difficulty));

    // ── 情境 A：AI 是召喚者（自己先出，table 為空）──
    if (table.length === 0) {
        const validCards = p.hand
            .map((f, idx) => ({ f, idx }))
            .filter(c => currentS && currentS.c && currentS.c(c.f));

        const invalidCards = p.hand
            .map((f, idx) => ({ f, idx }))
            .filter(c => !(currentS && currentS.c && currentS.c(c.f)));

        // 召喚者出正確牌的機率：
        // 公式：min(0.95, max(0.50, 1.030 - 0.537 * difficulty))
        // 新手+chaotic(eff=0.15) → 95%、專業+smart(eff=0.97) → 51%
        // 永遠不低於 50%（避免反指標）、不高於 95%（保留少量不確定性）
        const correctChance = Math.min(0.95, Math.max(0.50, 1.030 - 0.537 * difficulty));
        const playCorrect = Math.random() < correctChance;

        // 問題3：手上沒有符合牌時，記錄到 log 讓玩家知道
        if (validCards.length === 0) {
            addLog(`${p.n} 手上沒有符合召喚的牌，隨機出牌。`, "secret");
            return Math.floor(Math.random() * p.hand.length);
        }

        const pool = playCorrect ? validCards : (invalidCards.length > 0 ? invalidCards : validCards);
        return pool[Math.floor(Math.random() * pool.length)].idx;
    }

    // ── 情境 B：AI 是跟牌者（看桌面推測召喚條件）──
    const played = table.map(t => t.card);

    // 預先計算桌面牌的共同特徵，避免在 forEach 內重複運算（修 Bug2）
    const allSameL = played.every(f => f.l === played[0].l);
    const allSameH = played.every(f => f.h === played[0].h);
    const allSameD = played.every(f => f.d === played[0].d);

    // 季節：找出桌面牌都共有的季節（全年視為包含所有季節）
    const seasons = ["春", "夏", "秋", "冬"];
    const commonSeasons = seasons.filter(s =>
        played.every(f => f.s.includes("全年") || f.s.includes(s))
    );
    // 桌面所有牌都有的共同漁法
    const commonMethods = played[0].m.filter(method =>
        played.every(f => f.m.includes(method))
    );

    // 評分：比對手牌與桌面共同特徵的吻合度
    let candidates = p.hand.map((f, idx) => {
        let score = 0;
        if (allSameL && f.l === played[0].l) score++;
        if (allSameH && f.h === played[0].h) score++;
        if (allSameD && f.d === played[0].d) score++;
        // 季節：手牌含全年、或含任一共同季節，給分
        if (commonSeasons.length > 0 &&
            (f.s.includes("全年") || commonSeasons.some(s => f.s.includes(s))))
            score++;
        // 漁法：手牌含任一共同漁法，給分
        if (commonMethods.length > 0 && commonMethods.some(m => f.m.includes(m)))
            score++;
        return { f, idx, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;

    // 三組：最佳匹配、部分匹配、完全不匹配
    const bestPool    = candidates.filter(c => c.score === topScore && topScore > 0);
    const partialPool = candidates.filter(c => c.score > 0 && c.score < topScore);
    const wrongPool   = candidates.filter(c => c.score === 0);

    // 手牌沒有任何特徵吻合（topScore === 0）：只能隨機，難度無法幫助
    if (topScore === 0) {
        return candidates[Math.floor(Math.random() * candidates.length)].idx;
    }

    // 跟牌邏輯：目標永遠是盡量跟對牌（清手牌）
    // 難度影響的是「推測能力」：高難度估得準（best 機率高），低難度估得不準（偶爾落到 partial）
    // 任何情況都不主動選 wrong pool（跟錯牌退回來對自己沒好處）
    //
    // 機率分配：
    //   difficulty 0.97（smart 專業）→ best 97%、partial 3%、wrong 0%
    //   difficulty 0.55（smart 新手）→ best 80%、partial 18%、wrong 2%
    //   difficulty 0.15（chaotic 新手）→ best 60%、partial 33%、wrong 7%
    //
    // 公式：
    //   P(best)    = 0.45 + difficulty * 0.535   → clamp [0.60, 0.97]
    //   P(partial) = (1 - P(best)) * 0.80
    //   P(wrong)   = (1 - P(best)) * 0.20

    const pBest    = Math.min(0.97, Math.max(0.60, 0.45 + difficulty * 0.535));
    const pPartial = (1 - pBest) * 0.80;
    // pWrong = (1 - pBest) * 0.20（剩餘）

    const roll = Math.random();
    if (roll < pBest) {
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    } else if (roll < pBest + pPartial) {
        if (partialPool.length > 0)
            return partialPool[Math.floor(Math.random() * partialPool.length)].idx;
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    } else {
        // 極低機率的 wrong（估錯），若 wrongPool 空則退回 partial 或 best
        if (wrongPool.length > 0)
            return wrongPool[Math.floor(Math.random() * wrongPool.length)].idx;
        if (partialPool.length > 0)
            return partialPool[Math.floor(Math.random() * partialPool.length)].idx;
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    }
}

function showChat(p, msg) {
    const layer = document.getElementById("chat-layer");
    const el = document.getElementById(p.id);
    if (!el) return;

    const rect = el.getBoundingClientRect();

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerText = msg;

    layer.appendChild(bubble);

    // 👉 先讓它出現在畫面（才能拿寬度）
    const bubbleWidth = bubble.offsetWidth;

    // 🎯 計算中心位置
    let left = rect.left + rect.width / 2 - bubbleWidth / 2;

    // 🚧 邊界限制（重點）
    const padding = 10;
    const maxLeft = window.innerWidth - bubbleWidth - padding;

    if (left < padding) left = padding;
    if (left > maxLeft) left = maxLeft;

    bubble.style.left = left + "px";
    bubble.style.top = rect.top - 10 + "px";

    setTimeout(() => bubble.remove(), 3000);
}

// 組合台詞並加入 queue
function queueAITalk(p, card, isCorrectGuess) {
    const persona = p.personality;
    const db = dialogueDB[persona];
    let pool = [];

    if (isCorrectGuess === false && db.playWrong) pool.push(...db.playWrong);

    if (card) {
        if (card.l === 3 && db.playRed)          pool.push(...db.playRed);
        else if (card.l === 1 && db.playGreen)   pool.push(...db.playGreen);
        if (card.d === "養殖" && db.playFarm)    pool.push(...db.playFarm);
    }

    if (!pool.length) pool = [...db.play];

    const msg = pool[Math.floor(Math.random() * pool.length)];
    chatQueue.push(p, msg);
}

// 保留 aiTalk 作為向後相容（目前已無直接呼叫，備用）
function aiTalk(p, card, isCorrectGuess = null) {
    queueAITalk(p, card, isCorrectGuess);
}

function aiTalkMazuGive(p, target, card) {
    const lines = dialogueDB[p.personality].mazuGive;
    const msg = lines[Math.floor(Math.random() * lines.length)];
    chatQueue.push(p, msg);
}

function aiTalkMazuReceive(p, from, card) {
    const lines = dialogueDB[p.personality].mazuReceive;
    const msg = lines[Math.floor(Math.random() * lines.length)];
    chatQueue.push(p, msg);
}




function showMazuGiftEffect(fromName, toName, card, targetEl, fromEl) {
    const flyLayer = document.createElement("div");
    flyLayer.id = "mazu-gift-effect";
    document.body.appendChild(flyLayer);

    // 起點：直接用傳入的 fromEl，fallback 到 player-zone 或 char-area
    const resolvedFromEl = fromEl
        || (fromName === "你"
            ? document.getElementById("player-zone")
            : document.querySelector(".char-area"));
    const toEl = targetEl || document.querySelector(".char-area");

    const fromRect = (resolvedFromEl || document.body).getBoundingClientRect();
    const toRect   = (toEl          || document.body).getBoundingClientRect();

    const startX = fromRect.left + fromRect.width  / 2 - 40;
    const startY = fromRect.top  + fromRect.height / 2 - 55;
    const endX   = toRect.left   + toRect.width    / 2 - 40;
    const endY   = toRect.top    + toRect.height   / 2 - 55;

    const flyCard = document.createElement("div");
    flyCard.className = `mazu-gift-card-fly`;
    const mazuLightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    flyCard.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top:  ${startY}px;
        width: 90px;
        border-radius: 10px;
        overflow: hidden;
        pointer-events: none;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(160,200,255,0.3);
        box-shadow: 0 0 0 3px rgba(80,120,180,0.2), 0 8px 24px rgba(0,10,40,0.6), 0 0 16px rgba(100,160,255,0.25);
        --fly-x: ${endX - startX}px;
        --fly-y: ${endY - startY}px;
        --fly-x2: ${endX - startX + 20}px;
        --fly-y2: ${endY - startY - 20}px;
    `;
    flyCard.innerHTML = `
        <div style="background:${mazuLightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    flyLayer.appendChild(flyCard);

    // 橫幅說明（飛行結束後才彈出，2秒後）
    setTimeout(() => {
        const banner = document.createElement("div");
        banner.className = "mazu-gift-banner";
        banner.innerHTML = `
            <div class="banner-icon">🙏</div>
            <div class="banner-img-wrap">
                <img src="fishdb/${card.n}.png"
                     onerror="this.parentNode.style.display='none'"
                     alt="${card.n}">
            </div>
            <div class="banner-from">${fromName} 分享</div>
            <div class="banner-fish">【${card.n}】</div>
            <div class="banner-to">➜ ${toName}</div>
        `;
        document.body.appendChild(banner);

        // 6 秒後淡出移除
        setTimeout(() => {
            banner.style.transition = "opacity 0.6s";
            banner.style.opacity = "0";
            flyLayer.style.transition = "opacity 0.6s";
            flyLayer.style.opacity = "0";
            setTimeout(() => { banner.remove(); flyLayer.remove(); }, 600);
        }, 3000);
    }, 2000);
}

// =============================================
// 🗂️ 手牌抽屜（Drawer）系統
// =============================================

let drawerOpen = false;

function updateDrawerArrow(show) {
    const arrow = document.getElementById("drawer-up-arrow");
    if (arrow) arrow.style.display = show ? "block" : "none";
    if (!show && drawerOpen) closeDrawer();
}

function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;

    let drawer = document.getElementById("hand-drawer");
    if (!drawer) {
        drawer = document.createElement("div");
        drawer.id = "hand-drawer";
        document.body.appendChild(drawer); // fixed 定位，掛在 body

        let dy0 = 0;
        drawer.addEventListener("touchstart", (e) => {
            dy0 = e.touches[0].clientY;
        }, { passive: true });
        drawer.addEventListener("touchend", (e) => {
            if (e.changedTouches[0].clientY - dy0 > 50) closeDrawer();
        }, { passive: true });
    }

    renderDrawer(drawer);
    drawer.style.display = "block";
    requestAnimationFrame(() => {
        drawer.style.transform = "translateY(0)";
    });
}

function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    const drawer = document.getElementById("hand-drawer");
    if (!drawer) return;
    drawer.style.transform = "translateY(100%)";
    setTimeout(() => { if (!drawerOpen) drawer.style.display = "none"; }, 280);
}

function renderDrawer(drawer) {
    const isNormalTask = currentS && !currentS.isMazu && phase === "PLAYER_TURN" && callerIdx === 0;

    drawer.innerHTML = `
        <div class="drawer-handle-bar"></div>
        <div class="drawer-hint">點卡直接出牌 ／ 下滑收起</div>
        <div class="drawer-grid" id="drawer-grid"></div>
    `;

    const grid = drawer.querySelector("#drawer-grid");

    players[0].hand.forEach((f, idx) => {
        const isValid = isNormalTask && currentS.c(f);

        const wrap = document.createElement("div");
        wrap.className = "drawer-card-wrap";

        const card = document.createElement("div");
        card.className = `drawer-card light-${f.l}${isValid ? " drawer-valid" : ""}`;

        card.innerHTML = `
            <div class="drawer-card-name">${f.n}</div>
            <div class="drawer-card-img">
                <img src="fishdb/${f.n}.png" alt="${f.n}" onerror="this.style.display='none'">
            </div>
            <div class="drawer-card-tags">${getFishTags(f)}</div>
        `;

        if (isValid) {
            const dot = document.createElement("span");
            dot.className = "drawer-valid-dot";
            wrap.appendChild(dot);
        }

        card.onclick = (e) => {
            e.stopPropagation();
            closeDrawer();
            setTimeout(() => playerAction(idx), 50);
        };

        wrap.appendChild(card);
        grid.appendChild(wrap);
    });
}

// 初始化手牌區的上滑手勢偵測
let drawerGestureInited = false;
function initDrawerGesture() {
    if (drawerGestureInited) return;
    drawerGestureInited = true;
    const zone = document.getElementById("player-zone");
    if (!zone) return;

    let startY = 0, startX = 0;
    let intentDecided = false, isVerticalSwipe = false;

    zone.addEventListener("touchstart", (e) => {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        intentDecided = false;
        isVerticalSwipe = false;
    }, { passive: true });

    zone.addEventListener("touchmove", (e) => {
        if (drawerOpen) return;
        // win-screen 顯示中不干擾
        if (document.getElementById("win-overlay")) return;
        const dy = e.touches[0].clientY - startY;
        const dx = Math.abs(e.touches[0].clientX - startX);

        if (!intentDecided) {
            if (Math.abs(dy) < 8 && dx < 8) return;
            isVerticalSwipe = Math.abs(dy) > dx;
            intentDecided = true;
        }
        // 確認往上垂直滑 → 阻止頁面捲動
        if (isVerticalSwipe && dy < 0) {
            e.preventDefault();
        }
    }, { passive: false });

    zone.addEventListener("touchend", (e) => {
        if (!intentDecided || !isVerticalSwipe || drawerOpen) return;
        if (document.getElementById("win-overlay")) return;
        const dy = e.changedTouches[0].clientY - startY;
        const dx = Math.abs(e.changedTouches[0].clientX - startX);
        if (dy < -40 && dx < 60) {
            const isMyTurn = phase === "PLAYER_TURN" || phase === "PLAYER_MAZU";
            if (isMyTurn) openDrawer();
        }
    }, { passive: true });
}

// 點抽屜外背景關閉
document.addEventListener("touchstart", (e) => {
    if (!drawerOpen) return;
    if (document.getElementById("win-overlay")) { closeDrawer(); return; }
    const drawer = document.getElementById("hand-drawer");
    if (drawer && !drawer.contains(e.target)) closeDrawer();
}, { passive: true });

function toggleReportMode() {
    showSummaryMode = !showSummaryMode;
    const btn = document.getElementById("report-control");
    if (showSummaryMode) {
        btn.style.opacity = "1";
        btn.innerHTML = "📊";
    } else {
        btn.style.opacity = "0.85";
        btn.innerHTML = `<span style="filter:grayscale(1);display:inline-block;">📊</span><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.2em;font-weight:900;color:#ff2222;pointer-events:none;">✕</span>`;
        // 關掉時清除可能殘留的結算 overlay
        const existing = document.getElementById("round-summary-overlay");
        if (existing) {
            existing.remove();
            playPendingReturns(() => proceedToNextRound());
        }
    }
}
