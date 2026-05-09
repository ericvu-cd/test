// =============================================
// 📸 share-card.js  v7
// 直接截整個 win-overlay，不分層
// html2canvas 截得到文字，背景 div 不隱藏讓它一起截
// =============================================

async function captureAndShare(overlayEl, isPlayer, btnEl) {
    const originalText = btnEl ? btnEl.textContent : "";
    if (btnEl) { btnEl.textContent = "⏳ 準備中…"; btnEl.disabled = true; }

    // 只隱藏按鈕本身，其他全部保留
    if (btnEl) btnEl.style.visibility = "hidden";

    try {
        const vw  = window.innerWidth;
        const vh  = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 2, 3);

        const canvas = await html2canvas(overlayEl, {
            scale:                  dpr,
            useCORS:                true,
            allowTaint:             true,   // 允許跨域圖片（bge.png 同源不影響）
            foreignObjectRendering: false,
            backgroundColor:        "#000",
            width:                  vw,
            height:                 vh,
            windowWidth:            vw,
            windowHeight:           vh,
            scrollX:                0,
            scrollY:                0,
            logging:                false,
            imageTimeout:           10000,
        });

        if (btnEl) btnEl.style.visibility = "";

        // 疊浮水印
        drawWatermark(canvas, dpr, isPlayer);

        // 轉 Blob
        const blob = await canvasToBlob(canvas);
        await shareOrDownload(blob, isPlayer);

    } catch (err) {
        if (btnEl) btnEl.style.visibility = "";
        console.error("[share]", err);
        alert("截圖失敗：" + err.message);
    } finally {
        if (btnEl) { btnEl.textContent = originalText; btnEl.disabled = false; }
    }
}

// ─────────────────────────────────────────────
// 浮水印（直接畫在截到的 canvas 上）
// ─────────────────────────────────────────────
function drawWatermark(canvas, dpr, isPlayer) {
    const ctx = canvas.getContext("2d");
    const w   = canvas.width;
    const h   = canvas.height;
    const padX    = 22 * dpr;
    const padY    = 18 * dpr;
    const titlePx = Math.round(17 * dpr);
    const subPx   = Math.round(11 * dpr);
    const hintPx  = Math.round(10 * dpr);
    const barH    = 110 * dpr;

    // 底部遮條
    const grad = ctx.createLinearGradient(0, h - barH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, isPlayer ? "rgba(0,18,8,0.88)" : "rgba(0,4,18,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH, w, barH);

    ctx.textBaseline  = "bottom";
    ctx.shadowColor   = "rgba(0,0,0,0.95)";
    ctx.shadowOffsetX = 0;

    // 主標題
    ctx.font          = `900 ${titlePx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.textAlign     = "left";
    ctx.shadowBlur    = 12 * dpr;
    ctx.shadowOffsetY = 2 * dpr;
    ctx.fillStyle     = isPlayer ? "rgba(160,255,200,0.96)" : "rgba(140,195,255,0.96)";
    ctx.fillText("友魚勇者之路", padX, h - padY);

    // Hashtag
    ctx.font      = `500 ${subPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = isPlayer ? "rgba(120,230,170,0.82)" : "rgba(110,170,240,0.82)";
    ctx.shadowBlur = 8 * dpr;
    ctx.fillText("#永續食魚  #友魚勇者之路", padX, h - padY - titlePx - 7 * dpr);

    // 右下角
    ctx.font          = `400 ${hintPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle     = "rgba(255,255,255,0.48)";
    ctx.textAlign     = "right";
    ctx.shadowBlur    = 4 * dpr;
    ctx.shadowOffsetY = 0;
    ctx.fillText("你也來挑戰看看！", w - padX, h - padY);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur  = 0;
}

// ─────────────────────────────────────────────
// Canvas → Blob
// ─────────────────────────────────────────────
function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob null")), "image/png", 1.0);
    });
}

// ─────────────────────────────────────────────
// 分享 or 下載
// ─────────────────────────────────────────────
async function shareOrDownload(blob, isPlayer) {
    const filename   = isPlayer ? "友魚勇者-勝利.png"        : "友魚勇者-挑戰.png";
    const shareTitle = isPlayer ? "友魚勇者之路 — 任務達成！" : "友魚勇者之路 — 挑戰中";
    const shareText  = isPlayer
        ? "我完成了永續食魚挑戰！一起來守護海洋資源 🐟"
        : "差一點就成功了！永續食魚挑戰，你也來試試 🐟";

    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: shareTitle, text: shareText });
            return;
        } catch (err) {
            if (err.name === "AbortError") return;
        }
    }

    // 桌機 fallback：下載
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = filename; a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 3000);
}
