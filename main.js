// --- 故事與說明功能 ---
let storyIdx = 1;
let storyTimer = null;
const totalStories = 6;

// 故事功能
function openStory() {
    storyIdx = 1;
    updateStory();
    document.getElementById(
        "story-overlay"
    ).style.display = "block";
    startStoryTimer();
}

function updateStory() {
    // 假設圖片檔名為 1.jpg, 2.jpg ... 6.jpg
    document.getElementById(
        "story-img"
    ).src = `P${storyIdx}.jpg`;
    
    document.getElementById(
        "story-page-num"
    ).innerText = `${storyIdx} / ${totalStories}`;
}

function nextStory() {
    stopStoryTimer();
    if (storyIdx < totalStories) {
        storyIdx++;
        updateStory();
        startStoryTimer();
    } else {
        closeStory();
    }
}

function startStoryTimer() {
    stopStoryTimer();
    storyTimer = setTimeout(
        () => {
            if (storyIdx < totalStories) {
                storyIdx++;
                updateStory();
                startStoryTimer();
            } else {
                closeStory();
            }
        }, 
        10000
    ); // 10秒自動下頁
}

function stopStoryTimer() {
    if (storyTimer) clearTimeout(storyTimer);
}

function closeStory() {
    stopStoryTimer();
    document.getElementById(
        "story-overlay"
    ).style.display = "none";
}

// 說明功能
function openInfo() {
    const infoEl = document.getElementById("info-overlay");
    infoEl.style.display = "flex";
    
    // 讀取同資料夾的 info.txt (請確保檔名正確)
    fetch('info.txt')
        .then(
            response => {
                if (!response.ok) throw new Error();
                return response.text();
            }
        )
        .then(
            data => {
                document.getElementById(
                    "info-content"
                ).innerText = data;
            }
        )
        .catch(
            () => {
                document.getElementById(
                    "info-content"
                ).innerText = "無法載入說明文件，請檢查資料夾內是否有 info.txt。";
            }
        );
}

function closeInfo() {
    document.getElementById(
        "info-overlay"
    ).style.display = "none";
}

let players = [], 
    deckS = [], 
    table = [], 
    currentS = null, 
    callerIdx = 0, 
    phase = "WAIT";

// --- 標籤生成邏輯 ---
function getFishTags(f) {
    let html = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1px;">';
    
    // 季節
    if (f.s.includes("全年")) {
        html += `<span class="tag tag-all">全年</span>`;
    } else {
        if (f.s.includes("春")) html += `<span class="tag tag-spring">春</span>`;
        if (f.s.includes("夏")) html += `<span class="tag tag-summer">夏</span>`;
        if (f.s.includes("秋")) html += `<span class="tag tag-autumn">秋</span>`;
        if (f.s.includes("冬")) html += `<span class="tag tag-winter">冬</span>`;
    }

    // 漁法標籤邏輯
    const ecoMethods = [
        "一支釣", 
        "定置", 
        "養殖", 
        "手釣", 
        "棒受網", 
        "籠具", 
        "釣具", 
        "標槍"
    ];
    
    f.m.forEach(
        method => {
            // 判斷是否包含友善漁法關鍵字
            const isEco = ecoMethods.some(
                eco => method.includes(eco)
            );
            html += `<span class="tag ${isEco ? 'tag-eco' : 'tag-warn'}">${method}</span>`;
        }
    );

    // 習性
    const hClass = f.h.includes("洄游") ? "tag-migratory" : "tag-sedentary";
    html += `<span class="tag ${hClass}">${f.h}</span>`;

    // 來源
    let dClass = "tag-coastal";
    if (f.d.includes("遠洋")) dClass = "tag-ocean";
    if (f.d.includes("養殖")) dClass = "tag-farm";
    html += `<span class="tag ${dClass}">${f.d}</span>`;

    html += '</div>';
    return html;
}

// AI跟牌判定
const refCard = table[0]?.card;
function matchByReference(f, ref) {
    if (!ref) return true;

    // 你可以自由決定要比什麼（這是基本版）
    return (
        f.l === ref.l ||                  // 同燈號
        f.m.some(m => ref.m.includes(m)) || // 有相同漁法
        f.h === ref.h ||                  // 同習性
        f.d === ref.d                     // 同來源
    );
}

// --- 遊戲運行邏輯與 UI 渲染 ---
function renderUI() {
    players.forEach(
        (p, i) => { 
            if(i > 0) {
                // 透過容器設定負的字距，並強制不換行
                const cardsIcon = `<span style="letter-spacing: -5px; display: inline-block; white-space: nowrap; margin-top: 5px;">${"🎴".repeat(p.hand.length)}</span>`;
                document.getElementById(
                    p.id
                ).innerHTML = `${p.n}<br>${cardsIcon}`; 
            }
        }
    );

    document.getElementById(
        "deck-info"
    ).innerText = `剩餘${deckS.length}次召喚`;
    
    const handEl = document.getElementById("player-hand");
    handEl.innerHTML = "";
    
    const isNormalTask = currentS && !currentS.isMazu && phase === "PLAYER_TURN" && callerIdx === 0;
    const hasValid = isNormalTask && players[0].hand.some(
        f => currentS.c(f)
    );

    players[0].hand.forEach(
        (f, idx) => {
            const c = document.createElement("div");
            c.className = `card light-${f.l}`;
            if (hasValid) {
                if (currentS.c(f)) {
                    c.classList.add("is-valid");
                } else {
                    c.classList.add("is-not-valid");
                }
            }
            c.innerHTML = `<div class="card-n">${f.n}</div><div class="card-i">${getFishTags(f)}</div>`;
            c.onclick = () => playerAction(idx);
            handEl.appendChild(c);
        }
    );
}

function renderTable() {
    const zone = document.getElementById("table");
    zone.innerHTML = "";
    table.forEach(
        (t, index) => {
            const c = document.createElement("div");
            c.className = `card light-${t.card.l}`;
            c.innerHTML = `<div class="card-n">${t.card.n}</div><div class="card-i">${getFishTags(t.card)}</div>`;
            zone.appendChild(c);
            if (index === table.length - 1) { 
                void c.offsetWidth; 
                c.classList.add("card-played"); 
            }
        }
    );
}

// --- 其他輔助函式保持不變 ---
function playPopSfx() { 
    try { 
        const ctx = new (
            window.AudioContext || 
            window.webkitAudioContext
        )(); 
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain(); 
        
        osc.connect(gain); 
        gain.connect(ctx.destination); 
        
        osc.frequency.setValueAtTime(
            500, 
            ctx.currentTime
        ); 
        osc.frequency.exponentialRampToValueAtTime(
            100, 
            ctx.currentTime + 0.1
        ); 
        gain.gain.setValueAtTime(
            0.2, 
            ctx.currentTime
        ); 
        
        osc.start(); 
        osc.stop(ctx.currentTime + 0.1); 
    } catch(e) {} 
}

function playMazuSfx() { 
    try { 
        const ctx = new (
            window.AudioContext || 
            window.webkitAudioContext
        )(); 
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain(); 
        osc.type = 'sine'; 
        
        osc.connect(gain); 
        gain.connect(ctx.destination); 
        
        osc.frequency.setValueAtTime(
            880, 
            ctx.currentTime
        ); 
        osc.frequency.exponentialRampToValueAtTime(
            1760, 
            ctx.currentTime + 0.4
        ); 
        gain.gain.setValueAtTime(
            0.3, 
            ctx.currentTime
        ); 
        gain.gain.exponentialRampToValueAtTime(
            0.01, 
            ctx.currentTime + 0.6
        ); 
        
        osc.start(); 
        osc.stop(ctx.currentTime + 0.6); 
    } catch(e) {} 
}

function playSuccessSfx() { 
    try { 
        const ctx = new (
            window.AudioContext || 
            window.webkitAudioContext
        )(); 
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain(); 
        osc.type = 'triangle'; 
        
        osc.connect(gain); 
        gain.connect(ctx.destination); 
        
        osc.frequency.setValueAtTime(
            523.25, 
            ctx.currentTime
        ); 
        osc.frequency.setValueAtTime(
            659.25, 
            ctx.currentTime + 0.1
        ); 
        gain.gain.setValueAtTime(
            0.2, 
            ctx.currentTime
        ); 
        gain.gain.exponentialRampToValueAtTime(
            0.01, 
            ctx.currentTime + 0.3
        ); 
        
        osc.start(); 
        osc.stop(ctx.currentTime + 0.3); 
    } catch(e) {} 
}

function addLog(m, type="") {
    const l = document.getElementById("log");
    let className = "log-entry";
    if(type === "cmd") className += " log-cmd";
    if(type === "secret") className += " log-secret";
    if(type === "success") className += " log-success";
    l.innerHTML = `<div class="${className}">> ${m}</div>` + l.innerHTML;
}

function toggleMusic() {
    const music = document.getElementById("bgm");
    const btn = document.getElementById("music-control");
    if (music.paused) { 
        music.play(); 
        btn.innerText = "🎵"; 
        btn.style.opacity = "1"; 
    } else { 
        music.pause(); 
        btn.innerText = "🔇"; 
        btn.style.opacity = "0.4"; 
    }
}

function createBubble() {
    const b = document.createElement("div");
    b.className = "bubble";

    b.style.left = Math.random() * 100 + "%";
    b.style.animationDuration = (3 + Math.random() * 3) + "s";
    b.style.width = b.style.height = (5 + Math.random() * 10) + "px";

    document.getElementById("bubbles").appendChild(b);

    setTimeout(
        () => b.remove(), 
        8000
    );
}

setInterval(
    createBubble, 
    500
);

const fishColors = [
    ["#ff9aa2", "#ffb7b2"], // 粉
    ["#a0e7e5", "#b4f8c8"], // 青綠
    ["#a0c4ff", "#bdb2ff"], // 藍紫
    ["#ffd6a5", "#fdffb6"], // 橘黃
];

function createFish() {
    const fish = document.createElement("div");
    const color = fishColors[
        Math.floor(Math.random() * fishColors.length)
    ];
    fish.className = "fish";

    // 隨機高度（在 ocean 裡）
    fish.style.top = Math.random() * 70 + "%";

    // 隨機大小
    const size = 20 + Math.random() * 20;
    fish.style.width = size + "px";
    fish.style.height = size / 2 + "px";

    // 隨機速度
    const duration = 8 + Math.random() * 8;
    fish.style.animationDuration = duration + "s";

    fish.style.background = `linear-gradient(90deg, ${color[0]}, ${color[1]})`;
    fish.style.color = color[0];

    document.getElementById("fish-layer").appendChild(fish);

    setTimeout(
        () => fish.remove(), 
        duration * 1200
    );
}

// 每 2~4 秒出一隻魚
setInterval(
    createFish, 
    3000
);

function initGame() {
    document.getElementById("music-control").style.display = "flex";
    const music = document.getElementById("bgm");
    music.play().then(
        () => { 
            music.volume = 0.1; 
        }
    ).catch(
        err => console.log("播放受阻")
    );
    
    document.getElementById("welcome-screen").style.opacity = "0";
    setTimeout(
        () => { 
            document.getElementById(
                "welcome-screen"
            ).style.display = "none"; 
            startGame(); 
        }, 
        500
    );
}

function startGame() {
    let names = [
        "阿海", 
        "小波", 
        "大龍", 
        "水哥", 
        "婷婷", 
        "怪叔叔", 
        "瓜瓜", 
        "美代子", 
        "風神", 
        "阿福"
    ].sort(
        () => Math.random() - 0.5
    );
    
    players = [
        { 
            n: "你", 
            hand: [], 
            isAI: false 
        },
        { 
            n: names[0], 
            hand: [], 
            isAI: true, 
            id: "ai-1" 
        },
        { 
            n: names[1], 
            hand: [], 
            isAI: true, 
            id: "ai-2" 
        },
        { 
            n: names[2], 
            hand: [], 
            isAI: true, 
            id: "ai-3" 
        }
    ];
    
    let fishD = [...fishDB].sort(
        () => Math.random() - 0.5
    );
    
    players.forEach(
        p => p.hand = fishD.splice(0, 6)
    );
    
    deckS = [...summonDB, ...mazuCards].sort(
        () => Math.random() - 0.5
    );
    
    addLog("勇者集結！注意觀察大家的出牌...");
    renderUI();
    autoStep();
}

function updateCallerHighlight() {
    players.forEach(
        (p, idx) => {
            let el = (idx === 0) 
                ? document.getElementById("player-zone") 
                : document.getElementById(p.id);
            if (el) {
                if (idx === callerIdx) {
                    el.classList.add("is-caller");
                } else {
                    el.classList.remove("is-caller");
                }
            }
        }
    );
}

function autoStep() {
//    if (deckS.length === 0) { 
//        addLog("召喚卡已用盡，海域恢復平靜。"); 
//        return; 
//    }
    if (deckS.length === 0) { 
        // --- 新增：終局結算邏輯 ---
        addLog("召喚卡已用盡，結算海域生態貢獻...", "cmd");
        
        // 依照手牌張數排序，張數最少的為贏家
        let sortedPlayers = [...players].sort((a, b) => a.hand.length - b.hand.length);
        let winner = sortedPlayers[0];
        
        // 延遲一下顯示結算畫面
        setTimeout(() => {
            showWinScreen(winner);
        }, 2000);
        return; 
    }

    table = [];
    document.getElementById("table").innerHTML = "";
    document.getElementById("summon-display").classList.remove("mazu-glow"); 
    
    currentS = deckS.pop();
    renderUI();
    const caller = players[callerIdx];
    updateCallerHighlight(); 

    if (callerIdx === 0) {
        addLog(
            `【你】抽到召喚：${currentS.t.replace(/\n/g, " ")}`, 
            "cmd"
        );
        document.getElementById(
            "summon-display"
        ).innerText = (currentS.isMazu ? "【神明指示】\n" : "【你的召喚】\n") + currentS.t;
        phase = currentS.isMazu ? "PLAYER_MAZU" : "PLAYER_TURN";
        renderUI();
    } else {
        addLog(
            `【${caller.n}】抽到了一張神祕召喚。`, 
            "secret"
        );
        document.getElementById(
            "summon-display"
        ).innerText = `【${caller.n}】抽到了神祕召喚！\n觀察對手出的魚，推敲召喚是什麼...`;
        
        phase = "WAIT";
    }

    setTimeout(
        () => {
            if (currentS.isMazu) {
                document.getElementById(
                    "summon-display"
                ).classList.add("mazu-glow"); 
                
                playMazuSfx(); 
                if (callerIdx !== 0) { 
                    handleMazuAI(caller); 
                }
            } else {
                if (callerIdx !== 0) {
                    let idx = players[callerIdx].hand.findIndex(
                        f => currentS.c(f)
                    );
                    if (idx === -1) {
                        idx = Math.floor(
                            Math.random() * players[callerIdx].hand.length
                        );
                    }
                    aiMove(callerIdx, idx);
                    phase = "PLAYER_TURN";
                    renderUI();
                }
            }
        }, 
        1000
    );
}

function handleMazuAI(caller) {
    document.getElementById(
        "summon-display"
    ).innerText = "【神明庇佑揭曉】\n" + currentS.t;
    
    addLog(
        `揭曉神明召喚：${currentS.t.replace(/\n/g, " ")}`, 
        "cmd"
    );
    
    setTimeout(
        () => {
            if (caller.hand.length === 0) { 
                finishRound(); 
                return; 
            }
            let card = caller.hand.pop();
            let target = players
                .filter(
                    p => p !== caller
                )
                .sort(
                    (a, b) => a.hand.length - b.hand.length
                )[0];
                
            target.hand.push(card);
            playPopSfx();
            addLog(
                `✨ ${caller.n} 分享了一張【${card.n}】給 ${target.n}！`, 
                "success"
            );
            renderUI();
            
            setTimeout(
                finishRound, 
                2000
            );
        }, 
        1000
    );
}

function playerAction(idx) {
    // 手機震動回饋
    if (navigator.vibrate) navigator.vibrate(30);

    if (phase === "PLAYER_MAZU") {
        let card = players[0].hand.splice(idx, 1)[0];
        let target = players
            .filter(
                (p, i) => i !== 0
            )
            .sort(
                (a, b) => a.hand.length - b.hand.length
            )[0];
            
        target.hand.push(card);
        playPopSfx();
        addLog(
            `✨ 你分享了【${card.n}】給 ${target.n}！`, 
            "success"
        );
        
        phase = "RESULT"; 
        renderUI();
        setTimeout(
            finishRound, 
            1500
        ); 
        
    } else if (phase === "PLAYER_TURN") {
        const fish = players[0].hand[idx];
        if (callerIdx === 0 && currentS.c) {
            let hasValid = players[0].hand.some(
                f => currentS.c(f)
            );
            if (hasValid && !currentS.c(fish)) { 
                alert("必須符合你抽到的規律！"); 
                return; 
            }
        }
        players[0].hand.splice(idx, 1);
        playPopSfx();
        table.push(
            { 
                pIdx: 0, 
                card: fish 
            }
        );
        renderTable();
        phase = "AI_FOLLOWING";
        
        setTimeout(
            () => {
                players.forEach(
                    (p, pi) => { 
                        if (p.isAI && pi !== callerIdx) {
                            const refCard = table[0]?.card;
                            let idx = p.hand.findIndex(f => matchByReference(f, refCard));
                            if (idx === -1) {
                                idx = Math.floor(
                                    Math.random() * p.hand.length
                                );
                            }
                            aiMove(pi, idx); 
                        }
                    }
                );
                showResult();
            }, 
            800
        );
    }
}

function aiMove(pI, cI) {
    const f = players[pI].hand.splice(cI, 1)[0];
    playPopSfx();
    table.push(
        { 
            pIdx: pI, 
            card: f 
        }
    );
    renderTable();
}

function showResult() {
    phase = "RESULT";
    if (callerIdx !== 0) {
        addLog(
            `揭曉神祕召喚：${currentS.t.replace(/\n/g, " ")}`, 
            "cmd"
        );
    }
    document.getElementById(
        "summon-display"
    ).innerText = "【召喚揭曉】\n" + currentS.t;
    
    setTimeout(
        () => {
            table.forEach(
                t => {
                    if (currentS.c(t.card)) {
                        playSuccessSfx();
                        addLog(
                            `${players[t.pIdx].n} 成功送出【${t.card.n}】`, 
                            "success"
                        );
                    } else {
                        players[t.pIdx].hand.push(t.card);
                        addLog(
                            `${players[t.pIdx].n} 的【${t.card.n}】不符規律，退回。`
                        );
                    }
                }
            );
            renderUI();
            
            setTimeout(
                finishRound, 
                5000
            );
        }, 
        1000
    );
}

function showWinScreen(winner) {
    const overlay = document.createElement("div");
    
    overlay.id = "win-overlay";
    
    overlay.style = `
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: #a8e6cf url('bgi.png') no-repeat center center; 
        background-size: cover; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center; 
        z-index: 2000; 
        text-align: center; 
        padding: 20px; 
        box-sizing: border-box; 
        font-family: "Microsoft JhengHei", sans-serif;
    `;
    
    const isPlayer = !winner.isAI;
    
    const title = isPlayer 
        ? "✦ 友魚勇者 任務達成 ✦" 
        : "🌊 海域重歸寧靜";
        
    const subTitle = isPlayer 
        ? "感謝您守護海洋資源，實踐永續食魚精神！" 
        : `由【${winner.n}】率先與大海達成和解。`;
    
    // 這裡判斷是否顯示合格認證標籤
    const badgeHtml = isPlayer 
        ? `
            <div style="
                position: absolute; 
                top: -65px; 
                right: -25px; 
                width: 110px; 
                height: 110px; 
                background: #FFB3BA; 
                color: white; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                transform: rotate(15deg); 
                font-weight: bold; 
                border: 4px double white; 
                box-shadow: 0 5px 15px rgba(255,179,186,0.4); 
                font-size: 1.1rem; 
                letter-spacing: 1px; 
                z-index: 10;
            ">
                合格認證
            </div>
        ` 
        : "";

    overlay.innerHTML = `
        <div style="
            border: 12px double #B2E2D2; 
            padding: 45px 30px; 
            border-radius: 40px; 
            background: rgba(255, 255, 255, 0.92); 
            box-shadow: 0 20px 60px rgba(0,0,0,0.15); 
            max-width: 500px; 
            position: relative; 
            backdrop-filter: blur(3px);
        ">
            ${badgeHtml}
            
            <h1 style="
                color: #455A64; 
                font-size: 2rem; 
                margin-bottom: 15px; 
                letter-spacing: 2px;
            ">
                ${title}
            </h1>
            
            <p style="
                font-size: 1.2rem; 
                color: #78909C; 
                line-height: 1.6; 
                margin-bottom: 25px;
            ">
                ${subTitle}
            </p>
            
            <div style="
                background: #FDFCF8; 
                border: 2px dashed #B2E2D2; 
                padding: 20px; 
                border-radius: 20px; 
                margin-bottom: 30px;
            ">
                <p style="
                    color: #00796B; 
                    font-weight: bold; 
                    margin: 0; 
                    font-size: 1.2rem;
                ">
                    懂魚、愛魚、吃對魚
                </p>
            </div>
            
            <button 
                onclick="location.reload()" 
                style="
                    padding: 15px 50px; 
                    font-size: 1.2rem; 
                    background: #FFDFBA; 
                    color: #D35400; 
                    border: 3px solid #FFB347; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    cursor: pointer; 
                    transition: transform 0.2s; 
                    box-shadow: 0 4px 15px rgba(255,179,186,0.3);
                "
            >
                重新開始
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function finishRound() {
    let win = players.find(
        p => p.hand.length === 0
    );
    if (win) { 
        showWinScreen(win); 
        return; 
    }
    callerIdx = (callerIdx + 1) % 4;
    phase = "WAIT";
    autoStep();
}