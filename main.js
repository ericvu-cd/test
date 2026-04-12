let gameDifficulty = 0.7;
let speakingAI = null;
let showSummaryMode = true; // 預設開啟結算頁面

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 當視窗大小改變時，觸發 updateHandArrows 函式重新計算
window.addEventListener('resize', () => {
    updateHandArrows();
});

function setDifficulty(d, btn) {
    gameDifficulty = d;
	document.querySelectorAll('.sub-btnd').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}
// <button class="sub-btnd active" onclick="setDifficulty(0.7, this)">普通</button>

// --- 故事與說明功能 ---
let storyIdx = 1;
let storyTimer = null;
const totalStories = 6;

// --- 故事滑動控制變數 ---
let touchStartX = 0;
let touchEndX = 0;

// 新增：回前一頁的功能
function prevStory() {
    stopStoryTimer();
    if (storyIdx > 1) {
        storyIdx--;
        updateStory();
        startStoryTimer(); // 重新開始自動換頁計時
    }
}

// 判斷滑動方向
function handleSwipe() {
    const swipeThreshold = 50; // 滑動超過 50px 才觸發
    const diff = touchEndX - touchStartX;

    if (diff < -swipeThreshold) {
        // 向左滑 -> 下一頁 (Next)
        nextStory();
    } else if (diff > swipeThreshold) {
        // 向右滑 -> 前一頁 (Prev)
        prevStory();
    }
}

// 故事功能
function openStory() {
    storyIdx = 1;
    updateStory();
    const overlay = document.getElementById("story-overlay");
    overlay.style.display = "block";
    startStoryTimer();

    // 綁定觸控事件
    overlay.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    overlay.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function updateStory() {
    document.getElementById("story-img").src = `P${storyIdx}.jpg`;
    document.getElementById("story-page-num").innerText = `${storyIdx} / ${totalStories}`;
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
    storyTimer = setTimeout(() => {
        if (storyIdx < totalStories) {
            storyIdx++;
            updateStory();
            startStoryTimer();
        } else {
            closeStory();
        }
    }, 10000); 
}

function stopStoryTimer() {
    if (storyTimer) clearTimeout(storyTimer);
}

function closeStory() {
    stopStoryTimer();
    document.getElementById("story-overlay").style.display = "none";
}

// 說明功能
function openInfo() {
    const infoEl = document.getElementById("info-overlay");
    infoEl.style.display = "flex";
    
    fetch('info.txt')
        .then(response => {
            if (!response.ok) throw new Error();
            return response.text();
        })
        .then(data => {
            document.getElementById("info-content").innerText = data;
        })
        .catch(() => {
            document.getElementById("info-content").innerText = "無法載入說明文件，請檢查資料夾內是否有 info.txt。";
        });
}

function closeInfo() {
    document.getElementById("info-overlay").style.display = "none";
}

// 日誌視窗功能
function openLog() {
    document.getElementById("log-modal").style.display = "flex";
}
function closeLog() {
    document.getElementById("log-modal").style.display = "none";
}

let players = [], deckS = [], table = [], currentS = null, callerIdx = 0, phase = "WAIT";

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

// 卡牌預覽功能 (2X放大)
let previewTimeout = null;

/**
 * @param {number|null} idx - 手牌索引，如果是海洋區卡片則傳 null
 * @param {HTMLElement} originalCardEl - 原始卡片 DOM
 * @param {boolean} isHand - 是否為手牌 (決定是否顯示操作按鈕)
 */
function showCardPreview(idx, originalCardEl, isHand = true) {
    const overlay = document.getElementById("card-preview-overlay");
    const container = document.getElementById("card-preview-container");

    container.innerHTML = "";
    if (previewTimeout) clearTimeout(previewTimeout);

    // 複製卡片
    const clone = originalCardEl.cloneNode(true);
    clone.classList.remove("card-played", "is-valid", "is-not-valid"); // 移除動態類名避免縮放問題
    clone.onclick = null; // 移除複製品的點擊事件
    container.appendChild(clone);

    // 如果是手牌，增加「打勾」與「打叉」按鈕
    if (isHand && phase.includes("PLAYER")) {
        const controls = document.createElement("div");
        controls.className = "preview-controls";
 
        // 打叉按鈕 (取消)
        const btnCancel = document.createElement("button");
        btnCancel.className = "preview-btn btn-cancel";
        btnCancel.innerHTML = "❌";
        btnCancel.onclick = (e) => {
            e.stopPropagation();
            closePreview();
        };
		
        // 打勾按鈕 (出牌)
        const btnConfirm = document.createElement("button");
        btnConfirm.className = "preview-btn btn-confirm";
        btnConfirm.innerHTML = "✔️";
        btnConfirm.onclick = (e) => {
            e.stopPropagation();
            closePreview();
            playerAction(idx);
        };


        controls.appendChild(btnConfirm);
        controls.appendChild(btnCancel);
        container.appendChild(controls);
    }

    overlay.style.display = "flex";

    // 3秒自動關閉
    previewTimeout = setTimeout(closePreview, 3000);
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
    
    const isNormalTask = currentS && !currentS.isMazu && phase === "PLAYER_TURN" && callerIdx === 0;
    const hasValid = isNormalTask && players[0].hand.some(f => currentS.c(f));

    players[0].hand.forEach((f, idx) => {
        const c = document.createElement("div");
        c.className = `card light-${f.l}`;
        if (hasValid) {
            if (currentS.c(f)) c.classList.add("is-valid");
            else c.classList.add("is-not-valid");
        }
        c.innerHTML = `<div class="card-n">${f.n}</div><div class="card-i">${getFishTags(f)}</div>`;
        
        // 手牌點擊：放大預覽，並帶有出牌功能
        c.onclick = () => showCardPreview(idx, c, true);
        
        handEl.appendChild(c);
    });
	// 只要階段包含 PLAYER，就幫玩家區加上 my-turn 類別
    document.getElementById("player-zone").classList.toggle("my-turn", phase.includes("PLAYER"));
	
	setTimeout(updateHandArrows, 50);
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
        c.onclick = () => showCardPreview(null, c, false);
        
        zone.appendChild(c);
        if (index === table.length - 1) { 
            void c.offsetWidth; 
            c.classList.add("card-played"); 
        }
    });
}

function playPopSfx() { 
try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. 低頻震盪器 - 模擬撞擊的沉悶感
        const osc = ctx.createOscillator();
        const gainOsc = ctx.createGain();
        
        // 2. 雜訊緩衝區 - 模擬紙張摩擦的「刷」聲
        const bufferSize = ctx.sampleRate * 0.05; // 只需要極短的 0.05 秒
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // 白雜訊
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gainNoise = ctx.createGain();

        // --- 設定低頻撞擊 (Oscillator) ---
        osc.type = 'triangle'; // 使用三角波，比正弦波紮實一點
        osc.frequency.setValueAtTime(150, ctx.currentTime); // 起始頻率較低
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
        
        gainOsc.gain.setValueAtTime(0.6, ctx.currentTime);
        gainOsc.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        // --- 設定摩擦雜訊 (Noise) ---
        gainNoise.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNoise.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        // --- 連接並啟動 ---
        osc.connect(gainOsc);
        gainOsc.connect(ctx.destination);
        
        noise.connect(gainNoise);
        gainNoise.connect(ctx.destination);

        osc.start();
        noise.start();
        
        osc.stop(ctx.currentTime + 0.1);
        noise.stop(ctx.currentTime + 0.1);
        
    } catch(e) {}
	}
function playMazuSfx() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.4); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6); osc.start(); osc.stop(ctx.currentTime + 0.6); } catch(e) {} }
function playSuccessSfx() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle'; osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(523.25, ctx.currentTime); osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); } catch(e) {} }

function addLog(m, type="") {
    const l = document.getElementById("log-messages");
    let className = "log-entry";
    if(type === "cmd") className += " log-cmd";
    if(type === "secret") className += " log-secret";
    if(type === "success") className += " log-success";
    l.innerHTML = `<div class="${className}">> ${m}</div>` + l.innerHTML;
}

function toggleMusic() {
    const music = document.getElementById("bgm");
    const btn = document.getElementById("music-control");
    if (music.paused) { music.play(); btn.innerText = "🎵"; btn.style.opacity = "1"; }
    else { music.pause(); btn.innerText = "🔇"; btn.style.opacity = "0.4"; }
}

function createBubble() {
    const b = document.createElement("div");
    b.className = "bubble";
    b.style.left = Math.random() * 100 + "%";
    b.style.animationDuration = (4 + Math.random() * 4) + "s";
    b.style.width = b.style.height = (5 + Math.random() * 10) + "px";
    document.getElementById("bubbles").appendChild(b);
    setTimeout(() => b.remove(), 8000);
}
setInterval(createBubble, 500);

const fishColors = [ ["#ff9aa2", "#ffb7b2"], ["#a0e7e5", "#b4f8c8"], ["#a0c4ff", "#bdb2ff"], ["#ffd6a5", "#fdffb6"] ];
function createFish() {
    const fish = document.createElement("div");
    const color = fishColors[Math.floor(Math.random() * fishColors.length)];
    fish.className = "fish";
    fish.style.top = Math.random() * 80 + "%";
    const size = 20 + Math.random() * 20;
    fish.style.width = size + "px"; fish.style.height = size / 2 + "px";
    const duration = 6 + Math.random() * 8;
    fish.style.animationDuration = duration + "s";
    fish.style.background = `linear-gradient(90deg, ${color[0]}, ${color[1]})`;
    fish.style.color = color[0];
    document.getElementById("fish-layer").appendChild(fish);
    setTimeout(() => fish.remove(), duration * 1000);
}
setInterval(createFish, 4000);

function initGame() {

    // ✅ 改用加入 class 的方式觸發淡出
    const welcomeScreen = document.getElementById("welcome-screen");
    welcomeScreen.classList.add("fade-out");
	
	const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const bgmVolume = isMobile ? 0.03 : 0.1; // 手機用 0.03，電腦用 0.1

    // 啟動音樂與日誌
    document.getElementById("music-control").style.display = "flex";
	document.getElementById("report-control").style.display = "flex";
    document.getElementById("log-btn").style.display = "flex";
    const music = document.getElementById("bgm");
    music.play().then(() => {
        music.volume = bgmVolume;
    }).catch(err => console.log("播放受阻"));

	document.getElementById('player-hand').addEventListener('scroll', updateHandArrows);

    // 直接切換畫面並開始遊戲
    setTimeout(() => {
        startGame();
    }, 2500); // 保留 0.5 秒的淡出過渡效果
}

function startGame() {
// 1. 從資料庫中隨機挑選 3 個角色
    let aiPool = [...characterDB].sort(() => Math.random() - 0.5).slice(0, 3);
    
    // 2. 初始化玩家與隨機選出的 AI
    players = [
        { n: "你", hand: [], isAI: false }
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
	
    let fishD = [...fishDB].sort(()=>Math.random()-0.5);
    players.forEach(p => p.hand = fishD.splice(0, 6));
    deckS = [...summonDB, ...mazuCards].sort(()=>Math.random()-0.5);
    
    addLog("勇者集結！注意觀察大家的出牌...");
    renderUI();
    autoStep();
}

function updateCallerHighlight() {
    players.forEach((p, idx) => {
        let el = (idx === 0) ? document.getElementById("player-zone") : document.getElementById(p.id);
        if (el) {
            if (idx === callerIdx) el.classList.add("is-caller");
            else el.classList.remove("is-caller");
        }
    });
}

function autoStep() {
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
        setTimeout(() => showWinScreen(winner), 1000);
        return; 
    }
	
    table = [];
    const aiPlayers = players.filter(p => p.isAI);
    speakingAI = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
	document.getElementById("table").innerHTML = "";
    document.getElementById("summon-display").classList.remove("mazu-glow"); 
    
    currentS = deckS.pop();
    renderUI();
    const caller = players[callerIdx];
    updateCallerHighlight(); 

    if (callerIdx === 0) {
        addLog(`【你】抽到召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
        document.getElementById("summon-display").innerText = (currentS.isMazu ? "【神明指示】\n" : "【你的召喚】\n") + currentS.t;
        phase = currentS.isMazu ? "PLAYER_MAZU" : "PLAYER_TURN";
        renderUI();
    } else {
        addLog(`【${caller.n}】抽到了一張神祕召喚。`, "secret");
        document.getElementById("summon-display").innerText = `【${caller.n}】抽到了神祕召喚！\n觀察對手出的魚，推敲召喚是什麼...`;
        phase = "WAIT";
    }

    setTimeout(() => {
        if (currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow"); 
            playMazuSfx(); 
            if (callerIdx !== 0) { handleMazuAI(caller); }
        } else {
            if (callerIdx !== 0) {
 				let idx = aiChooseCard(players[callerIdx], 0.7);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
            }
        }
    }, 1000);
}

function handleMazuAI(caller) {
    document.getElementById("summon-display").innerText = "【神明庇佑揭曉】\n" + currentS.t;
    addLog(`揭曉神明召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");

    setTimeout(() => {
        if (caller.hand.length === 0) { finishRound(); return; }

        let card = caller.hand.pop();
        let target = players.filter(p => p !== caller).sort((a,b) => a.hand.length - b.hand.length)[0];
		
		showMazuGiftEffect(caller.n, target.n, card); // 顯示特寫		

        // 1. 送牌者先說話
        aiTalkMazuGive(caller, target, card);

        // 2. 停頓 2 秒後，執行送牌動作與接收者說話
        setTimeout(() => {
            target.hand.push(card);
            playPopSfx();
            addLog(`✨ ${caller.n} 分享了一張【${card.n}】給 ${target.n}！`, "success");
            
            // 3. 如果接收者是 AI，接著說話
            if (target.isAI) {
                aiTalkMazuReceive(target, caller, card);
            }
            
            renderUI();

            // 4. 全部說完後，再停頓 3 秒才結束回合
            setTimeout(finishRound, 3000);
            
        }, 2000); // 這裡是兩次說話之間的 2 秒停頓

    }, 1000);
}

async function playerAction(idx) {
    if (navigator.vibrate) navigator.vibrate(30);

    if (phase === "PLAYER_MAZU") {
        let card = players[0].hand.splice(idx, 1)[0];
        let target = players.filter((p, i) => i !== 0).sort((a,b) => a.hand.length - b.hand.length)[0];
		showMazuGiftEffect("你", target.n, card);
        target.hand.push(card);
        playPopSfx();
        addLog(`✨ 你分享了【${card.n}】給 ${target.n}！`, "success");
		if (target.isAI) {
            aiTalkMazuReceive(target, players[0], card);
        }
        phase = "RESULT"; 
        renderUI();
        setTimeout(finishRound, 1500); 
    } else if (phase === "PLAYER_TURN") {
        const fish = players[0].hand[idx];
        if (callerIdx === 0 && currentS.c) {
            let hasValid = players[0].hand.some(f => currentS.c(f));
            if (hasValid && !currentS.c(fish)) { alert("必須符合你抽到的規律！"); return; }
        }
        players[0].hand.splice(idx, 1);
        playPopSfx();
        table.push({ pIdx: 0, card: fish });
        renderUI();
		renderTable();
        phase = "AI_FOLLOWING";
		
		await new Promise(resolve => setTimeout(resolve, 800));
        // 【關鍵修改】改用 for...of 才能支援 await
        for (let pi = 0; pi < players.length; pi++) {
            const p = players[pi];
            
            // 排除玩家本人 (pi === 0) 且如果是 AI 且不是目前的召喚者 (如果是 AI 跟牌)
            if (p.isAI && pi !== callerIdx) {
                let matchIdx = aiChooseCard(p, 0.7);
                
                // 每位 AI 出牌前先等 0.6 秒
                await new Promise(resolve => setTimeout(resolve, 600));
                
                aiMove(pi, matchIdx); 
            }
        }

        // 所有 AI 出完後再等 0.2 秒進結果
        await new Promise(resolve => setTimeout(resolve, 200));
        showResult();
		
    }
}

function aiMove(pI, cI) {
    const p = players[pI];
	if (!p.hand[cI]) return; // 安全機制：確保這位置有牌
	
    const f = p.hand.splice(cI, 1)[0];

    playPopSfx();
    table.push({ pIdx: pI, card: f });
    renderTable();
	renderUI();    // 更新 AI 手上的卡片數量 (確保閃爍的 🎴 會消失一張)

    let isCorrect = currentS && currentS.c ? currentS.c(f) : null;

    aiTalk(p, f, isCorrect);
}

// 建立一個全域或區域變數來儲存當前回合的結算資料
let roundReport = [];

function showResult() {
    phase = "RESULT";
    roundReport = []; 

    document.getElementById("summon-display").innerText = "【召喚揭曉】\n" + currentS.t;

    setTimeout(() => {
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
                : (t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "燈" : "紅燈"));

            roundReport.push({
                name: player.n,
                fishName: t.card.n,
                isSuccess: isSuccess,
                feature: finalFeatureStr
            });

            if (isSuccess) {
                playSuccessSfx();
                addLog(`${player.n} 成功送出【${t.card.n}】`, "success");
            } else {
                player.hand.push(t.card);
                addLog(`${player.n} 的【${t.card.n}】不符規律，退回。`);
            }
        });

        renderUI();
        
        let win = players.find(p => p.hand.length === 0);
		if (win) {
            setTimeout(() => showWinScreen(win), 1000);
            return;
        }

        // --- 關鍵修改：控制下一步去向 ---
        if (showSummaryMode) {
            // 模式 A：顯示詳細報告彈窗
            setTimeout(showRoundSummary, 1000); 
        } else {
            // 模式 B：快速模式
            // 停頓 1.5 秒讓玩家看清場上的 ✔️/❌，然後自動清理進入下一輪
            setTimeout(finishRound, 1500); 
        }
	}, 1000);
}

function showWinScreen(winner) {
    const overlay = document.createElement("div");
    overlay.id = "win-overlay";
    overlay.style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #a8e6cf url('bgi.png') no-repeat center center; background-size: cover; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 5000; text-align: center; padding: 20px; box-sizing: border-box; font-family: "Microsoft JhengHei", sans-serif;`;
    const isPlayer = !winner.isAI;
    const title = isPlayer ? "✦ 友魚勇者 任務達成 ✦" : "🌊 海域重歸寧靜";
    const subTitle = isPlayer ? "感謝您守護海洋資源，實踐永續食魚精神！" : `由【${winner.n}】率先與大海達成和解。`;
    const badgeHtml = isPlayer ? `<div style="position: absolute; top: -65px; right: -25px; width: 110px; height: 110px; background: #FFB3BA; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(15deg); font-weight: bold; border: 4px double white; box-shadow: 0 5px 15px rgba(255,179,186,0.4); font-size: 1.1rem; letter-spacing: 1px; z-index: 10;">合格認證</div>` : "";

    overlay.innerHTML = `<div style="border: 12px double #B2E2D2; padding: 45px 30px; border-radius: 40px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 20px 60px rgba(0,0,0,0.15); max-width: 500px; position: relative; backdrop-filter: blur(3px);">
        ${badgeHtml}
        <h1 style="color: #455A64; 
font-size: 2rem; margin-bottom: 15px; letter-spacing: 2px;">${title}</h1>
        <p style="font-size: 1.2rem; color: #78909C; line-height: 1.6; margin-bottom: 25px;">${subTitle}</p>
        <div style="background: #FDFCF8; border: 2px dashed #B2E2D2; padding: 20px; border-radius: 20px; margin-bottom: 30px;"><p style="color: #00796B; font-weight: bold; margin: 0; font-size: 1.2rem;">懂魚、愛魚、吃對魚</p></div>
        <button onclick="location.reload()" style="padding: 15px 50px; font-size: 1.2rem; background: #FFDFBA; color: #D35400; border: 3px solid #FFB347; border-radius: 50px; font-weight: bold; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(255,179,186,0.3);">重新開始</button>
    </div>`;
    document.body.appendChild(overlay);
}

function finishRound() {
    let win = players.find(p => p.hand.length === 0);
    if (win) { 
        showWinScreen(win); 
        return; 
    }

    // 檢查是否「不」是媽祖卡
    if (currentS && !currentS.isMazu) {
        showRoundSummary(); // 呼叫彈出視窗
    } else {
        // 如果是媽祖卡，直接進入下一回合
        proceedToNextRound();
    }
}

// 新增：處理下一回合的邏輯轉換
function proceedToNextRound() {
    callerIdx = (callerIdx + 1) % 4;
    phase = "WAIT";
    autoStep();
}

// 新增：彈出視窗函式
function showRoundSummary() {
		
	if (!showSummaryMode) {
        proceedToNextRound(); // 或 finishRound()，視您的架構而定
        return;
    }
	
    const overlay = document.createElement("div");
    overlay.id = "round-summary-overlay";
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.7); display: flex; justify-content: center; 
        align-items: center; z-index: 4000; backdrop-filter: blur(4px);
    `;

    const reportHtml = roundReport.map(r => `
        <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; text-align: left;">
            <div style="font-size: 1.2rem; margin-right: 15px; width: 25px;">
                ${r.isSuccess ? '<span style="color: #2ecc71;">✔️</span>' : '<span style="color: #e74c3c;">❌</span>'}
            </div>
            <div style="flex-grow: 1;">
                <span style="font-weight: bold; color: #333;">${r.name}</span>：
                <span>${r.fishName}</span>
                <span style="
                    margin-left: 8px; 
                    padding: 2px 8px; 
                    background: ${r.isSuccess ? '#d7ded9' : '#d7ded9'}; 
                    color: ${r.isSuccess ? '#247173' : '#c62828'}; 
                    border-radius: 4px; 
                    font-size: 0.85rem;
                    border: 1px solid ${r.isSuccess ? '#247173' : '#247173'};
                ">
                    ${r.feature}
                </span>
            </div>
        </div>
    `).join('');

    const modal = document.createElement("div");
    modal.style = `
        background: white; padding: 25px; border-radius: 20px; 
        width: 90%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
	modal.classList.add("summary-pop-anim"); 
    
    // 設定彈窗樣式 (原有的樣式)
    modal.style.background = "white";
    modal.style.padding = "25px";
    modal.style.borderRadius = "20px";
    modal.style.width = "90%";
    modal.style.maxWidth = "450px";
    modal.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
	

    modal.innerHTML = `
        <h2 style="color: #00796b; margin-top: 0; font-size: 1.1rem;">回合成果結算</h2>
        
        <div style="background: #f1f8e9; padding: 10px; border-radius: 10px; margin-bottom: 15px; text-align: left;">
            <div style="font-weight: bold; color: #388e3c; font-size: 0.9rem;">📜 本回召喚要求：</div>
            <div style="font-size: 1rem; color: #333; margin-top: 4px;">${currentS.t}</div>
        </div>

        <div style="margin-bottom: 20px;">
            ${reportHtml}
        </div>

        <button id="close-summary-btn" style="
            width: 100%; padding: 10px; background: #FFDFBA; border: none; 
            border-radius: 50px; font-weight: bold; color: #d35400; cursor: pointer;
        ">整理魚獲，繼續冒險</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById("close-summary-btn").onclick = () => {
        overlay.remove();
        proceedToNextRound();
    };
}

function aiChooseCard(p) {
    let difficulty = gameDifficulty;

    if (p.personality === "smart") difficulty += 0.1;
    if (p.personality === "chaotic") difficulty -= 0.2;

    difficulty = Math.max(0.1, Math.min(0.95, difficulty));

    if (table.length === 0) {
        return Math.floor(Math.random() * p.hand.length);
    }

    const played = table.map(t => t.card);

    let candidates = p.hand.map((f, idx) => ({ f, idx, score: 0 }));

    candidates.forEach(c => {
        if (played.every(f => f.l === played[0].l) && c.f.l === played[0].l) c.score++;
        if (played.every(f => f.h === played[0].h) && c.f.h === played[0].h) c.score++;
        if (played.every(f => f.d === played[0].d) && c.f.d === played[0].d) c.score++;
    });

    candidates.sort((a, b) => b.score - a.score);

    if (p.personality === "tricky" && Math.random() < 0.4) {
        return Math.floor(Math.random() * p.hand.length);
    }

    if (Math.random() < difficulty && candidates[0].score > 0) {
        return candidates[0].idx;
    }

    return Math.floor(Math.random() * p.hand.length);
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

function aiTalk(p, card, isCorrectGuess = null) {
    if (p !== speakingAI) return;

    const persona = p.personality;
    let lines = [...dialogueDB[persona].play];

    // 針對狡猾性格的特殊邏輯：如果亂出牌且有設定特殊台詞
    if (isCorrectGuess === false && dialogueDB[persona].playWrong) {
        lines.push(...dialogueDB[persona].playWrong);
    }

    const msg = lines[Math.floor(Math.random() * lines.length)];
    showChat(p, msg);
}

function aiTalkMazuGive(p, target, card) {
    const lines = dialogueDB[p.personality].mazuGive;
    const msg = lines[Math.floor(Math.random() * lines.length)];
    showChat(p, msg);
	setTimeout(2000);
}

function aiTalkMazuReceive(p, from, card) {
    const lines = dialogueDB[p.personality].mazuReceive;
    const msg = lines[Math.floor(Math.random() * lines.length)];
    showChat(p, msg);
}

document.getElementById("welcome-screen").style.opacity = 0;

setTimeout(()=>{
    document.getElementById("welcome-screen").style.opacity = 1;
}, 100);

window.addEventListener('load', () => {
    const welcome = document.getElementById("welcome-screen");
    welcome.style.opacity = "0"; // 先設為 0
    
    // 強制瀏覽器重繪後再改回 1，達成淡入效果
    setTimeout(() => {
        welcome.style.transition = "opacity 1.2s ease";
        welcome.style.opacity = "1";
    }, 100);
});

function showMazuGiftEffect(fromName, toName, card) {
    const effect = document.createElement("div");
    effect.style = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
        background: white; border: 4px solid #FFD700; padding: 20px; border-radius: 15px; 
        z-index: 5000; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.3);
        min-width: 200px;
    `;
    
    // 獲取魚的特性標籤 (調用原本 main.js 裡的函式)
    const tags = getFishTags(card);

    effect.innerHTML = `
        <div style="color:#D4AF37; font-weight:bold; font-size:1.2rem; margin-bottom:10px;">✨ 神明指示：分享資源 ✨</div>
        <div style="margin-bottom:15px; font-size:1.3rem;"><strong>${fromName}</strong> 分享給 <strong>${toName}</strong></div>
        <div class="card light-${card.l}" style="margin: 0 auto; pointer-events: none; transform: scale(1.1); float: none;">
            <div class="card-n" style="font-size: 1.2rem;">${card.n}</div>
            <div class="card-i" style="font-size: 0.9rem; margin-top: 5px; color: #555;">${tags}</div>
        </div>
    `;
    
    document.body.appendChild(effect);
    
    // 保持顯示 3 秒，讓玩家看清楚特性
    setTimeout(() => {
        effect.style.opacity = "0";
        effect.style.transition = "opacity 0.5s";
        setTimeout(() => effect.remove(), 1500);
    }, 3000);
}

function toggleReportMode() {
    showSummaryMode = !showSummaryMode;
    const btn = document.getElementById("report-control");
    if (showSummaryMode) {
        btn.classList.remove("off");
    } else {
        btn.classList.add("off");
    }
}

function updateHandArrows() {
    const hand = document.getElementById('player-hand');
    const leftArrow = document.getElementById('arrow-left');
    const rightArrow = document.getElementById('arrow-right');

    if (!hand || !leftArrow || !rightArrow) return;

    // 1. 判斷是否「溢出」：內容寬度 > 容器寬度
    const isOverflowing = hand.scrollWidth > hand.clientWidth;

    if (isOverflowing) {
        // 2. 如果溢出，根據滾動位置判斷顯示哪邊
        // 往右滑了超過 5px 才顯示左箭頭
        leftArrow.style.display = hand.scrollLeft > 5 ? 'flex' : 'none';
        
        // 還有超過 5px 的空間可以往右滑，才顯示右箭頭
        const maxScroll = hand.scrollWidth - hand.clientWidth;
        rightArrow.style.display = (hand.scrollLeft < maxScroll - 5) ? 'flex' : 'none';
    } else {
        // 3. 沒溢出就全部隱藏
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'none';
    }
}