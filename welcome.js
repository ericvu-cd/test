// =============================================
// 🏠 welcome.js — 歡迎頁互動邏輯
// =============================================

(function () {

    // ── 泡泡動畫 ──────────────────────────────
    var _bubTimer = null;

    function _mkBub() {
        var wrap = document.getElementById('ws-bubbles');
        if (!wrap) return;
        var b = document.createElement('div');
        b.className = 'ws-mbubble';
        var s = 5 + Math.random() * 12;
        b.style.cssText =
            'width:' + s + 'px;height:' + s + 'px;' +
            'left:' + (Math.random() * 88 + 5) + '%;' +
            'bottom:-' + s + 'px;' +
            'animation-duration:' + (8 + Math.random() * 10) + 's;' +
            'animation-delay:' + (Math.random() * 4) + 's;';
        wrap.appendChild(b);
        setTimeout(function () { b.remove(); }, 22000);
    }

    function _startBub() {
        if (_bubTimer) return;
        for (var i = 0; i < 8; i++) _mkBub();
        _bubTimer = setInterval(_mkBub, 1800);
    }

    function _stopBub() {
        if (_bubTimer) { clearInterval(_bubTimer); _bubTimer = null; }
    }

    // 監聽 welcome-screen display 變化，自動啟停泡泡
    var _wsEl = document.getElementById('welcome-screen');
    if (_wsEl) {
        new MutationObserver(function () {
            if (_wsEl.style.display !== 'none') _startBub();
            else _stopBub();
        }).observe(_wsEl, { attributes: true, attributeFilter: ['style'] });
    }

    // ── 難度選擇 ──────────────────────────────
    window.wsSetDiff = function (val, btn) {
        if (typeof gameDifficulty !== 'undefined') gameDifficulty = val;
        document.querySelectorAll('.ws-diff-btn')
            .forEach(function (b) { b.classList.remove('ws-active'); });
        btn.classList.add('ws-active');
    };

    // ── 音效・音樂開關 ──────────────────────────
    window.wsToggleSound = function () {
        var toggle = document.getElementById('ws-sound-toggle');
        var icon   = document.getElementById('ws-sound-icon');
        var isOn   = toggle.classList.toggle('ws-on');
        if (typeof sfxEnabled !== 'undefined') sfxEnabled = isOn;
        sessionStorage.setItem('sfxEnabled', isOn ? 'true' : 'false');
        icon.textContent = isOn ? '🔊' : '🔇';
        var bgm = document.getElementById('bgm');
        if (bgm) {
            if (isOn) bgm.play().catch(function () {});
            else bgm.pause();
        }
    };

    // 初始化：讀取 sessionStorage 音效狀態
    (function () {
        var stored = sessionStorage.getItem('sfxEnabled');
        if (stored === 'false') {
            if (typeof sfxEnabled !== 'undefined') sfxEnabled = false;
            var t = document.getElementById('ws-sound-toggle');
            var i = document.getElementById('ws-sound-icon');
            if (t) t.classList.remove('ws-on');
            if (i) i.textContent = '🔇';
        }
    })();

    // ── 結算報告開關 ──────────────────────────
    window.wsToggleReport = function () {
        var toggle = document.getElementById('ws-report-toggle');
        var icon   = document.getElementById('ws-report-icon');
        var isOn   = toggle.classList.toggle('ws-on');
        if (typeof showSummaryMode !== 'undefined') showSummaryMode = isOn;
        sessionStorage.setItem('reportMode', isOn ? 'true' : 'false');
        if (icon) icon.style.filter = isOn ? '' : 'grayscale(1) opacity(0.35)';
    };

    // 初始化：讀取 sessionStorage 結算狀態
    (function () {
        var stored = sessionStorage.getItem('reportMode');
        if (stored === 'false') {
            if (typeof showSummaryMode !== 'undefined') showSummaryMode = false;
            var t    = document.getElementById('ws-report-toggle');
            var icon = document.getElementById('ws-report-icon');
            if (t) t.classList.remove('ws-on');
            if (icon) icon.style.filter = 'grayscale(1) opacity(0.35)';
        }
    })();

    // ── 啟航冒險 ──────────────────────────────
    window.wsStartGame = function () {
        var nameEl = document.getElementById('ws-name-input');
        window.playerName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : '勇者';

        // 同步結算報告狀態到遊戲中按鈕
        var reportOn = document.getElementById('ws-report-toggle').classList.contains('ws-on');
        if (typeof showSummaryMode !== 'undefined') showSummaryMode = reportOn;

        var rBtn = document.getElementById('report-control');
        if (rBtn) {
            if (reportOn) {
                rBtn.style.opacity = '1';
                rBtn.innerHTML = '📊';
            } else {
                rBtn.style.opacity = '0.85';
                rBtn.innerHTML = '<span style="filter:grayscale(1);display:inline-block;">📊</span><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.2em;font-weight:900;color:#ff2222;pointer-events:none;">✕</span>';
            }
        }

        _stopBub();
        if (typeof initGame === 'function') initGame();
    };

})();
