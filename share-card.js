// =============================================
// 📸 share-card.js  v9
//
// 問題：html2canvas 把 bgImg div（背景圖）
//       渲染在最上層，蓋住下方文字。
//
// 解法：
//   1. 截圖前把 bgImg div opacity→0（只截文字層）
//   2. 用 Canvas 自己畫 bge.png 墊底
//   3. 把文字截圖疊上去
//   4. 疊浮水印
// =============================================

async function captureAndShare(overlayEl, isPlayer, btnEl) {
    const originalText = btnEl ? btnEl.textContent : "";
    if (btnEl) { btnEl.textContent = "⏳ 準備中…"; btnEl.disabled = true; }

    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 2, 3);

    // 截圖前隱藏：① 按鈕本身  ② bgImg div（背景圖）
    if (btnEl) btnEl.style.visibility = "hidden";
    const bgImgDiv = overlayEl.firstElementChild;
    if (bgImgDiv) bgImgDiv.style.opacity = "0";

    let textCanvas = null;
    try {
        textCanvas = await html2canvas(overlayEl, {
            scale:                  dpr,
            useCORS:                true,
            allowTaint:             true,
            foreignObjectRendering: false,
            backgroundColor:        null,   // 透明，只取文字
            width:                  vw,
            height:                 vh,
            windowWidth:            vw,
            windowHeight:           vh,
            scrollX:                0,
            scrollY:                0,
            logging:                false,
            imageTimeout:           10000,
        });
    } catch(e) {
        console.error("[share] html2canvas 失敗:", e);
    } finally {
        // 立刻還原
        if (bgImgDiv) bgImgDiv.style.opacity = "";
        if (btnEl)    btnEl.style.visibility = "";
    }

    try {
        const pw = Math.round(vw * dpr);
        const ph = Math.round(vh * dpr);

        // ── 最終 Canvas ──────────────────────────
        const out = document.createElement("canvas");
        out.width  = pw;
        out.height = ph;
        const ctx  = out.getContext("2d");

        // ── Layer 1：黑色底 ──────────────────────
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, pw, ph);

        // ── Layer 2：bge.png（cover，同 win-screen）
        await new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                // cover 計算
                const ir = img.width / img.height;
                const vr = pw / ph;
                let sx, sy, sw, sh;
                if (ir > vr) {
                    sh = img.height; sw = sh * vr;
                    sy = 0;          sx = (img.width - sw) / 2;
                } else {
                    sw = img.width;  sh = sw / vr;
                    sx = 0;          sy = (img.height - sh) / 2;
                }
                if (!isPlayer) ctx.filter = "hue-rotate(190deg) saturate(0.9) brightness(0.7)";
                ctx.globalAlpha = isPlayer ? 1 : 0.95;
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, pw, ph);
                ctx.globalAlpha = 1;
                ctx.filter      = "none";
                resolve();
            };
            img.onerror = () => {
                // 背景圖失敗：漸層替代
                const g = ctx.createLinearGradient(0, 0, 0, ph);
                if (isPlayer) { g.addColorStop(0,"#021a0a"); g.addColorStop(1,"#04301a"); }
                else          { g.addColorStop(0,"#01050f"); g.addColorStop(1,"#03122e"); }
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, pw, ph);
                resolve();
            };
            img.src = "bge.png";
        });

        // ── Layer 3：漸層遮罩（同 win-screen）────
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

        // ── Layer 4：文字截圖 ─────────────────────
        if (textCanvas) {
            ctx.drawImage(textCanvas, 0, 0, pw, ph);
        }

        // ── Layer 5：浮水印 ──────────────────────
        drawWatermark(ctx, pw, ph, dpr, isPlayer);

        // ── 轉 Blob → 分享 ───────────────────────
        const blob = await canvasToBlob(out);
        await shareOrDownload(blob, isPlayer);

    } catch (err) {
        console.error("[share]", err);
        alert("截圖失敗：" + err.message);
    } finally {
        if (btnEl) { btnEl.textContent = originalText; btnEl.disabled = false; }
    }
}

// ─────────────────────────────────────────────
// 浮水印
// ─────────────────────────────────────────────
function drawWatermark(ctx, w, h, dpr, isPlayer) {
    const padX    = 22 * dpr;
    const padY    = 18 * dpr;
    const titlePx = Math.round(17 * dpr);
    const subPx   = Math.round(11 * dpr);
    const barH    = 110 * dpr;

    const grad = ctx.createLinearGradient(0, h - barH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, isPlayer ? "rgba(0,18,8,0.92)" : "rgba(0,4,18,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH, w, barH);

    ctx.textBaseline  = "bottom";
    ctx.shadowColor   = "rgba(0,0,0,0.95)";
    ctx.shadowOffsetX = 0;

    ctx.font          = `900 ${titlePx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.textAlign     = "left";
    ctx.shadowBlur    = 12 * dpr;
    ctx.shadowOffsetY = 2 * dpr;
    ctx.fillStyle     = isPlayer ? "rgba(160,255,200,0.96)" : "rgba(140,195,255,0.96)";
    ctx.fillText("友魚勇者之路", padX, h - padY);

    ctx.font      = `500 ${subPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = isPlayer ? "rgba(120,230,170,0.82)" : "rgba(110,170,240,0.82)";
    ctx.shadowBlur = 8 * dpr;
    ctx.fillText("#永續食魚  #友魚勇者之路", padX, h - padY - titlePx - 7 * dpr);

    ctx.font          = `400 ${Math.round(10 * dpr)}px "PingFang TC","Microsoft JhengHei",sans-serif`;
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
