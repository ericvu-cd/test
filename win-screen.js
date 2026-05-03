// =============================================
// 🏆 新版結束畫面  showWinScreen(winner)
// 修正：全黑底遮罩、文字放大2x、結算BGM
// =============================================

function showWinScreen(winner) {
    const isPlayer = !winner.isAI;

    // ── 暫停遊戲 BGM，播放結算音樂 ───────────────
    const gameBgm = document.getElementById("bgm");
    const musicWasOn = gameBgm && !gameBgm.paused;
    if (musicWasOn) gameBgm.pause();

    const winBgm = new Audio("MZ.mp3");
    winBgm.loop = true;
    winBgm.volume = 0;
    if (musicWasOn) {
        winBgm.play().catch(() => {});
        let vol = 0;
        const fadeInBgm = setInterval(() => {
            vol = Math.min(1, vol + 0.04);
            winBgm.volume = vol;
            if (vol >= 1) clearInterval(fadeInBgm);
        }, 80);
    }

    // ── 全螢幕遮罩（純黑底，完全遮蔽遊戲畫面）────
    const overlay = document.createElement("div");
    overlay.id = "win-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 5000;
        overflow: hidden;
        font-family: "Microsoft JhengHei","PingFang TC",sans-serif;
        background: #000;
        opacity: 0; transition: opacity 1s ease;
    `;

    // ── bge.png 背景圖（高不透明度）──────────────
    const bgImg = document.createElement("div");
    bgImg.style.cssText = `
        position: absolute; inset: 0;
        background: url('bge.png') center center / cover no-repeat;
        opacity: ${isPlayer ? 1 : .85};
        ${isPlayer ? '' : 'filter: hue-rotate(190deg) saturate(.8) brightness(.55);'}
    `;
    overlay.appendChild(bgImg);

    // ── 深色疊層（確保文字可讀）──────────────────
    const solidMask = document.createElement("div");
    solidMask.style.cssText = `
        position: absolute; inset: 0; pointer-events: none;
        background: ${isPlayer
            ? 'linear-gradient(180deg,rgba(2,10,6,.48) 0%,rgba(3,18,8,.28) 40%,rgba(1,10,4,.65) 100%)'
            : 'linear-gradient(180deg,rgba(1,5,15,.58) 0%,rgba(3,12,28,.32) 40%,rgba(1,4,14,.72) 100%)'};
    `;
    overlay.appendChild(solidMask);

    // ── 特效容器 ──────────────────────────────────
    const fxLayer = document.createElement("div");
    fxLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    overlay.appendChild(fxLayer);

    if (isPlayer) {
        // 光束
        [{l:"10%",w:"4px",d:"-9",t:"0s"},
         {l:"24%",w:"7px",d:"-4",t:".6s"},
         {l:"40%",w:"11px",d:"-1",t:"1.2s"},
         {l:"58%",w:"8px",d:"3",t:".3s"},
         {l:"73%",w:"5px",d:"6",t:"1s"},
         {l:"86%",w:"4px",d:"9",t:"1.7s"}
        ].forEach(r => {
            const ray = document.createElement("div");
            ray.style.cssText = `
                position:absolute;top:0;left:${r.l};width:${r.w};height:72%;
                border-radius:4px;transform-origin:top center;transform:rotate(${r.d}deg);
                background:linear-gradient(180deg,rgba(120,255,170,.38) 0%,transparent 100%);
                animation:winRayFade 4s ${r.t} ease-in-out infinite;
            `;
            fxLayer.appendChild(ray);
        });
        // 金色底暈
        const glow = document.createElement("div");
        glow.style.cssText = `
            position:absolute;bottom:-60px;left:50%;transform:translateX(-50%);
            width:340px;height:340px;border-radius:50%;
            background:radial-gradient(circle,rgba(255,200,50,.24) 0%,transparent 62%);
            animation:winGoldPulse 3s ease-in-out infinite;
        `;
        fxLayer.appendChild(glow);
        // caustic
        const caustic = document.createElement("div");
        caustic.style.cssText = `
            position:absolute;inset:0;
            background:radial-gradient(ellipse 55% 28% at 28% 16%,rgba(80,255,150,.1) 0%,transparent 68%),
                       radial-gradient(ellipse 38% 18% at 74% 30%,rgba(60,230,130,.08) 0%,transparent 68%);
            animation:winCaustic 7s ease-in-out infinite alternate;
        `;
        fxLayer.appendChild(caustic);

    } else {
        // 旋轉符文圓環
        const runeWrap = document.createElement("div");
        runeWrap.style.cssText = `
            position:absolute;left:50%;top:33%;transform:translate(-50%,-50%);
            width:250px;height:250px;opacity:.5;
        `;
        [{i:"0",dur:"14s",dash:false},
         {i:"18px",dur:"10s",dash:true,rev:true},
         {i:"36px",dur:"19s",dash:false}
        ].forEach(r => {
            const ring = document.createElement("div");
            ring.style.cssText = `
                position:absolute;inset:${r.i};border-radius:50%;
                border:1px ${r.dash?'dashed':'solid'} rgba(60,140,255,.4);
                animation:winSpinRing ${r.dur} linear infinite ${r.rev?'reverse':''};
            `;
            runeWrap.appendChild(ring);
        });
        fxLayer.appendChild(runeWrap);
        // 漣漪
        for (let i = 0; i < 8; i++) {
            const rp = document.createElement("div");
            const sz = 28 + Math.random()*60;
            rp.style.cssText = `
                position:absolute;border-radius:50%;
                width:${sz}px;height:${sz}px;
                left:${8+Math.random()*84}%;top:${6+Math.random()*80}%;
                border:1px solid rgba(50,120,255,.2);
                animation:winRipple ${5+Math.random()*6}s ${Math.random()*7}s ease-out infinite;
            `;
            fxLayer.appendChild(rp);
        }
        // 深藍底暈
        const deepGlow = document.createElement("div");
        deepGlow.style.cssText = `
            position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);
            width:380px;height:380px;border-radius:50%;
            background:radial-gradient(circle,rgba(40,100,255,.18) 0%,transparent 60%);
            animation:winDeepPulse 4s ease-in-out infinite;
        `;
        fxLayer.appendChild(deepGlow);
    }

    // ── 底部波紋掃線 ─────────────────────────────
    const waveStrip = document.createElement("div");
    waveStrip.style.cssText = `
        position:absolute;bottom:0;left:0;width:100%;height:110px;pointer-events:none;
        background:linear-gradient(0deg,${isPlayer?'rgba(0,30,12,.97)':'rgba(1,4,16,.97)'} 0%,transparent 100%);
    `;
    for (let i = 0; i < 3; i++) {
        const wl = document.createElement("div");
        wl.style.cssText = `
            position:absolute;top:${i*26}px;left:-100%;width:200%;height:1px;border-radius:1px;
            background:linear-gradient(90deg,transparent,${isPlayer?'rgba(100,255,160,.35)':'rgba(60,130,255,.28)'},transparent);
            animation:winWaveSweep ${4+i}s ${i*1.3}s linear infinite;
            opacity:${1-i*0.3};
        `;
        waveStrip.appendChild(wl);
    }
    fxLayer.appendChild(waveStrip);

    // ── 粒子 ──────────────────────────────────────
    function spawnParticle() {
        const p = document.createElement("div");
        const sz = 2.5 + Math.random()*5.5;
        const dur = 7 + Math.random()*10;
        const dx = (Math.random()*28-14).toFixed(1);
        const colors = isPlayer
            ? ["rgba(120,255,170,.75)","rgba(255,220,80,.7)","rgba(210,255,210,.55)","rgba(255,200,60,.65)"]
            : ["rgba(100,185,255,.75)","rgba(80,160,255,.65)","rgba(150,210,255,.55)","rgba(60,145,255,.6)"];
        p.style.cssText = `
            position:absolute;border-radius:50%;pointer-events:none;
            width:${sz}px;height:${sz}px;
            left:${Math.random()*96}%;bottom:-${sz}px;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            animation:winParticle ${dur}s ${Math.random()*4}s linear forwards;
            --dx:${dx}px;
        `;
        fxLayer.appendChild(p);
        setTimeout(() => p.remove(), (dur+5)*1000);
    }
    for (let i = 0; i < 18; i++) spawnParticle();
    const particleTimer = setInterval(spawnParticle, 850);

    // ── 玩家勝：彩帶 ─────────────────────────────
    const confColors = ["#ffd060","#ff7eb3","#7ee8fa","#22d48a","#b8a4ff","#ff9068","#ffe580","#a8f0c8"];
    function burstConfetti() {
        for (let i = 0; i < 28; i++) {
            const c = document.createElement("div");
            const dur = 2.4 + Math.random()*2.4;
            c.style.cssText = `
                position:absolute;border-radius:2px;pointer-events:none;
                left:${8+Math.random()*84}%;top:-8px;
                width:${5+Math.random()*7}px;height:${5+Math.random()*7}px;
                background:${confColors[Math.floor(Math.random()*confColors.length)]};
                transform:rotate(${Math.random()*360}deg);
                animation:winCFall ${dur}s ${Math.random()*.9}s linear forwards;
            `;
            fxLayer.appendChild(c);
            setTimeout(()=>c.remove(),(dur+1.2)*1000);
        }
    }
    if (isPlayer) {
        setTimeout(burstConfetti, 300);
        setTimeout(burstConfetti, 1700);
        setTimeout(burstConfetti, 3400);
    }

    // ── 中央內容（文字放大 2x）────────────────────
    const content = document.createElement("div");
    content.style.cssText = `
        position:absolute;inset:0;z-index:20;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:30px 24px 26px;
        overflow-y:auto;-webkit-overflow-scrolling:touch;
    `;

    if (isPlayer) {
        const badgeWrap = document.createElement("div");
        badgeWrap.style.cssText = `
            width:130px;height:130px;border-radius:50%;margin-bottom:20px;
            background:radial-gradient(circle,rgba(255,210,50,.46) 0%,transparent 68%);
            display:flex;align-items:center;justify-content:center;flex-shrink:0;
            animation:winGlowGold 2.5s ease-in-out infinite,winDropIn .9s cubic-bezier(.34,1.56,.64,1) both;
        `;
        badgeWrap.innerHTML = `<span style="font-size:72px;animation:winIconFloat 2.2s ease-in-out infinite;display:block;filter:drop-shadow(0 0 18px rgba(255,200,40,.95))">🏆</span>`;
        content.appendChild(badgeWrap);

        const title = document.createElement("div");
        title.style.cssText = `
            font-size:2.4rem;font-weight:900;color:#fff;letter-spacing:3px;
            text-align:center;text-shadow:0 0 30px rgba(120,255,160,.75),0 2px 10px rgba(0,0,0,.9);
            animation:winFadeUp .7s .3s both;margin-bottom:12px;line-height:1.2;
        `;
        title.textContent = "✦ 友魚勇者 任務達成 ✦";
        content.appendChild(title);

        const sub = document.createElement("div");
        sub.style.cssText = `
            font-size:1.25rem;color:rgba(175,255,205,.92);text-align:center;
            line-height:1.75;animation:winFadeUp .7s .5s both;margin-bottom:36px;
            text-shadow:0 1px 8px rgba(0,0,0,.8);
        `;
        sub.innerHTML = "感謝您守護海洋資源<br>實踐永續食魚精神！";
        content.appendChild(sub);

    } else {
        const sigilWrap = document.createElement("div");
        sigilWrap.style.cssText = `
            width:124px;height:124px;position:relative;margin-bottom:20px;flex-shrink:0;
            animation:winDropIn .9s cubic-bezier(.34,1.56,.64,1) both;
        `;
        [{i:"0",dur:"13s",dash:false},{i:"15px",dur:"9s",dash:true,rev:true}].forEach(r => {
            const ring = document.createElement("div");
            ring.style.cssText = `
                position:absolute;inset:${r.i};border-radius:50%;
                border:1.5px ${r.dash?'dashed':'solid'} rgba(60,140,255,.48);
                animation:winSpinRing ${r.dur} linear infinite ${r.rev?'reverse':''};
            `;
            sigilWrap.appendChild(ring);
        });
        const sigilCore = document.createElement("div");
        sigilCore.style.cssText = `
            position:absolute;inset:22px;border-radius:50%;
            background:radial-gradient(circle,rgba(40,100,220,.72) 0%,rgba(8,24,70,.96) 100%);
            display:flex;align-items:center;justify-content:center;
            animation:winGlowBlue 2.8s ease-in-out infinite;
        `;
        sigilCore.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 14px rgba(80,160,255,.95))"><circle cx="22" cy="22" r="14" stroke="rgba(140,200,255,0.9)" stroke-width="2.5" fill="none"/><circle cx="22" cy="22" r="6" fill="rgba(100,170,255,0.7)"/><circle cx="22" cy="22" r="9" stroke="rgba(100,170,255,0.4)" stroke-width="1" stroke-dasharray="3 3" fill="none"/></svg>`;
        sigilWrap.appendChild(sigilCore);
        content.appendChild(sigilWrap);

        const title = document.createElement("div");
        title.style.cssText = `
            font-size:2.3rem;font-weight:900;color:rgba(215,235,255,.98);
            letter-spacing:3px;text-align:center;
            text-shadow:0 0 26px rgba(50,130,255,.7),0 2px 10px rgba(0,0,0,.9);
            animation:winFadeUp .7s .3s both;margin-bottom:12px;
        `;
        title.textContent = "海域重歸寧靜";
        content.appendChild(title);

        const sub = document.createElement("div");
        sub.style.cssText = `
            font-size:1.25rem;color:rgba(145,195,255,.9);text-align:center;
            line-height:1.75;animation:winFadeUp .7s .5s both;margin-bottom:36px;
            text-shadow:0 1px 8px rgba(0,0,0,.8);
        `;
        sub.innerHTML = `由 <strong style="color:#c4ddff;">${winner.n}</strong> 率先與大海達成和解<br>這次冒險還差一點點…`;
        content.appendChild(sub);
    }

    // ── 按鈕區 ────────────────────────────────────
    const btnZone = document.createElement("div");
    btnZone.style.cssText = `
        display:flex;flex-direction:column;gap:14px;width:88%;max-width:350px;
        animation:winFadeUp .7s .7s both;
    `;

    const btnMain = document.createElement("button");
    btnMain.style.cssText = `
        width:100%;padding:18px;border-radius:50px;border:none;cursor:pointer;
        font-size:1.2rem;font-weight:900;letter-spacing:1px;
        font-family:"Microsoft JhengHei","PingFang TC",sans-serif;
        ${isPlayer
            ? 'background:linear-gradient(135deg,#ffd060,#ff8c42);color:#3a1a00;box-shadow:0 5px 24px rgba(255,160,40,.52);'
            : 'background:linear-gradient(135deg,#3a7bff,#1a4fcc);color:#fff;box-shadow:0 5px 24px rgba(60,130,255,.52);'}
        transition:transform .15s,box-shadow .15s;
    `;
    btnMain.textContent = "↺ 重新啟航冒險";
    btnMain.onmouseenter = () => { btnMain.style.transform = "translateY(-2px)"; };
    btnMain.onmouseleave = () => { btnMain.style.transform = ""; };
    btnMain.onclick = () => {
        winBgm.pause();
        if (gameBgm) gameBgm.play().catch(()=>{});
        clearInterval(particleTimer);
        location.reload();
    };

    const btnSub = document.createElement("button");
    btnSub.style.cssText = `
        width:100%;padding:15px;border-radius:50px;cursor:pointer;
        font-size:1.05rem;font-weight:700;letter-spacing:.5px;
        font-family:"Microsoft JhengHei","PingFang TC",sans-serif;
        border:1.5px solid ${isPlayer?'rgba(100,220,150,.4)':'rgba(100,165,255,.38)'};
        background:${isPlayer?'rgba(60,180,100,.14)':'rgba(60,100,200,.14)'};
        color:${isPlayer?'rgba(165,248,194,.94)':'rgba(158,208,255,.92)'};
        transition:background .2s;
    `;
    btnSub.textContent = isPlayer ? "🐟 查看出牌紀錄" : "📜 查看出牌紀錄";
    btnSub.onclick = () => {
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        openLog();
        const originalCloseLog = window.closeLog;
        window.closeLog = function() {
            originalCloseLog();
            overlay.style.transition = "opacity .4s ease";
            overlay.style.opacity = "1";
            overlay.style.pointerEvents = "";
            window.closeLog = originalCloseLog;
        };
    };

    btnZone.appendChild(btnMain);
    btnZone.appendChild(btnSub);
    content.appendChild(btnZone);
    overlay.appendChild(content);

    // ── CSS keyframes（注入一次）─────────────────
    if (!document.getElementById("win-screen-keyframes")) {
        const style = document.createElement("style");
        style.id = "win-screen-keyframes";
        style.textContent = `
            @keyframes winRayFade   {0%,100%{opacity:.25}50%{opacity:1}}
            @keyframes winGoldPulse {0%,100%{transform:translateX(-50%) scale(1);opacity:.6}50%{transform:translateX(-50%) scale(1.3);opacity:1}}
            @keyframes winDeepPulse {0%,100%{transform:translateX(-50%) scale(1);opacity:.5}50%{transform:translateX(-50%) scale(1.36);opacity:1}}
            @keyframes winCaustic   {0%{transform:scale(1) translateX(0);opacity:.7}100%{transform:scale(1.12) translateX(14px);opacity:1}}
            @keyframes winSpinRing  {to{transform:rotate(360deg)}}
            @keyframes winRipple    {0%{transform:scale(.03);opacity:.85}100%{transform:scale(5.2);opacity:0}}
            @keyframes winGlowGold  {0%,100%{box-shadow:0 0 20px rgba(255,200,40,.4)}50%{box-shadow:0 0 52px rgba(255,200,40,.88)}}
            @keyframes winGlowBlue  {0%,100%{box-shadow:0 0 16px rgba(50,130,255,.42)}50%{box-shadow:0 0 46px rgba(50,130,255,.92)}}
            @keyframes winIconFloat {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
            @keyframes winDropIn    {from{opacity:0;transform:translateY(-55px) scale(.55)}to{opacity:1;transform:translateY(0) scale(1)}}
            @keyframes winFadeUp    {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
            @keyframes winParticle  {0%{transform:translateY(0) translateX(0);opacity:0}8%{opacity:1}92%{opacity:.7}100%{transform:translateY(-580px) translateX(var(--dx,8px));opacity:0}}
            @keyframes winCFall     {0%{transform:translateY(-8px) rotate(0deg);opacity:1}100%{transform:translateY(640px) rotate(730deg);opacity:0}}
            @keyframes winWaveSweep {from{transform:translateX(0)}to{transform:translateX(50%)}}
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    // 淡入進場
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.style.opacity = "1";
    }));
}
