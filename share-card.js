async function captureAndShare(overlayEl, isPlayer, btnEl) {
    const originalText = btnEl ? btnEl.textContent : "";
    if (btnEl) { btnEl.textContent = "⏳ 準備中…"; btnEl.disabled = true; }
    if (btnEl) btnEl.style.visibility = "hidden";

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 2, 3);

    // 截圖前：fixed → static，給定明確寬高
    overlayEl.style.position = "static";
    overlayEl.style.width    = vw + "px";
    overlayEl.style.height   = vh + "px";
    overlayEl.style.overflow = "hidden";

    try {
        const canvas = await html2canvas(overlayEl, {
            scale:                  dpr,
            useCORS:                true,
            allowTaint:             true,
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

        // 還原
        overlayEl.style.position = "fixed";
        overlayEl.style.width    = "";
        overlayEl.style.height   = "";
        overlayEl.style.overflow = "hidden";
        if (btnEl) btnEl.style.visibility = "";

        // 加浮水印
        addWatermark(canvas, dpr, isPlayer);

        // 轉 blob 分享
        const blob = await new Promise((res, rej) =>
            canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob null")), "image/png")
        );

        const file = new File([blob], isPlayer ? "友魚勇者-勝利.png" : "友魚勇者-挑戰.png", { type: "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files:  [file],
                title:  isPlayer ? "友魚勇者之路 — 任務達成！" : "友魚勇者之路 — 挑戰中",
                text:   isPlayer ? "我完成了永續食魚挑戰！🐟 #永續食魚" : "差一點就成功了！🐟 #永續食魚",
            });
        } else {
            // 桌機：下載
            const url = URL.createObjectURL(blob);
            Object.assign(document.createElement("a"), { href: url, download: file.name, style: "display:none" })
                  .click();
            setTimeout(() => URL.revokeObjectURL(url), 3000);
        }

    } catch (err) {
        overlayEl.style.position = "fixed";
        overlayEl.style.width    = "";
        overlayEl.style.height   = "";
        if (btnEl) btnEl.style.visibility = "";
        console.error(err);
        alert("截圖失敗：" + err.message);
    } finally {
        if (btnEl) { btnEl.textContent = originalText; btnEl.disabled = false; }
    }
}

function addWatermark(canvas, dpr, isPlayer) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const px = dpr, padX = 22*px, padY = 18*px;
    const titlePx = Math.round(17*px), subPx = Math.round(11*px);

    // 底部遮條
    const g = ctx.createLinearGradient(0, h - 110*px, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, isPlayer ? "rgba(0,18,8,.92)" : "rgba(0,4,18,.92)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h - 110*px, w, 110*px);

    ctx.textBaseline = "bottom";
    ctx.shadowColor  = "rgba(0,0,0,.95)";
    ctx.shadowOffsetX = 0;

    ctx.font = `900 ${titlePx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.textAlign = "left";
    ctx.shadowBlur = 12*px; ctx.shadowOffsetY = 2*px;
    ctx.fillStyle = isPlayer ? "rgba(160,255,200,.96)" : "rgba(140,195,255,.96)";
    ctx.fillText("友魚勇者之路", padX, h - padY);

    ctx.font = `500 ${subPx}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = isPlayer ? "rgba(120,230,170,.82)" : "rgba(110,170,240,.82)";
    ctx.shadowBlur = 8*px;
    ctx.fillText("#永續食魚  #友魚勇者之路", padX, h - padY - titlePx - 7*px);

    ctx.font = `400 ${Math.round(10*px)}px "PingFang TC","Microsoft JhengHei",sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.48)"; ctx.textAlign = "right";
    ctx.shadowBlur = 4*px; ctx.shadowOffsetY = 0;
    ctx.fillText("你也來挑戰看看！", w - padX, h - padY);

    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
}
