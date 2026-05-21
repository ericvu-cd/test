// =============================================
// 🎮 game.js — 遊戲核心邏輯
// =============================================

// ── 遊戲初始化 ──────────────────────────────────
function initGame() {
    initOceanCaustics();
    startFish();
    startBubbles();
    document.body.classList.add('game-started');

    const welcomeScreen = document.getElementById("welcome-screen");
    welcomeScreen.classList.add("fade-out");

    document.getElementById("music-control").style.display = "flex";
    document.getElementById("report-control").style.display = "flex";
    document.getElementById("log-btn").style.display = "flex";

    const music = document.getElementById("bgm");
    const btn   = document.getElementById("music-control");
    if (sfxEnabled) {
        music.play().then(() => {
            music.volume = 0.03;
            btn.style.filter  = "sepia(1) saturate(3) hue-rotate(175deg) brightness(1.4)";
            btn.innerText = "🎵";
            btn.style.opacity = "1";
        }).catch(() => {
            btn.innerText = "🔇";
            btn.style.opacity = "0.4";
        });
    } else {
        music.pause();
        btn.innerText = "🔇";
        btn.style.filter  = "";
        btn.style.opacity = "0.4";
    }

    document.getElementById('player-hand').addEventListener('scroll', updateHandArrows);
    initDrawerGesture();
    setTimeout(startGame, 3500);
}

// ── 開局 ──────────────────────────────────────
function startGame() {
    let aiPool = shuffle([...characterDB]).slice(0, 3);

    players = [
        { n: (window.playerName && window.playerName.trim()) ? window.playerName.trim() : "你", hand: [], isAI: false }
    ];
    aiPool.forEach((char, index) => {
        players.push({
            n: char.n, hand: [], isAI: true,
            id: `ai-${index + 1}`,
            personality: char.personality,
            avatar: `<img src="${char.img}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
        });
    });

    let fishD = shuffle([...fishDB]);

    // 新手難度：玩家優先抽 e:1 牌
    if (gameDifficulty <= 0.4) {
        const easyPool  = fishD.filter(f => f.e === 1);
        const otherPool = fishD.filter(f => f.e !== 1);
        const playerHand = [];
        while (playerHand.length < 6) {
            if (easyPool.length > 0) playerHand.push(easyPool.splice(0, 1)[0]);
            else playerHand.push(otherPool.splice(0, 1)[0]);
        }
        players[0].hand = playerHand;
        const remaining = shuffle([...easyPool, ...otherPool]);
        players.slice(1).forEach(p => p.hand = remaining.splice(0, 6));
    } else {
        players.forEach(p => p.hand = fishD.splice(0, 6));
    }

    deckS = shuffle([...summonDB, ...mazuCards]);

    // 新手保護：玩家前兩次召喚確保有牌可出
    if (gameDifficulty <= 0.4) {
        const playerHand = players[0].hand;
        const isSafe = s => !s.isMazu && playerHand.some(f => { try { return s.c(f); } catch(e) { return false; } });
        const len = deckS.length;
        const slots = [len - 1, len - 5];
        const usedSwapSlots = new Set(slots);
        slots.forEach(slot => {
            if (slot < 0 || slot >= len || isSafe(deckS[slot])) return;
            let swapFrom = -1;
            for (let i = 0; i < len; i++) {
                if (!usedSwapSlots.has(i) && isSafe(deckS[i])) { swapFrom = i; break; }
            }
            if (swapFrom === -1) return;
            [deckS[slot], deckS[swapFrom]] = [deckS[swapFrom], deckS[slot]];
            usedSwapSlots.add(swapFrom);
        });
    }

    initialHands = players.map(p => ({
        name: p.n,
        hand: p.hand.map(f => ({ n: f.n, l: f.l, d: f.d, m: [...f.m], h: f.h, s: f.s }))
    }));
    logPlainText = [];

    // 確保 summon-display 可見（教學結束後會被設為 none）
    const summonEl = document.getElementById("summon-display");
    if (summonEl) summonEl.style.display = "flex";

    const diffLabel = gameDifficulty <= 0.4 ? "新手(難度0.4)" : gameDifficulty >= 0.9 ? "專業(難度0.9)" : "標準(難度0.7)";
    addLog(`勇者集結！難度：${diffLabel}。注意觀察大家的出牌...`);

    renderUI();
    setTimeout(autoStep, 2000);
}

// ── 輪次高亮 ──────────────────────────────────
function updateCallerHighlight() {
    players.forEach((p, idx) => {
        let el = (idx === 0) ? document.getElementById("player-zone") : document.getElementById(p.id);
        if (el) el.classList.toggle("is-caller", idx === callerIdx);
    });
    const caustics = document.getElementById("ocean-caustics");
    if (caustics) {
        const isPlayerActive = phase === "PLAYER_TURN" || phase === "PLAYER_MAZU";
        caustics.classList.toggle("beams-active", isPlayerActive);
    }
}

// ── 召喚聚焦遮罩 ──────────────────────────────
let summonFocusTimer = null;

function showSummonFocus(duration, callback) {
    const overlay = document.getElementById("summon-focus-overlay");
    const box     = document.getElementById("summon-focus-box");
    if (summonFocusTimer) { clearTimeout(summonFocusTimer); summonFocusTimer = null; }

    box.innerText = document.getElementById("summon-display").innerText;
    box.classList.toggle("mazu-style", !!(currentS && currentS.isMazu));

    box.style.animation = "none";
    void box.offsetWidth;
    box.style.animation = "summonPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";

    overlay.style.transition    = "opacity 0.4s ease";
    overlay.style.opacity       = "1";
    overlay.style.pointerEvents = "all";

    summonFocusTimer = setTimeout(() => {
        overlay.style.transition    = "opacity 0.8s ease";
        overlay.style.opacity       = "0";
        overlay.style.pointerEvents = "none";
        summonFocusTimer = setTimeout(() => {
            summonFocusTimer = null;
            if (callback) callback();
        }, 800);
    }, duration);
}

// ── 主回合驅動 ──────────────────────────────────
function autoStep() {
    lockUI();
    if (deckS.length === 0) {
        addLog("召喚卡已用盡！開始結算剩餘手牌...", "cmd");
        let winner = players[0];
        for (let i = 1; i < players.length; i++) {
            if (players[i].hand.length < winner.hand.length) winner = players[i];
        }
        const isPlayerWin = winner === players[0];
        showCountdownBubble(4, () => {
            isPlayerWin ? SFX.win() : SFX.lose();
            showWinScreen(winner);
        });
        return;
    }

    table = [];
    roundCount++;
    const aiPlayers = players.filter(p => p.isAI);
    speakingAI = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
    document.getElementById("table").innerHTML = "";
    document.getElementById("summon-display").classList.remove("mazu-glow");
    const causticsReset = document.getElementById("ocean-caustics");
    if (causticsReset) causticsReset.classList.remove("mazu-beams");

    currentS = deckS.pop();
    renderUI();
    const caller = players[callerIdx];
    updateCallerHighlight();

    if (callerIdx === 0) {
        SFX.draw();
        addLog(`【${players[0].n}】抽到召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
        document.getElementById("summon-display").innerText =
            (currentS.isMazu ? "【神明指示】\n" : "【你的召喚】\n") + currentS.t;
        phase = currentS.isMazu ? "PLAYER_MAZU" : "PLAYER_TURN";
        renderUI();
    } else {
        addLog(`【${caller.n}】抽到了一張神祕召喚。`, "secret");
        document.getElementById("summon-display").innerText =
            `【${caller.n}】抽到了神祕召喚！\n觀察對手出的魚，推敲召喚是什麼...`;
        phase = "WAIT";
    }

    // 教學模式：不顯示遮罩
    if (typeof tutorialMode !== "undefined" && tutorialMode) {
        if (currentS && currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow");
            if (callerIdx !== 0) handleMazuAI(caller);
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

    showSummonFocus(1500, () => {
        if (currentS.isMazu) {
            document.getElementById("summon-display").classList.add("mazu-glow");
            const caustics = document.getElementById("ocean-caustics");
            if (caustics) caustics.classList.add("mazu-beams");
            SFX.mazu();
            if (callerIdx === 0) unlockUI();
            else handleMazuAI(caller);
        } else {
            if (callerIdx !== 0) {
                let idx = aiChooseCard(players[callerIdx]);
                aiMove(callerIdx, idx);
                phase = "PLAYER_TURN";
                renderUI();
                unlockUI();
            } else {
                unlockUI();
            }
        }
    });
}

// ── 媽祖 AI 贈牌 ──────────────────────────────
function handleMazuAI(caller) {
    document.getElementById("summon-display").innerText = "【神明庇佑揭曉】\n" + currentS.t;
    addLog(`揭曉神明召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");

    setTimeout(() => {
        if (caller.hand.length === 0) { finishRound(); return; }
        let card = caller.hand.pop();

        const isNovice = gameDifficulty <= 0.4;
        const others   = players.filter(p => p !== caller && (isNovice ? p.isAI : true));
        const pool     = others.length > 0 ? others : players.filter(p => p !== caller);

        let target;
        if (Math.random() < 0.70) {
            const minCount = Math.min(...pool.map(p => p.hand.length));
            const fewest   = pool.filter(p => p.hand.length === minCount);
            target = fewest[Math.floor(Math.random() * fewest.length)];
        } else {
            target = pool[Math.floor(Math.random() * pool.length)];
        }

        const callerEl = document.getElementById(caller.id);
        const targetEl = target.isAI
            ? document.getElementById(target.id)
            : document.getElementById("player-zone");
        showMazuGiftEffect(caller.n, target.n, card, targetEl, callerEl);
        aiTalkMazuGive(caller, target, card);

        setTimeout(() => {
            target.hand.push(card);
            SFX.gift();
            addLog(`✨ ${caller.n} 分享了一張【${card.n}】給 ${target.n}！`, "success");
            if (target.isAI) aiTalkMazuReceive(target, caller, card);
            renderUI();
            setTimeout(finishRound, 5500);
        }, 2000);
    }, 3000);
}

// ── 玩家媽祖選目標 ──────────────────────────────
function showMazuTargetSelect(cardIdx) {
    const existing = document.getElementById("mazu-target-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "mazu-target-overlay";
    const card    = players[0].hand[cardIdx];
    const targets = players.slice(1);

    overlay.innerHTML = `
        <div class="mazu-overlay-title">🙏 神明指示：分享資源</div>
        <div class="mazu-overlay-sub">送出【${card.n}】給誰？</div>
    `;

    targets.forEach(p => {
        const btn = document.createElement("button");
        btn.className = "mazu-target-btn";
        btn.innerHTML = `<span>${p.n}</span><span class="btn-cards">🎴×${p.hand.length}</span>`;
        btn.onclick   = () => { overlay.remove(); confirmMazuGift(cardIdx, p); };
        overlay.appendChild(btn);
    });

    document.body.appendChild(overlay);
}

function confirmMazuGift(cardIdx, target) {
    const card    = players[0].hand.splice(cardIdx, 1)[0];
    const targetEl = document.getElementById(target.id);
    const playerEl = document.getElementById("player-zone");
    showMazuGiftEffect("你", target.n, card, targetEl, playerEl);
    target.hand.push(card);
    SFX.gift();
    addLog(`✨ ${players[0].n}分享了【${card.n}】給 ${target.n}！`, "success");
    if (target.isAI) aiTalkMazuReceive(target, players[0], card);
    phase = "RESULT";
    renderUI();
    lockUI();
    setTimeout(finishRound, 5500);
}

// ── 玩家出牌 ──────────────────────────────────
async function playerAction(idx) {
    if (navigator.vibrate) navigator.vibrate(30);

    if (phase === "PLAYER_MAZU") {
        showMazuTargetSelect(idx);
        return;
    } else if (phase === "PLAYER_TURN") {
        const fish = players[0].hand[idx];
        players[0].hand.splice(idx, 1);
        SFX.card();
        table.push({ pIdx: 0, card: fish });
        phase = "AI_FOLLOWING";
        lockUI();
        renderUI();

        const fromEl = document.getElementById("player-zone");
        playCardFlyAnimation(fish, fromEl, () => renderTable());

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
        unlockUI();
        showResult();
    }
}

// ── AI 出牌 ──────────────────────────────────
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
    aiTalk(p, f, isCorrect);
}

// ── AI 選牌邏輯 ──────────────────────────────
function aiChooseCard(p) {
    let difficulty = gameDifficulty;
    if (p.personality === "smart")   difficulty += 0.15;
    if (p.personality === "chaotic") difficulty -= 0.25;
    if (p.personality === "tricky")  difficulty -= 0.1;
    difficulty = Math.max(0.05, Math.min(0.97, difficulty));

    // 情境 A：AI 是召喚者
    if (table.length === 0) {
        const validCards   = p.hand.map((f, idx) => ({ f, idx })).filter(c => currentS && currentS.c && currentS.c(c.f));
        const invalidCards = p.hand.map((f, idx) => ({ f, idx })).filter(c => !(currentS && currentS.c && currentS.c(c.f)));
        if (validCards.length === 0) {
            addLog(`${p.n} 手上沒有符合召喚的牌，隨機出牌。`, "secret");
            return Math.floor(Math.random() * p.hand.length);
        }
        const correctChance = Math.min(0.95, Math.max(0.50, 1.030 - 0.537 * difficulty));
        const playCorrect   = Math.random() < correctChance;
        const pool = playCorrect ? validCards : (invalidCards.length > 0 ? invalidCards : validCards);
        return pool[Math.floor(Math.random() * pool.length)].idx;
    }

    // 情境 B：AI 是跟牌者
    const played = table.map(t => t.card);
    const allSameL = played.every(f => f.l === played[0].l);
    const allSameH = played.every(f => f.h === played[0].h);
    const allSameD = played.every(f => f.d === played[0].d);
    const seasons  = ["春", "夏", "秋", "冬"];
    const commonSeasons = seasons.filter(s => played.every(f => f.s.includes("全年") || f.s.includes(s)));
    const commonMethods = played[0].m.filter(method => played.every(f => f.m.includes(method)));

    let candidates = p.hand.map((f, idx) => {
        let score = 0;
        if (allSameL && f.l === played[0].l) score++;
        if (allSameH && f.h === played[0].h) score++;
        if (allSameD && f.d === played[0].d) score++;
        if (commonSeasons.length > 0 && (f.s.includes("全年") || commonSeasons.some(s => f.s.includes(s)))) score++;
        if (commonMethods.length > 0 && commonMethods.some(m => f.m.includes(m))) score++;
        return { f, idx, score };
    });
    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;

    if (topScore === 0) return candidates[Math.floor(Math.random() * candidates.length)].idx;

    const bestPool    = candidates.filter(c => c.score === topScore && topScore > 0);
    const partialPool = candidates.filter(c => c.score > 0 && c.score < topScore);
    const wrongPool   = candidates.filter(c => c.score === 0);

    const pBest    = Math.min(0.97, Math.max(0.60, 0.45 + difficulty * 0.535));
    const pPartial = (1 - pBest) * 0.80;
    const roll = Math.random();

    if (roll < pBest) {
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    } else if (roll < pBest + pPartial) {
        if (partialPool.length > 0) return partialPool[Math.floor(Math.random() * partialPool.length)].idx;
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    } else {
        if (wrongPool.length > 0)   return wrongPool[Math.floor(Math.random() * wrongPool.length)].idx;
        if (partialPool.length > 0) return partialPool[Math.floor(Math.random() * partialPool.length)].idx;
        return bestPool[Math.floor(Math.random() * bestPool.length)].idx;
    }
}

// ── 結果計算 ──────────────────────────────────
function showResult() {
    phase = "RESULT";
    roundReport = [];
    pendingReturns = [];

    const hint = document.createElement("div");
    hint.className = "countdown-bubble";
    hint.style.cssText = `position:fixed; left:50%; transform:translateX(-50%); bottom:130px; z-index:3000; pointer-events:none;`;
    hint.innerText = "🔍 計算結果中…";
    document.body.appendChild(hint);

    setTimeout(() => {
        hint.remove();
        if (callerIdx !== 0 && currentS && !currentS.isMazu) {
            const callerName = players[callerIdx].n;
            addLog(`揭曉《${callerName}》的神秘召喚：${currentS.t.replace(/\n/g, " ")}`, "cmd");
            document.getElementById("summon-display").innerText = `【${callerName}的召喚】\n${currentS.t}`;
        }

        table.forEach(t => {
            const isSuccess = currentS.c(t.card);
            const player    = players[t.pIdx];
            const condText  = currentS.t;
            let featuresFound = [];

            if (["燈", "綠", "黃", "紅"].some(k => condText.includes(k)))
                featuresFound.push(t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "黃燈" : "紅燈"));
            if (["網", "釣", "一支", "延繩", "圍網", "刺網", "籠具", "禁止捕撈", "標槍"].some(k => condText.includes(k)))
                featuresFound.push(t.card.m.join("、"));
            if (["養殖", "近海", "遠洋"].some(k => condText.includes(k)))
                featuresFound.push(t.card.d);
            if (["春", "夏", "秋", "冬", "全年"].some(k => condText.includes(k)))
                featuresFound.push(t.card.s);
            if (["洄游", "定棲", "底棲"].some(k => condText.includes(k)))
                featuresFound.push(t.card.h);

            const finalFeatureStr = featuresFound.length > 0
                ? featuresFound.join(" | ")
                : (t.card.l === 1 ? "綠燈" : (t.card.l === 2 ? "黃燈" : "紅燈"));

            roundReport.push({ name: player.n, fishName: t.card.n, isSuccess, feature: finalFeatureStr });

            if (isSuccess) {
                addLog(`${player.n} 成功送出【${t.card.n}】`, "success");
            } else {
                pendingReturns.push({ card: t.card, player });
                addLog(`${player.n} 的【${t.card.n}】不符規律，退回。`);
            }
        });

        renderUI();

        const realWin = players.find(p =>
            p.hand.length === 0 && !pendingReturns.some(r => r.player === p)
        );
        if (realWin) {
            const isPlayerWin = realWin === players[0];
            showCountdownBubble(4, () => {
                isPlayerWin ? SFX.win() : SFX.lose();
                showWinScreen(realWin);
            });
            return;
        }

        showCountdownBubble(4, () => {
            if (showSummaryMode) showRoundSummary();
            else playPendingReturns(() => finishRound());
        });
    }, 1000);
}

// ── 回合結算彈窗 ──────────────────────────────
function showRoundSummary() {
    if (!showSummaryMode) { proceedToNextRound(); return; }
    if (roundReport.some(r => r.isSuccess)) SFX.success();

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

    const total    = roundReport.length;
    const sharedCard = `background:linear-gradient(135deg,rgba(0,70,110,0.7),rgba(0,40,80,0.7));border:1.5px solid rgba(60,170,255,0.28);border-radius:13px;`;
    const ecoDelay = 0.10 + total * 0.08 + 0.06;

    const cardsHtml = roundReport.map((r, i) => {
        const delay  = 0.10 + i * 0.08;
        const isLast = i === total - 1;
        const isOdd  = total % 2 === 1;
        const span   = (isLast && isOdd) ? 'grid-column:1/-1;' : '';
        const bg     = r.isSuccess
            ? 'background:linear-gradient(135deg,#0a2e1a,#0d3d22);border:1.5px solid #3a9e5f;'
            : 'background:linear-gradient(135deg,#2a0f0f,#361212);border:1.5px solid #8b3030;';
        const nameC  = r.isSuccess ? '#90f0b8' : '#f4a0a0';
        const badge  = r.isSuccess
            ? `<span style="font-size:14px;animation:rsPulse 1.4s infinite;display:inline-block;">⭐</span>`
            : `<span style="font-size:10px;color:#f07070;background:rgba(200,50,50,0.2);border:1px solid rgba(200,50,50,0.4);padding:1px 7px;border-radius:8px;">退牌</span>`;

        if (isLast && isOdd) {
            return `
            <div style="${bg}${span}border-radius:13px;padding:8px 10px;min-width:0;overflow:hidden;animation:rsSlideUp .26s ${delay}s ease both;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="flex:0 0 auto;">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
                            <span style="font-size:11px;color:rgba(255,255,255,0.42);">${r.name}</span>${badge}
                        </div>
                        <div style="font-size:16px;font-weight:bold;color:${nameC};">${r.fishName}</div>
                    </div>
                    <div style="flex:1;min-width:0;">${buildAttrBars(r.feature, r.isSuccess)}</div>
                </div>
            </div>`;
        }
        return `
        <div style="${bg}border-radius:13px;padding:8px 9px;min-width:0;overflow:hidden;animation:rsSlideUp .26s ${delay}s ease both;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:18px;color:rgba(255,255,255,0.42);">${r.name}</span>${badge}
            </div>
            <div style="font-size:20px;font-weight:bold;color:${nameC};margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.fishName}</div>
            ${buildAttrBars(r.feature, r.isSuccess)}
        </div>`;
    }).join('');

    const ecoHtml = currentS.why ? `
        <div style="${sharedCard}padding:7px 11px;margin-bottom:10px;animation:rsSlideUp .26s ${ecoDelay}s ease both;">
            <div style="font-size:12px;color:#60c8f0;font-weight:bold;margin-bottom:3px;">🌊 生態小知識</div>
            <div style="font-size:16px;color:rgba(190,235,255,0.88);line-height:1.6;">${currentS.why}</div>
        </div>` : '';

    const overlay = document.createElement("div");
    overlay.id = "round-summary-overlay";
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(4,12,22,0.92);display:flex;justify-content:center;
        align-items:center;box-sizing:border-box;z-index:4000;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
        background:linear-gradient(170deg,#0d2137 0%,#081626 100%);
        border-radius:20px;border:1px solid rgba(255,255,255,0.07);
        width:92%;max-width:400px;max-height:82vh;overflow-y:auto;
        padding:12px 11px 14px;box-sizing:border-box;
        animation:rsSlideDown .36s ease-out both;
    `;
    modal.innerHTML = `
        <style>
            @keyframes rsSlideDown { from{transform:translateY(-30px);opacity:0} to{transform:translateY(0);opacity:1} }
            @keyframes rsSlideUp   { from{transform:translateY(13px);opacity:0}  to{transform:translateY(0);opacity:1} }
            @keyframes rsPulse     { 0%,100%{opacity:1} 50%{opacity:.4} }
            #round-summary-overlay ::-webkit-scrollbar { width:3px; }
            #round-summary-overlay ::-webkit-scrollbar-track { background:transparent; }
            #round-summary-overlay ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15);border-radius:2px; }
        </style>
        <div style="${sharedCard}padding:7px 11px;margin-bottom:8px;animation:rsSlideUp .26s .04s ease both;">
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

// ── 回合結束 ──────────────────────────────────
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

function proceedToNextRound() {
    players.forEach(p => { if (p.isAI) shuffle(p.hand); });
    callerIdx = (callerIdx + 1) % players.length;
    phase = "WAIT";
    autoStep();
}

// ── 退牌動畫批次播放 ──────────────────────────
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
