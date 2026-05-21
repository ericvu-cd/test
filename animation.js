// =============================================
// 🎬 animation.js — 卡片飛行、退牌、媽祖特效、聊天氣泡、倒數
// =============================================

// ── 出牌飛行動畫（手牌 → 海洋） ──────────────
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

    const fly = _createFlyCard(card, startX, startY,
        "border: 1.5px solid rgba(160,200,255,0.3); box-shadow: 0 0 0 3px rgba(80,120,180,0.2), 0 8px 24px rgba(0,10,40,0.6), 0 0 16px rgba(100,160,255,0.25);");

    requestAnimationFrame(() => requestAnimationFrame(() => {
        fly.style.transition = "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.5s ease";
        fly.style.transform  = `translate(${endX - startX}px, ${endY - startY}px) scale(0.75)`;
        fly.style.opacity    = "0";
    }));

    setTimeout(() => { fly.remove(); if (callback) callback(); }, 1550);
}

// ── 退牌動畫（海洋 → 手牌） ──────────────────
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

    const fly = _createFlyCard(card, startX, startY,
        "border: 1.5px solid rgba(255,100,100,0.5); box-shadow: 0 0 0 3px rgba(180,60,60,0.2), 0 8px 24px rgba(40,0,0,0.5), 0 0 16px rgba(255,80,80,0.2); opacity: 0;");

    requestAnimationFrame(() => requestAnimationFrame(() => {
        fly.style.transition = "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.5s ease";
        fly.style.transform  = `translate(${endX - startX}px, ${endY - startY}px) scale(1.1)`;
        fly.style.opacity    = "1";
    }));

    setTimeout(() => {
        fly.style.transition = "opacity 0.3s ease";
        fly.style.opacity    = "0";
        setTimeout(() => { fly.remove(); if (callback) callback(); }, 300);
    }, 1500);
}

// 建立飛行卡片 DOM
function _createFlyCard(card, startX, startY, extraStyle) {
    const lightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    const fly = document.createElement("div");
    fly.style.cssText = `
        position: fixed; left: ${startX}px; top: ${startY}px;
        width: 90px; border-radius: 10px; overflow: hidden;
        pointer-events: none; z-index: 5000; transition: none;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        ${extraStyle}
    `;
    fly.innerHTML = `
        <div style="background:${lightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    document.body.appendChild(fly);
    return fly;
}

// ── 媽祖贈牌特效 ──────────────────────────────
function showMazuGiftEffect(fromName, toName, card, targetEl, fromEl) {
    const flyLayer = document.createElement("div");
    flyLayer.id = "mazu-gift-effect";
    document.body.appendChild(flyLayer);

    const resolvedFromEl = fromEl
        || (fromName === "你" ? document.getElementById("player-zone") : document.querySelector(".char-area"));
    const toEl = targetEl || document.querySelector(".char-area");

    const fromRect = (resolvedFromEl || document.body).getBoundingClientRect();
    const toRect   = (toEl          || document.body).getBoundingClientRect();
    const startX = fromRect.left + fromRect.width  / 2 - 40;
    const startY = fromRect.top  + fromRect.height / 2 - 55;
    const endX   = toRect.left   + toRect.width    / 2 - 40;
    const endY   = toRect.top    + toRect.height   / 2 - 55;

    const mazuLightBg = card.l === 1 ? "#d4f5e2" : card.l === 2 ? "#fef3cd" : "#ffd6da";
    const flyCard = document.createElement("div");
    flyCard.className = "mazu-gift-card-fly";
    flyCard.style.cssText = `
        position: fixed; left: ${startX}px; top: ${startY}px;
        width: 90px; border-radius: 10px; overflow: hidden; pointer-events: none;
        background: linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(200,230,255,0.08) 100%);
        border: 1.5px solid rgba(160,200,255,0.3);
        box-shadow: 0 0 0 3px rgba(80,120,180,0.2), 0 8px 24px rgba(0,10,40,0.6), 0 0 16px rgba(100,160,255,0.25);
        --fly-x: ${endX - startX}px; --fly-y: ${endY - startY}px;
        --fly-x2: ${endX - startX + 20}px; --fly-y2: ${endY - startY - 20}px;
    `;
    flyCard.innerHTML = `
        <div style="background:${mazuLightBg}; font-size:0.85rem; font-weight:900; text-align:center; padding:5px 2px; color:#444; border-bottom:1px solid rgba(0,0,0,0.1);">${card.n}</div>
        <div style="height:38px; overflow:hidden;">
            <img src="fishdb/${card.n}.png" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
        </div>
    `;
    flyLayer.appendChild(flyCard);

    setTimeout(() => {
        const banner = document.createElement("div");
        banner.className = "mazu-gift-banner";
        banner.innerHTML = `
            <div class="banner-icon">🙏</div>
            <div class="banner-img-wrap">
                <img src="fishdb/${card.n}.png" onerror="this.parentNode.style.display='none'" alt="${card.n}">
            </div>
            <div class="banner-from">${fromName} 分享</div>
            <div class="banner-fish">【${card.n}】</div>
            <div class="banner-to">➜ ${toName}</div>
        `;
        document.body.appendChild(banner);
        setTimeout(() => {
            banner.style.transition  = "opacity 0.6s";
            banner.style.opacity     = "0";
            flyLayer.style.transition = "opacity 0.6s";
            flyLayer.style.opacity   = "0";
            setTimeout(() => { banner.remove(); flyLayer.remove(); }, 600);
        }, 3000);
    }, 2000);
}

// ── 聊天氣泡 ──────────────────────────────────
function showChat(p, msg) {
    const layer = document.getElementById("chat-layer");
    const el    = document.getElementById(p.id);
    if (!el) return;

    const rect   = el.getBoundingClientRect();
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerText = msg;
    layer.appendChild(bubble);

    const bubbleWidth = bubble.offsetWidth;
    const padding = 10;
    let left = rect.left + rect.width / 2 - bubbleWidth / 2;
    const maxLeft = window.innerWidth - bubbleWidth - padding;
    left = Math.max(padding, Math.min(left, maxLeft));
    bubble.style.left = left + "px";
    bubble.style.top  = rect.top - 10 + "px";

    setTimeout(() => bubble.remove(), 3000);
}

// ── 倒數氣泡 ──────────────────────────────────
function showCountdownBubble(seconds, callback) {
    const layer = document.getElementById("chat-layer");
    const ocean = document.getElementById("ocean");
    if (!layer || !ocean) { callback(); return; }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble countdown-bubble";
    bubble.style.cssText = `
        position: fixed; left: 50%; transform: translateX(-50%);
        bottom: 130px; z-index: 1500; font-size: 1.2rem;
        text-align: center; pointer-events: none;
    `;
    layer.appendChild(bubble);

    let remaining = seconds;
    function tick() {
        bubble.innerText = `📋 ${remaining} 秒後進入結算，可先點牌放大查看`;
        if (remaining <= 0) { bubble.remove(); callback(); return; }
        remaining--;
        setTimeout(tick, 1000);
    }
    tick();
}

// ── AI 說話 ──────────────────────────────────
function aiTalk(p, card, isCorrectGuess = null) {
    if (p !== speakingAI) return;
    const persona = p.personality;
    let lines = [...dialogueDB[persona].play];
    if (isCorrectGuess === false && dialogueDB[persona].playWrong)
        lines.push(...dialogueDB[persona].playWrong);
    showChat(p, lines[Math.floor(Math.random() * lines.length)]);
}

function aiTalkMazuGive(p, target, card) {
    const lines = dialogueDB[p.personality].mazuGive;
    showChat(p, lines[Math.floor(Math.random() * lines.length)]);
}

function aiTalkMazuReceive(p, from, card) {
    const lines = dialogueDB[p.personality].mazuReceive;
    showChat(p, lines[Math.floor(Math.random() * lines.length)]);
}
