// =============================================
// 📸 share-card.js  v5（手機專用，穩定版）
//
// 關鍵做法：
//   截圖前把 overlay position:fixed → absolute
//   讓 html-to-image 能完整看到整個元素
//   截完立刻還原
// =============================================

async function captureAndShare(overlayEl, isPlayer, btnEl) {
    const originalText = btnEl ? btnEl.textContent : "";
    if (btnEl) {
        btnEl.textContent = "⏳ 準備中…";
        btnEl.disabled = true;
    }

    // 暫時隱藏按鈕（不截進圖）
    if (btnEl) btnEl.style.visibility = "hidden";

    // ── 把 fixed 改成 absolute，讓截圖套件看得到 ──
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    overlayEl.style.position = "absolute";
    overlayEl.style.width    = vw + "px";
    overlayEl.style.height   = vh + "px";
    overlayEl.style.top      = window.scrollY + "px";
    overlayEl.style.left     = "0";
    document.body.style.overflow = "hidden";

    try {
        const dataUrl = await htmlToImage.toPng(overlayEl, {
            width:      vw,
            height:     vh,
            pixelRatio: Math.min(window.devicePixelRatio || 2, 3),
            cacheBust:  true,
        });

        // ── 還原樣式 ──
        overlayEl.style.position = "fixed";
        overlayEl.style.width    = "";
        overlayEl.style.height   = "";
        overlayEl.style.top      = "";
        overlayEl.style.left     = "";
        document.body.style.overflow = "";
        if (btnEl) btnEl.style.visibility = "";

        // ── 疊浮水印 ──
        const finalDataUrl = await addWatermark(dataUrl, isPlayer);
        const blob = dataUrlToBlob(finalDataUrl);
        await shareOrDownload(blob, isPlayer);

    } catch (err) {
        // 還原樣式
        overlayEl.style.position = "fixed";
        overlayEl.style.width    = "";
        overlayEl.style.height   = "";
        overlayEl.style.top      = "";
        overlayEl.style.left     = "";
        document.body.style.overflow = "";
        if (btnEl) btnEl.style.visibility = "";

        console.error("[share-card]", err);
        alert("截圖失敗：" + err.message);
    } finally {
        if (btnEl) {
            btnEl.textContent = originalText;
            btnEl.disabled    = false;
        }
    }
}

// =============================================
// 🖋 疊浮水印
// =============================================
function addWatermark(dataUrl, isPlayer) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const w   = img.width;
            const h   = img.height;
            const dpr = Math.min(window.devicePixelRatio || 2, 3);

            const c   = document.createElement("canvas");
            c.width   = w;
            c.height  = h;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);

            const padX = 22 * dpr;
            const padY = 18 * dpr;

            // 底部漸層遮條
            const barH = 110 * dpr;
            const grad = ctx.createLinearGradient(0, h - barH, 0, h);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, isPlayer ? "rgba(0,18,8,0.88)" : "rgba(0,4,18,0.88)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, h - barH, w, barH);

            // 遊戲主標題
            const titlePx = Math.round(17 * dpr);
            ctx.font          = `900 ${titlePx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
            ctx.textBaseline  = "bottom";
            ctx.textAlign     = "left";
            ctx.shadowColor   = "rgba(0,0,0,0.95)";
            ctx.shadowBlur    = 12 * dpr;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2 * dpr;
            ctx.fillStyle     = isPlayer ? "rgba(160,255,200,0.96)" : "rgba(140,195,255,0.96)";
            ctx.fillText("友魚勇者之路", padX, h - padY);

            // Hashtag
            const subPx = Math.round(11 * dpr);
            ctx.font      = `500 ${subPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
            ctx.fillStyle = isPlayer ? "rgba(120,230,170,0.82)" : "rgba(110,170,240,0.82)";
            ctx.shadowBlur = 8 * dpr;
            ctx.fillText("#永續食魚  #友魚勇者之路", padX, h - padY - titlePx - 7 * dpr);

            // 右下角小字
            ctx.font      = `400 ${Math.round(10 * dpr)}px "PingFang TC","Microsoft JhengHei",sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.48)";
            ctx.textAlign = "right";
            ctx.shadowBlur = 4 * dpr;
            ctx.fillText("你也來挑戰看看！", w - padX, h - padY);

            ctx.shadowColor = "transparent";
            ctx.shadowBlur  = 0;

            resolve(c.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// =============================================
// 🔧 DataURL → Blob
// =============================================
function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mime   = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr    = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// =============================================
// 📤 分享（手機）or 下載（桌機 fallback）
// =============================================
async function shareOrDownload(blob, isPlayer) {
    const filename   = isPlayer ? "友魚勇者-勝利.png"        : "友魚勇者-挑戰.png";
    const shareTitle = isPlayer ? "友魚勇者之路 — 任務達成！" : "友魚勇者之路 — 挑戰中";
    const shareText  = isPlayer
        ? "我完成了永續食魚挑戰！一起來守護海洋資源 🐟"
        : "差一點就成功了！永續食魚挑戰，你也來試試 🐟";

    const file = new File([blob], filename, { type: "image/png" });

    // 手機：Web Share API with files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: shareTitle, text: shareText });
            return;
        } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("[share-card] Web Share 失敗:", err);
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
