// =============================================
// 📂 drawer.js — 手牌抽屜滑動系統
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
        document.body.appendChild(drawer);

        let dy0 = 0;
        drawer.addEventListener("touchstart", (e) => { dy0 = e.touches[0].clientY; }, { passive: true });
        drawer.addEventListener("touchend",   (e) => { if (e.changedTouches[0].clientY - dy0 > 50) closeDrawer(); }, { passive: true });
    }

    renderDrawer(drawer);
    drawer.style.display = "block";
    requestAnimationFrame(() => { drawer.style.transform = "translateY(0)"; });
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

// ── 手牌區上滑手勢偵測 ──────────────────────────
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
        intentDecided = false; isVerticalSwipe = false;
    }, { passive: true });

    zone.addEventListener("touchmove", (e) => {
        if (drawerOpen) return;
        if (document.getElementById("win-overlay")) return;
        const dy = e.touches[0].clientY - startY;
        const dx = Math.abs(e.touches[0].clientX - startX);
        if (!intentDecided) {
            if (Math.abs(dy) < 8 && dx < 8) return;
            isVerticalSwipe = Math.abs(dy) > dx;
            intentDecided = true;
        }
        if (isVerticalSwipe && dy < 0) e.preventDefault();
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
