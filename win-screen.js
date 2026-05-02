// =============================================
// 🏆 新版結束畫面  showWinScreen(winner)
// 取代 main.js 中原本的 showWinScreen 函式
// =============================================

function showWinScreen(winner) {
    const isPlayer = !winner.isAI;

    // ── 建立全螢幕遮罩 ──────────────────────────────
    const overlay = document.createElement("div");
    overlay.id = "win-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9000;
        overflow: hidden; font-family: "Microsoft JhengHei","PingFang TC",sans-serif;
		background: rgba(0,0,0,0.95); /* 🔥 加這行 */
        opacity: 0; transition: opacity .8s ease;
    `;

    // ── 背景圖（bge.png）──────────────────────────
    const bgImg = document.createElement("div");
    bgImg.style.cssText = `
        position: absolute; inset: 0;
        background: url('bge.png') center center / cover no-repeat;
        opacity: ${isPlayer ? .55 : .38};
        ${isPlayer ? '' : 'filter: hue-rotate(200deg) saturate(.7) brightness(.65);'}
    `;
    overlay.appendChild(bgImg);

    // ── 色調疊層 ──────────────────────────────────
    const wash = document.createElement("div");
    wash.style.cssText = `
        position: absolute; inset: 0; pointer-events: none;
        background: ${isPlayer
            ? 'linear-gradient(180deg,rgba(5,14,12,.55) 0%,rgba(8,35,18,.3) 45%,rgba(4,18,10,.72) 100%)'
            : 'linear-gradient(180deg,rgba(3,10,24,.68) 0%,rgba(5,18,40,.38) 45%,rgba(2,8,20,.78) 100%)'};
    `;
    overlay.appendChild(wash);

    // ── 動態元素容器（粒子/光束/漣漪都放這） ──────
    const fxLayer = document.createElement("div");
    fxLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    overlay.appendChild(fxLayer);

    if (isPlayer) {
        // ── 玩家勝：光束 ──────────────────────────
        const rayData = [
            { left:"12%", w:"3px", deg:"-9", delay:"0s"   },
            { left:"25%", w:"5px", deg:"-4", delay:".6s"  },
            { left:"40%", w:"8px", deg:"-1", delay:"1.2s" },
            { left:"58%", w:"6px", deg:" 3", delay:".3s"  },
            { left:"72%", w:"4px", deg:" 6", delay:"1s"   },
            { left:"85%", w:"3px", deg:" 9", delay:"1.7s" },
        ];
        rayData.forEach(r => {
            const ray = document.createElement("div");
            ray.style.cssText = `
                position:absolute; top:0; left:${r.left}; width:${r.w}; height:70%;
                border-radius:3px; transform-origin:top center;
                transform:rotate(${r.deg}deg);
                background:linear-gradient(180deg,rgba(100,255,155,.28) 0%,transparent 100%);
                animation:winRayFade 4s ${r.delay} ease-in-out infinite;
            `;
            fxLayer.appendChild(ray);
        });

        // ── 玩家勝：金色底部光暈 ──────────────────
        const glow = document.createElement("div");
        glow.style.cssText = `
            position:absolute; bottom:-80px; left:50%; transform:translateX(-50%);
            width:300px; height:300px; border-radius:50%; pointer-events:none;
            background:radial-gradient(circle,rgba(255,200,50,.2) 0%,transparent 65%);
            animation:winGoldPulse 3s ease-in-out infinite;
        `;
        fxLayer.appendChild(glow);

        // ── 玩家勝：caustic 波光 ──────────────────
        const caustic = document.createElement("div");
        caustic.style.cssText = `
            position:absolute; inset:0; pointer-events:none;
            background:
                radial-gradient(ellipse 60% 30% at 28% 18%,rgba(80,255,150,.07) 0%,transparent 70%),
                radial-gradient(ellipse 40% 20% at 72% 32%,rgba(60,230,130,.05) 0%,transparent 70%);
            animation:winCaustic 7s ease-in-out infinite alternate;
        `;
        fxLayer.appendChild(caustic);

    } else {
        // ── AI勝：旋轉符文圓環 ────────────────────
        const runeWrap = document.createElement("div");
        runeWrap.style.cssText = `
            position:absolute; left:50%; top:36%;
            transform:translate(-50%,-50%);
            width:220px; height:220px;
        `;
        [{i:"0",   dur:"14s", dash:""},
         {i:"16px", dur:"10s", dash:"5,5", rev:"reverse"},
         {i:"32px", dur:"19s", dash:""}
        ].forEach(r => {
            const ring = document.createElement("div");
            ring.style.cssText = `
                position:absolute; inset:${r.i}; border-radius:50%;
                border:1px ${r.dash ? 'dashed' : 'solid'} rgba(60,140,255,.28);
                animation:winSpinRing ${r.dur} linear infinite ${r.rev||''};
            `;
            runeWrap.appendChild(ring);
        });
        fxLayer.appendChild(runeWrap);

        // ── AI勝：漣漪 ────────────────────────────
        for (let i = 0; i < 7; i++) {
            const rp = document.createElement("div");
            const sz = 30 + Math.random() * 55;
            rp.style.cssText = `
                position:absolute; border-radius:50%; pointer-events:none;
                width:${sz}px; height:${sz}px;
                left:${10+Math.random()*80}%; top:${8+Math.random()*78}%;
                border:1px solid rgba(50,120,255,.22);
                animation:winRipple ${5+Math.random()*6}s ${Math.random()*7}s ease-out infinite;
            `;
            fxLayer.appendChild(rp);
        }

        // ── AI勝：深藍底部光暈 ────────────────────
        const deepGlow = document.createElement("div");
        deepGlow.style.cssText = `
            position:absolute; bottom:-90px; left:50%; transform:translateX(-50%);
            width:340px; height:340px; border-radius:50%; pointer-events:none;
            background:radial-gradient(circle,rgba(40,100,255,.14) 0%,transparent 62%);
            animation:winDeepPulse 4s ease-in-out infinite;
        `;
        fxLayer.appendChild(deepGlow);
    }

    // ── 波紋掃線（底部，兩種版本共用） ──────────
    const waveStrip = document.createElement("div");
    waveStrip.style.cssText = `
        position:absolute; bottom:0; left:0; width:100%; height:90px; pointer-events:none;
        background:linear-gradient(0deg,${isPlayer ? 'rgba(0,40,20,.82)' : 'rgba(2,6,18,.9)'} 0%,transparent 100%);
    `;
    for (let i = 0; i < 3; i++) {
        const wl = document.createElement("div");
        wl.style.cssText = `
            position:absolute; top:${i*22}px; left:-100%; width:200%; height:1px; border-radius:1px;
            background:linear-gradient(90deg,transparent,${isPlayer ? 'rgba(100,255,160,.28)' : 'rgba(60,130,255,.22)'},transparent);
            animation:winWaveSweep ${4+i}s ${i*1.3}s linear infinite;
            opacity:${1 - i*0.28};
        `;
        waveStrip.appendChild(wl);
    }
    fxLayer.appendChild(waveStrip);

    // ── 粒子工廠（共用函式） ─────────────────────
    function spawnParticle() {
        const p = document.createElement("div");
        const sz = 2 + Math.random() * 5;
        const dur = 7 + Math.random() * 10;
        const dx = (Math.random() * 28 - 14).toFixed(1);
        const colors = isPlayer
            ? ["rgba(100,255,160,.7)","rgba(255,220,80,.65)","rgba(200,255,200,.5)","rgba(255,200,60,.6)"]
            : ["rgba(100,180,255,.7)","rgba(80,160,255,.6)","rgba(140,200,255,.5)","rgba(60,140,255,.55)"];
        p.style.cssText = `
            position:absolute; border-radius:50%; pointer-events:none;
            width:${sz}px; height:${sz}px;
            left:${Math.random()*96}%; bottom:-${sz}px;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            animation:winParticle ${dur}s ${Math.random()*4}s linear forwards;
            --dx:${dx}px;
        `;
        fxLayer.appendChild(p);
        setTimeout(() => p.remove(), (dur + 5) * 1000);
    }
    for (let i = 0; i < 16; i++) spawnParticle();
    const particleTimer = setInterval(spawnParticle, 900);

    // ── 玩家勝：彩帶 ──────────────────────────────
    const confColors = ["#ffd060","#ff7eb3","#7ee8fa","#22d48a","#b8a4ff","#ff9068","#ffe580"];
    function burstConfetti() {
        for (let i = 0; i < 26; i++) {
            const c = document.createElement("div");
            const dur = 2.2 + Math.random() * 2.2;
            c.style.cssText = `
                position:absolute; border-radius:2px; pointer-events:none;
                left:${10+Math.random()*80}%; top:-6px;
                width:${5+Math.random()*6}px; height:${5+Math.random()*6}px;
                background:${confColors[Math.floor(Math.random()*confColors.length)]};
                transform:rotate(${Math.random()*360}deg);
                animation:winCFall ${dur}s ${Math.random()*.9}s linear forwards;
            `;
            fxLayer.appendChild(c);
            setTimeout(() => c.remove(), (dur + 1.2) * 1000);
        }
    }
    if (isPlayer) {
        setTimeout(burstConfetti, 350);
        setTimeout(burstConfetti, 1800);
        setTimeout(burstConfetti, 3500);
    }

    // ── 中央文字內容（共用容器） ─────────────────
    const content = document.createElement("div");
    content.style.cssText = `
        position:absolute; inset:0; z-index:20;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        padding:24px 18px; gap:0;
    `;

    if (isPlayer) {
        // ── 玩家勝：獎盃圖示 ──────────────────────
        const badgeWrap = document.createElement("div");
        badgeWrap.style.cssText = `
            width:92px; height:92px; border-radius:50%; margin-bottom:12px;
            background:radial-gradient(circle,rgba(255,210,50,.42) 0%,transparent 68%);
            display:flex; align-items:center; justify-content:center;
            animation:winGlowGold 2.5s ease-in-out infinite, winDropIn .9s cubic-bezier(.34,1.56,.64,1) both;
        `;
        badgeWrap.innerHTML = `<span style="font-size:50px;animation:winIconFloat 2.2s ease-in-out infinite;display:block;">🏆</span>`;
        content.appendChild(badgeWrap);

        const title = document.createElement("div");
        title.style.cssText = `
            font-size:1.45rem; font-weight:900; color:#fff; letter-spacing:2px;
            text-align:center; text-shadow:0 0 22px rgba(120,255,160,.6);
            animation:winFadeUp .7s .3s both; margin-bottom:6px;
        `;
        title.textContent = "✦ 友魚勇者 任務達成 ✦";
        content.appendChild(title);

        const sub = document.createElement("div");
        sub.style.cssText = `
            font-size:.82rem; color:rgba(155,255,190,.85); text-align:center;
            line-height:1.6; animation:winFadeUp .7s .5s both; margin-bottom:24px;
        `;
        sub.innerHTML = "感謝您守護海洋資源<br>實踐永續食魚精神！";
        content.appendChild(sub);

    } else {
        // ── AI勝：符文圖示 ────────────────────────
        const sigilWrap = document.createElement("div");
        sigilWrap.style.cssText = `
            width:90px; height:90px; position:relative; margin-bottom:12px;
            animation:winDropIn .9s cubic-bezier(.34,1.56,.64,1) both;
        `;
        // 旋轉外環（裝飾，跟 fxLayer 的是不同的這個跟著 content 跑）
        [{i:"0",dur:"13s",dash:false},{i:"12px",dur:"9s",dash:true}].forEach(r => {
            const ring = document.createElement("div");
            ring.style.cssText = `
                position:absolute; inset:${r.i}; border-radius:50%;
                border:1px ${r.dash?'dashed':'solid'} rgba(60,140,255,.4);
                animation:winSpinRing ${r.dur} linear infinite ${r.dash?'reverse':''};
            `;
            sigilWrap.appendChild(ring);
        });
        const sigilCore = document.createElement("div");
        sigilCore.style.cssText = `
            position:absolute; inset:18px; border-radius:50%;
            background:radial-gradient(circle,rgba(40,100,220,.65) 0%,rgba(8,24,70,.92) 100%);
            display:flex; align-items:center; justify-content:center;
            animation:winGlowBlue 2.8s ease-in-out infinite;
        `;
        sigilCore.innerHTML = `<span style="font-size:28px;">🌊</span>`;
        sigilWrap.appendChild(sigilCore);
        content.appendChild(sigilWrap);

        const title = document.createElement("div");
        title.style.cssText = `
            font-size:1.38rem; font-weight:900; color:rgba(200,225,255,.95);
            letter-spacing:2px; text-align:center;
            text-shadow:0 0 18px rgba(50,130,255,.58);
            animation:winFadeUp .7s .3s both; margin-bottom:6px;
        `;
        title.textContent = "海域重歸寧靜";
        content.appendChild(title);

        const sub = document.createElement("div");
        sub.style.cssText = `
            font-size:.82rem; color:rgba(120,175,240,.82); text-align:center;
            line-height:1.65; animation:winFadeUp .7s .5s both; margin-bottom:24px;
        `;
        sub.innerHTML = `由 <strong style="color:#a8d4ff;">${winner.n}</strong> 率先與大海達成和解<br>這次冒險還差一點點…`;
        content.appendChild(sub);
    }

    // ── 按鈕區（共用） ────────────────────────────
    const btnZone = document.createElement("div");
    btnZone.style.cssText = `
        display:flex; flex-direction:column; gap:10px; width:82%; max-width:320px;
        animation:winFadeUp .7s .7s both;
    `;

    const btnMain = document.createElement("button");
    btnMain.style.cssText = `
        width:100%; padding:14px; border-radius:50px; border:none; cursor:pointer;
        font-size:1rem; font-weight:900; letter-spacing:1px;
        font-family:"Microsoft JhengHei","PingFang TC",sans-serif;
        ${isPlayer
            ? 'background:linear-gradient(135deg,#ffd060,#ff8c42);color:#3a1a00;box-shadow:0 4px 18px rgba(255,160,40,.45);'
            : 'background:linear-gradient(135deg,#3a7bff,#1a4fcc);color:#fff;box-shadow:0 4px 18px rgba(60,130,255,.45);'}
        transition:transform .15s, box-shadow .15s;
    `;
    btnMain.textContent = "↺ 重新啟航冒險";
    btnMain.onmouseenter = () => { btnMain.style.transform = "translateY(-2px)"; };
    btnMain.onmouseleave = () => { btnMain.style.transform = ""; };
    btnMain.onclick = () => location.reload();

    const btnSub = document.createElement("button");
    btnSub.style.cssText = `
        width:100%; padding:11px; border-radius:50px; cursor:pointer;
        font-size:.85rem; font-weight:700; letter-spacing:.5px;
        font-family:"Microsoft JhengHei","PingFang TC",sans-serif;
        border:1px solid ${isPlayer ? 'rgba(100,200,140,.32)' : 'rgba(100,160,255,.3)'};
        background:${isPlayer ? 'rgba(60,180,100,.1)' : 'rgba(60,100,200,.1)'};
        color:${isPlayer ? 'rgba(140,235,175,.9)' : 'rgba(140,195,255,.88)'};
        transition:background .2s;
    `;
    btnSub.textContent = isPlayer ? "🐟 查看出牌紀錄" : "📜 查看出牌紀錄";
    btnSub.onclick = () => {
        // 暫時隱藏 WinScreen（不移除），打開 log
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        openLog();

        // 攔截 log 的「關閉」按鈕，關掉後恢復 WinScreen
        const logModal = document.getElementById("log-modal");
        const originalCloseLog = window.closeLog;
        window.closeLog = function() {
            originalCloseLog();                         // 執行原本關閉邏輯
            overlay.style.transition = "opacity .4s ease";
            overlay.style.opacity = "1";
            overlay.style.pointerEvents = "";
            window.closeLog = originalCloseLog;         // 還原回原本的 closeLog
        };
    };

    btnZone.appendChild(btnMain);
    btnZone.appendChild(btnSub);
    content.appendChild(btnZone);
    overlay.appendChild(content);

    // ── CSS keyframes（注入一次） ─────────────────
    if (!document.getElementById("win-screen-keyframes")) {
        const style = document.createElement("style");
        style.id = "win-screen-keyframes";
        style.textContent = `
            @keyframes winRayFade     { 0%,100%{opacity:.28} 50%{opacity:1} }
            @keyframes winGoldPulse   { 0%,100%{transform:translateX(-50%) scale(1);opacity:.6} 50%{transform:translateX(-50%) scale(1.28);opacity:1} }
            @keyframes winDeepPulse   { 0%,100%{transform:translateX(-50%) scale(1);opacity:.5} 50%{transform:translateX(-50%) scale(1.32);opacity:1} }
            @keyframes winCaustic     { 0%{transform:scale(1) translateX(0);opacity:.7} 100%{transform:scale(1.1) translateX(12px);opacity:1} }
            @keyframes winSpinRing    { to{transform:rotate(360deg)} }
            @keyframes winRipple      { 0%{transform:scale(.04);opacity:.85} 100%{transform:scale(4.5);opacity:0} }
            @keyframes winGlowGold    { 0%,100%{box-shadow:0 0 14px rgba(255,200,40,.35)} 50%{box-shadow:0 0 42px rgba(255,200,40,.8)} }
            @keyframes winGlowBlue    { 0%,100%{box-shadow:0 0 12px rgba(50,130,255,.38)} 50%{box-shadow:0 0 36px rgba(50,130,255,.85)} }
            @keyframes winIconFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
            @keyframes winDropIn      { from{opacity:0;transform:translateY(-48px) scale(.6)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes winFadeUp      { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
            @keyframes winParticle    { 0%{transform:translateY(0) translateX(0);opacity:0} 8%{opacity:1} 92%{opacity:.7} 100%{transform:translateY(-560px) translateX(var(--dx,8px));opacity:0} }
            @keyframes winCFall       { 0%{transform:translateY(-8px) rotate(0deg);opacity:1} 100%{transform:translateY(620px) rotate(720deg);opacity:0} }
            @keyframes winWaveSweep   { from{transform:translateX(0)} to{transform:translateX(50%)} }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    // ── 淡入進場 ──────────────────────────────────
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
        });
    });

    // ── 離開時清理 ────────────────────────────────
    overlay.addEventListener("remove", () => clearInterval(particleTimer));
}
