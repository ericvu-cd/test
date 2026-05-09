// =============================================
// 📸 share-card.js
// 截圖結算畫面 → 疊浮水印 → 分享 / 下載
// =============================================

/**
 * 主入口：截圖 win-overlay，疊浮水印後分享或下載
 * @param {HTMLElement} overlayEl  - win-overlay 的 DOM 元素
 * @param {boolean}     isPlayer   - true=勝利, false=失敗（影響浮水印配色）
 * @param {HTMLElement} btnEl      - 分享按鈕本身（用來切換 loading 狀態）
 */
async function captureAndShare(overlayEl, isPlayer, btnEl) {
    const originalText = btnEl ? btnEl.textContent : "";
    if (btnEl) {
        btnEl.textContent = "⏳ 準備中…";
        btnEl.disabled = true;
    }

    try {
        // ── 1. html2canvas 截圖 ────────────────────────
        const canvas = await html2canvas(overlayEl, {
            useCORS: true,
            allowTaint: false,
            scale: window.devicePixelRatio || 2, // Retina 清晰
            width: window.innerWidth,
            height: window.innerHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            logging: false,
            imageTimeout: 8000,
            backgroundColor: null,
            ignoreElements: (el) => {
                // 排除分享按鈕本身，避免截進去
                return el === btnEl;
            }
        });

        // ── 2. 疊浮水印 ────────────────────────────────
        const finalCanvas = addWatermark(canvas, isPlayer);

        // ── 3. 轉成 Blob ───────────────────────────────
        const blob = await new Promise(resolve =>
            finalCanvas.toBlob(resolve, "image/png", 1.0)
        );

        // ── 4. 分享或下載 ──────────────────────────────
        await shareOrDownload(blob, isPlayer);

    } catch (err) {
        console.error("截圖失敗:", err);
        alert("截圖失敗，請稍後再試。");
    } finally {
        if (btnEl) {
            btnEl.textContent = originalText;
            btnEl.disabled = false;
        }
    }
}

// =============================================
// 🖋 疊浮水印
// =============================================
function addWatermark(srcCanvas, isPlayer) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;

    const out = document.createElement("canvas");
    out.width  = w;
    out.height = h;
    const ctx = out.getContext("2d");

    // 原圖貼入
    ctx.drawImage(srcCanvas, 0, 0);

    const dpr = window.devicePixelRatio || 2;

    // ── 底部半透明遮條（確保文字可讀）────────────────
    const barH = 88 * dpr;
    const grad = ctx.createLinearGradient(0, h - barH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, isPlayer ? "rgba(0,20,8,0.82)" : "rgba(0,4,18,0.82)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH, w, barH);

    // ── 遊戲主標題 ────────────────────────────────────
    const titleSize = Math.round(18 * dpr);
    ctx.font         = `900 ${titleSize}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.textAlign    = "left";

    // 文字底色（陰影）
    ctx.shadowColor   = "rgba(0,0,0,0.9)";
    ctx.shadowBlur    = 10 * dpr;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * dpr;

    ctx.fillStyle = isPlayer
        ? "rgba(160,255,200,0.95)"   // 勝利：淡綠
        : "rgba(140,195,255,0.95)";  // 失敗：淡藍

    const padX = 22 * dpr;
    const padY = 16 * dpr;
    ctx.fillText("友魚勇者之路", padX, h - padY);

    // ── 副標（Hashtag / 推廣語）──────────────────────
    const subSize = Math.round(11 * dpr);
    ctx.font      = `500 ${subSize}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = isPlayer
        ? "rgba(120,230,170,0.80)"
        : "rgba(110,170,240,0.80)";
    ctx.shadowBlur = 6 * dpr;

    ctx.fillText("#永續食魚  #友魚勇者之路", padX, h - padY - titleSize - 6 * dpr);

    // ── 右下角小字（鼓勵分享）───────────────────────
    const hintSize = Math.round(10 * dpr);
    ctx.font      = `400 ${hintSize}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.textAlign = "right";
    ctx.shadowBlur = 4 * dpr;
    ctx.fillText("你也來挑戰看看！", w - 22 * dpr, h - padY);

    // 重置 shadow 避免影響後續操作
    ctx.shadowColor   = "transparent";
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    return out;
}

// =============================================
// 📤 分享 or 下載
// =============================================
async function shareOrDownload(blob, isPlayer) {
    const filename = isPlayer ? "友魚勇者-勝利.png" : "友魚勇者-挑戰.png";
    const shareTitle = isPlayer ? "友魚勇者之路 — 任務達成！" : "友魚勇者之路 — 挑戰中";
    const shareText  = isPlayer
        ? "我完成了永續食魚挑戰！一起來守護海洋資源 🐟"
        : "差一點就成功了！永續食魚挑戰，你也來試試 🐟";

    const file = new File([blob], filename, { type: "image/png" });

    // Web Share API Level 2（行動端：iOS Safari 15+、Android Chrome 86+）
    if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
    ) {
        try {
            await navigator.share({
                files: [file],
                title: shareTitle,
                text: shareText,
            });
            return;
        } catch (err) {
            // 使用者取消分享（AbortError）不視為錯誤
            if (err.name === "AbortError") return;
            // 其他錯誤 fallback 下載
            console.warn("Web Share 失敗，改為下載:", err);
        }
    }

    // Fallback：桌機 / Line 內建瀏覽器 → 觸發下載
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
    }, 3000);
}
