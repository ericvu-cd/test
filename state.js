// =============================================
// 📦 state.js — 全域遊戲狀態與共用工具
// =============================================

// ── 遊戲設定 ──────────────────────────────────
let gameDifficulty = 0.4;
let sfxEnabled = sessionStorage.getItem("sfxEnabled") !== "false";
let showSummaryMode = true;

// ── 遊戲流程狀態 ──────────────────────────────
let players = [];
let deckS = [];
let table = [];
let currentS = null;
let callerIdx = 0;
let phase = "WAIT";
let roundCount = 0;
let speakingAI = null;

// ── 手牌動畫 ──────────────────────────────────
let handFlipTimers = [];

// ── 出牌記錄 ──────────────────────────────────
let logPlainText = [];
let roundReport = [];
let pendingReturns = [];
let initialHands = [];

// ── 工具函式 ──────────────────────────────────

/** Fisher-Yates 洗牌 */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** 非同步 sleep */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
