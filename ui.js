// =============================================
// 🖼️ ui.js — UI 渲染、手牌、卡片預覽、日誌、音樂
// =============================================

// ── UI 鎖定 ──────────────────────────────────
function lockUI() {
    const el = document.getElementById("ui-lock");
    if (el) el.style.display = "block";
}
function unlockUI() {
    const el = document.getElementById("ui-lock");
    if (el) el.style.display = "none";
}

// ── 標籤生成 ──────────────────────────────────
const ECO_METHODS = ["一支釣", "定置", "養殖", "手釣", "棒受網", "籠具", "釣具", "標槍"];

function getFishTags(f) {
    let html = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1px;">';
    html += _buildSeasonTags(f);
    f.m.forEach(method => {
        const isEco = ECO_METHODS.some(eco => method.includes(eco));
        html += `<span class="tag ${isEco ? 'tag-eco' : 'tag-warn'}">${method}</span>`;
    });
    const hClass = f.h.includes("洄游") ? "tag-migratory" : "tag-sedentary";
    html += `<span class="tag ${hClass}">${f.h}</span>`;
    html += `<span class="tag ${_getDepthClass(f.d)}">${f.d}</span>`;
    html += '</div>';
    return html;
}

function getHandBackTags(f) {
    let html = _buildSeasonTags(f);
    f.m.forEach(method => {
        const isEco = ECO_METHODS.some(eco => method.includes(eco));
        html += `<span class="tag ${isEco ? 'tag-eco' : 'tag-warn'}">${method}</span>`;
    });
    const hClass = f.h.includes("洄游") ? "tag-migratory" : "tag-sedentary";
    html += `<span class="tag ${hClass}">${f.h}</span>`;
    html += `<span class="tag ${_getDepthClass(f.d)}">${f.d}</span>`;
    return html;
}

function _buildSeasonTags(f) {
    let html = "";
    if (f.s.includes("全年")) return `<span class="tag tag-all">全年</span>`;
    if (f.s.includes("春")) html += `<span class="tag tag-spring">春</span>`;
    if (f.s.includes("夏")) html += `<span class="tag tag-summer">夏</span>`;
    if (f.s.includes("秋")) html += `<span class="tag tag-autumn">秋</span>`;
    if (f.s.includes("冬")) html += `<span class="tag tag-winter">冬</span>`;
    return html;
}

function _getDepthClass(d) {
    if (d.includes("遠洋")) return "tag-ocean";
    if (d.includes("養殖")) return "tag-farm";
    return "tag-coastal";
}

// ── 卡片預覽 ──────────────────────────────────
let previewTimeout = null;

function showCardPreview(idx, fish, isHand = true) {
    const overlay   = document.getElementById("card-preview-overlay");
    const container = document.getElementById("card-preview-container");
    container.innerHTML = "";
    if (previewTimeout) clearTimeout(previewTimeout);

    const lightBg     = fish.l === 1 ? "#d4f5e2" : fish.l === 2 ? "#fef3cd" : "#ffd6da";
    const lightBorder = fish.l === 1 ? "#77D9A8" : fish.l === 2 ? "#f9e1a9" : "#ffb3ba";

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

    const controls = document.createElement("div");
    controls.className = "preview-controls";

    if (isHand && phase.includes("PLAYER")) {
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
    } else {
        const btnClose = document.createElement("button");
        btnClose.className = "preview-btn btn-cancel";
        btnClose.innerHTML = "❌";
        btnClose.onclick = (e) => { e.stopPropagation(); closePreview(); };
        controls.appendChild(btnClose);
    }
    container.appendChild(controls);

    overlay.style.display = "flex";
    previewTimeout = setTimeout(closePreview, isHand ? 6000 : 4000);
}

function closePreview() {
    if (previewTimeout) clearTimeout(previewTimeout);
    document.getElementById("card-preview-overlay").style.display = "none";
    document.getElementById("card-preview-container").innerHTML = "";
}

// 點遮罩背景關閉預覽
document.getElementById("card-preview-overlay").onclick = (e) => {
    if (e.target.id === "card-preview-overlay") closePreview();
};

// ── 主 UI 渲染 ──────────────────────────────────
function renderUI() {
    players.forEach((p, i) => {
        if (i > 0) {
            const isLastCard = p.hand.length === 1;
            const dangerClass = isLastCard ? "ai-last-card-danger" : "";
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

    const deckInfo = document.getElementById("deck-info");
    deckInfo.innerText = `剩餘${deckS.length}次召喚`;
    deckInfo.classList.toggle("deck-danger", deckS.length <= 5);

    const handEl = document.getElementById("player-hand");
    handEl.innerHTML = "";
    handFlipTimers.forEach(t => clearInterval(t));
    handFlipTimers = [];

    const isNormalTask = currentS && !currentS.isMazu && phase === "PLAYER_TURN" && callerIdx === 0;

    players[0].hand.forEach((f, idx) => {
        const c = document.createElement("div");
        c.className = `card light-${f.l}`;
        const isValid = isNormalTask && currentS.c(f);

        const front = document.createElement("div");
        front.className = "card-front";
        front.innerHTML = `<div class="card-n">${f.n}</div><div class="card-img"><img src="fishdb/${f.n}.png" alt="${f.n}" onerror="this.style.display='none'"></div>`;

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

        c.onclick = () => showCardPreview(idx, f, true);

        const timer = setInterval(() => {
            if (c.isConnected) c.classList.toggle("flipped");
            else clearInterval(timer);
        }, 5000);
        handFlipTimers.push(timer);

        handEl.appendChild(c);
    });

    const isMyTurn = phase === "PLAYER_TURN" || phase === "PLAYER_MAZU";
    document.getElementById("player-zone").classList.toggle("my-turn", isMyTurn);
    setTimeout(updateHandArrows, 50);
    updateDrawerArrow(isMyTurn);
}

function renderTable() {
    const zone = document.getElementById("table");
    zone.innerHTML = "";
    table.forEach((t, index) => {
        const c = document.createElement("div");
        c.className = `card light-${t.card.l}`;
        c.innerHTML = `<div class="card-n">${t.card.n}</div><div class="card-i">${getFishTags(t.card)}</div>`;
        c.onclick = () => showCardPreview(null, t.card, false);
        zone.appendChild(c);
        if (index === table.length - 1) {
            void c.offsetWidth;
            c.classList.add("card-played");
        }
    });
}

function updateHandArrows() {
    const hand       = document.getElementById('player-hand');
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

// ── 出牌記錄 ──────────────────────────────────
function addLog(m, type = "") {
    const l = document.getElementById("log-messages");
    let className = "log-entry";
    if (type === "cmd")     className += " log-cmd";
    if (type === "secret")  className += " log-secret";
    if (type === "success") className += " log-success";
    const rPrefix  = roundCount > 0 ? `[R${roundCount}] ` : "";
    const plainLine = `${rPrefix}${m.replace(/<[^>]*>/g, "")}`;
    logPlainText.unshift(plainLine);
    const prefix = roundCount > 0 ? `<span style="color:#aaa; font-size:0.85em;">[R${roundCount}]</span> ` : "";
    l.insertAdjacentHTML('afterbegin', `<div class="${className}">> ${prefix}${m}</div>`);
}

function openLog()  { document.getElementById("log-modal").style.display = "flex"; }
function closeLog() { document.getElementById("log-modal").style.display = "none"; }

function copyLog() {
    const text = logPlainText.join("\n");
    const btn  = document.getElementById("log-copy-btn");
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
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;height:50vh;z-index:9999;font-size:12px;";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        btn.textContent = "👆 長按選取";
        setTimeout(() => { ta.remove(); btn.textContent = "📋 複製"; }, 8000);
    });
}

// ── 音樂控制 ──────────────────────────────────
function toggleMusic() {
    const music = document.getElementById("bgm");
    const btn   = document.getElementById("music-control");
    if (music.paused) {
        music.play();
        sfxEnabled = true;
        btn.innerText = "🎵";
        btn.style.filter  = "sepia(1) saturate(3) hue-rotate(175deg) brightness(1.4)";
        btn.style.opacity = "1";
    } else {
        music.pause();
        sfxEnabled = false;
        btn.innerText = "🔇";
        btn.style.filter  = "";
        btn.style.opacity = "0.4";
    }
}

function toggleReportMode() {
    showSummaryMode = !showSummaryMode;
    const btn = document.getElementById("report-control");
    if (showSummaryMode) {
        btn.style.opacity = "1";
        btn.innerHTML = "📊";
    } else {
        btn.style.opacity = "0.85";
        btn.innerHTML = `<span style="filter:grayscale(1);display:inline-block;">📊</span><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.2em;font-weight:900;color:#ff2222;pointer-events:none;">✕</span>`;
        const existing = document.getElementById("round-summary-overlay");
        if (existing) {
            existing.remove();
            playPendingReturns(() => proceedToNextRound());
        }
    }
}

// ── 故事與說明 ──────────────────────────────────
let storyIdx = 1, storyTimer = null;
const totalStories = 9;
let touchStartX = 0, touchEndX = 0;

const infoBGM = new Audio('MZ.mp3');
infoBGM.loop = true;

let infoIdx = 1, infoTimer = null;
const totalInfo = 18;
let infoTouchStartX = 0, infoTouchEndX = 0;

function prevStory() {
    stopStoryTimer();
    if (storyIdx > 1) { storyIdx--; updateStory(); startStoryTimer(); }
}
function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (diff < -50) nextStory();
    else if (diff > 50) prevStory();
}

function openInfo() {
    infoIdx = 1;
    updateInfo();
    const overlay = document.getElementById("info-overlay");
    overlay.style.display    = "flex";
    overlay.style.visibility = "visible";
    overlay.style.opacity    = "1";
    infoBGM.currentTime = 0;
    if (sfxEnabled) infoBGM.play().catch(e => console.log("音樂播放受阻:", e));
    startInfoTimer();
    overlay.ontouchstart = (e) => { infoTouchStartX = e.changedTouches[0].screenX; };
    overlay.ontouchend   = (e) => { infoTouchEndX   = e.changedTouches[0].screenX; handleSwipeInfo(); };
}
function updateInfo() {
    document.getElementById("info-img").src         = `F${infoIdx}.jpg`;
    document.getElementById("info-page-num").innerText = `${infoIdx} / ${totalInfo}`;
}
function prevInfo() {
    stopInfoTimer();
    if (infoIdx > 1) { infoIdx--; updateInfo(); startInfoTimer(); }
}
function nextInfo() {
    stopInfoTimer();
    if (infoIdx < totalInfo) { infoIdx++; updateInfo(); startInfoTimer(); }
    else closeInfo();
}
function startInfoTimer() {
    stopInfoTimer();
    infoTimer = setTimeout(() => {
        if (infoIdx < totalInfo) { infoIdx++; updateInfo(); startInfoTimer(); }
        else closeInfo();
    }, 10000);
}
function stopInfoTimer()  { if (infoTimer) clearTimeout(infoTimer); }
function closeInfo() {
    stopInfoTimer();
    document.getElementById("info-overlay").style.display = "none";
    infoBGM.pause();
}
function handleSwipeInfo() {
    const diff = infoTouchEndX - infoTouchStartX;
    if (diff < -50) nextInfo();
    else if (diff > 50) prevInfo();
}
