// =============================================
// 📸 share-card.js  v6
// 零依賴，純 Canvas，手機分享
//
// 做法：
//   1. 用 fetch 把 bge.png 轉成 blob URL（繞開 CORS taint）
//   2. Canvas 畫背景圖（cover）+ 漸層遮罩
//   3. html2canvas 截 overlay 的文字層（先把背景 div 隱藏）
//   4. 疊合 + 浮水印 → Web Share API
// =============================================

async function captureAndShare(overlayEl, isPlayer, btnEl) {
    const originalText = btnEl ? btnEl.textContent : "";
    if (btnEl) { btnEl.textContent = "⏳ 準備中…"; btnEl.disabled = true; }

    try {
        const vw  = window.innerWidth;
        const vh  = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 2, 3);
        const pw  = Math.round(vw * dpr);   // 實際像素寬
        const ph  = Math.round(vh * dpr);   // 實際像素高

        // ── 建立最終 Canvas ──────────────────────────
        const canvas = document.createElement("canvas");
        canvas.width  = pw;
        canvas.height = ph;
        const ctx = canvas.getContext("2d");

        // ── Layer 1：bge.png ─────────────────────────
        // 用 fetch → objectURL 避免 canvas taint 問題
        await drawCoverImage(ctx, "bge.png", pw, ph, isPlayer);

        // ── Layer 1b：漸層遮罩（同 win-screen.js）────
        const maskGrad = ctx.createLinearGradient(0, 0, 0, ph);
        if (isPlayer) {
            maskGrad.addColorStop(0,   "rgba(2,10,6,.22)");
            maskGrad.addColorStop(0.4, "rgba(3,18,8,.08)");
            maskGrad.addColorStop(1,   "rgba(1,10,4,.38)");
        } else {
            maskGrad.addColorStop(0,   "rgba(1,5,15,.30)");
            maskGrad.addColorStop(0.4, "rgba(3,12,28,.12)");
            maskGrad.addColorStop(1,   "rgba(1,4,14,.45)");
        }
        ctx.fillStyle = maskGrad;
        ctx.fillRect(0, 0, pw, ph);

        // ── Layer 2：用 html2canvas 截文字層 ─────────
        // 先把 bgImg div（第一個子元素）隱藏，只截文字
        const bgDiv = overlayEl.firstElementChild;
        if (bgDiv) bgDiv.style.visibility = "hidden";
        if (btnEl) btnEl.style.visibility = "hidden";

        let textCanvas = null;
        if (typeof html2canvas === "function") {
            try {
                textCanvas = await html2canvas(overlayEl, {
                    scale:                  dpr,
                    useCORS:                true,
                    allowTaint:             false,
                    foreignObjectRendering: false,
                    backgroundColor:        null,
                    width:  vw, height:  vh,
                    windowWidth: vw, windowHeight: vh,
                    scrollX: 0, scrollY: 0,
                    logging: false,
                    imageTimeout: 8000,
                });
            } catch(e) {
                console.warn("[share] html2canvas 失敗，只用背景:", e);
            }
        }

        if (bgDiv) bgDiv.style.visibility = "";
        if (btnEl) btnEl.style.visibility = "";

        // 把文字層疊上去
        if (textCanvas) {
            ctx.drawImage(textCanvas, 0, 0, pw, ph);
        } else {
            // html2canvas 也沒有：畫簡單文字替代
            drawFallbackText(ctx, pw, ph, dpr, isPlayer);
        }

        // ── Layer 3：浮水印 ──────────────────────────
        drawWatermark(ctx, pw, ph, dpr, isPlayer);

        // ── 轉 Blob → 分享 ───────────────────────────
        const blob = await canvasToBlob(canvas);
        await shareOrDownload(blob, isPlayer);

    } catch (err) {
        console.error("[share]", err);
        alert("截圖失敗：" + err.message);
    } finally {
        if (btnEl) { btnEl.textContent = originalText; btnEl.disabled = false; }
    }
}

// ─────────────────────────────────────────────
// 畫背景圖（cover，支援失敗 fallback）
// ─────────────────────────────────────────────
function drawCoverImage(ctx, src, pw, ph, isPlayer) {
    return new Promise(resolve => {
        // 先嘗試 fetch → blob URL（避免 canvas taint）
        fetch(src, { mode: "same-origin" })
            .then(r => r.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    _drawCover(ctx, img, pw, ph, isPlayer);
                    URL.revokeObjectURL(blobUrl);
                    resolve();
                };
                img.onerror = () => { URL.revokeObjectURL(blobUrl); drawGradientBg(ctx, pw, ph, isPlayer); resolve(); };
                img.src = blobUrl;
            })
            .catch(() => {
                // fetch 失敗（file:// 協議等），直接 new Image
                const img = new Image();
                img.onload  = () => { _drawCover(ctx, img, pw, ph, isPlayer); resolve(); };
                img.onerror = () => { drawGradientBg(ctx, pw, ph, isPlayer); resolve(); };
                img.src = src;
            });
    });
}

function _drawCover(ctx, img, pw, ph, isPlayer) {
    const ir = img.width / img.height;
    const vr = pw / ph;
    let sx, sy, sw, sh;
    if (ir > vr) { sh = img.height; sw = sh * vr; sy = 0; sx = (img.width - sw) / 2; }
    else         { sw = img.width;  sh = sw / vr; sx = 0; sy = (img.height - sh) / 2; }

    if (!isPlayer) ctx.filter = "hue-rotate(190deg) saturate(0.9) brightness(0.7)";
    ctx.globalAlpha = isPlayer ? 1 : 0.95;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, pw, ph);
    ctx.globalAlpha = 1;
    ctx.filter = "none";
}

function drawGradientBg(ctx, pw, ph, isPlayer) {
    const g = ctx.createLinearGradient(0, 0, 0, ph);
    if (isPlayer) { g.addColorStop(0, "#021a0a"); g.addColorStop(1, "#04301a"); }
    else          { g.addColorStop(0, "#01050f"); g.addColorStop(1, "#03122e"); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, pw, ph);
}

// ─────────────────────────────────────────────
// html2canvas 失敗時的簡單文字替代
// ─────────────────────────────────────────────
function drawFallbackText(ctx, pw, ph, dpr, isPlayer) {
    ctx.textAlign   = "center";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur  = 20 * dpr;
    ctx.font        = `${Math.round(ph * 0.13)}px sans-serif`;
    ctx.fillText(isPlayer ? "🏆" : "🌊", pw / 2, ph * 0.42);
    ctx.font      = `900 ${Math.round(ph * 0.06)}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = isPlayer ? "rgba(160,255,200,0.96)" : "rgba(140,195,255,0.96)";
    ctx.fillText(isPlayer ? "任務達成！" : "海域重歸寧靜", pw / 2, ph * 0.58);
    ctx.shadowBlur  = 0;
    ctx.shadowColor = "transparent";
}

// ─────────────────────────────────────────────
// 浮水印
// ─────────────────────────────────────────────
function drawWatermark(ctx, pw, ph, dpr, isPlayer) {
    const padX    = 22 * dpr;
    const padY    = 18 * dpr;
    const titlePx = Math.round(17 * dpr);
    const subPx   = Math.round(11 * dpr);
    const hintPx  = Math.round(10 * dpr);

    // 底部遮條
    const barH = 110 * dpr;
    const grad  = ctx.createLinearGradient(0, ph - barH, 0, ph);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, isPlayer ? "rgba(0,18,8,0.88)" : "rgba(0,4,18,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, ph - barH, pw, barH);

    ctx.textBaseline  = "bottom";
    ctx.shadowColor   = "rgba(0,0,0,0.95)";
    ctx.shadowOffsetX = 0;

    // 主標題
    ctx.font          = `900 ${titlePx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.textAlign     = "left";
    ctx.shadowBlur    = 12 * dpr;
    ctx.shadowOffsetY = 2 * dpr;
    ctx.fillStyle     = isPlayer ? "rgba(160,255,200,0.96)" : "rgba(140,195,255,0.96)";
    ctx.fillText("友魚勇者之路", padX, ph - padY);

    // Hashtag
    ctx.font      = `500 ${subPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = isPlayer ? "rgba(120,230,170,0.82)" : "rgba(110,170,240,0.82)";
    ctx.shadowBlur = 8 * dpr;
    ctx.fillText("#永續食魚  #友魚勇者之路", padX, ph - padY - titlePx - 7 * dpr);

    // 右下角
    ctx.font          = `400 ${hintPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle     = "rgba(255,255,255,0.48)";
    ctx.textAlign     = "right";
    ctx.shadowBlur    = 4 * dpr;
    ctx.shadowOffsetY = 0;
    ctx.fillText("你也來挑戰看看！", pw - padX, ph - padY);

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
