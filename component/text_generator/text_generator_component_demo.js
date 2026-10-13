"use strict";
/* 示範專用字形（不屬於軍火庫核心；只展示宿主如何提供完整 SVG）。 */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("#text-input");
  const preview = document.querySelector("#preview-image");
  const status = document.querySelector("#status");
  const counter = document.querySelector("#counter");
  const controls = ["export-svg", "export-png", "export-cover"].map(id => document.getElementById(id));
  if (!window.SlowlyTextGenerator) {
    status.textContent = "無法載入文字產生器完成品。";
    return;
  }

  const art = window.SlowlyTextGenerator.create({
    maxChars: 4,
    sourceSize: { width: 840, height: 1200 },
    presets: { png: { scale: 2 }, cover: { width: 700, height: 1000, fit: "contain", paddingX: 60, paddingY: 45 } },
    filenames: {
      svg: text => `${text}_示範.svg`,
      png: text => `${text}_示範_2x.png`,
      cover: text => `${text}_書封_700x1000.png`
    },
    renderSVG(text, { splitCharacters, escapeXML }) {
      const chars = splitCharacters(text);
      const ys = Array.from({ length: chars.length }, (_, i) => 600 + (i - (chars.length - 1) / 2) * 275);
      const glyphs = chars.map((c, i) => `
        <text x="420" y="${ys[i]}" text-anchor="middle" dominant-baseline="central"
          font-family="Noto Serif TC, PMingLiU, serif" font-weight="800"
          font-size="210" fill="url(#ink)" stroke="#7499af" stroke-width="2" paint-order="stroke fill">${escapeXML(c)}</text>`).join("");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="1200" viewBox="0 0 840 1200">
       <title>${escapeXML(text)}｜測試模板</title>
       <defs><linearGradient id="ink" x2="1" y2="1"><stop stop-color="#315b73"/><stop offset="1" stop-color="#92c4c0"/></linearGradient></defs>
       <path d="M420 80V1120" stroke="#658ea4" stroke-width="3" opacity=".12"/>
       ${glyphs}</svg>`;
    }
  });
  const manager = art.createPreview(preview);
  let busy = false, composing = false;
  function render(clearStatus = true) {
    const text = art.normalize(input.value);
    if (input.value !== text) input.value = text;
    counter.textContent = `${art.splitCharacters(text).length} / ${art.maxChars}`;
    controls.forEach(b => b.disabled = !text || busy);
    if (!text) {
      manager.clear();
      status.textContent = "請輸入文字。";
      return;
    }
    try {
      manager.set(text);
      if (clearStatus) status.textContent = "";
    }
    catch (error) {
      status.textContent = error.message;
    }
  }
  input.addEventListener("compositionstart", () => {
    composing = true;
  });
  input.addEventListener("compositionend", () => {
    composing = false;
    render();
  });
  input.addEventListener("input", () => {
    if (!composing) render();
  });
  controls.forEach((button, index) => button.addEventListener("click", async () => {
    if (busy || !input.value) return;
    busy = true;
    render();
    status.textContent = "正在生成……";
    try {
      const info = await ([() => art.downloadSVG(input.value), () => art.downloadPNG(input.value), () => art.downloadCover(input.value)][index]());
      status.textContent = `已送出下載：${info.filename}`;
    } catch (error) {
      status.textContent = `下載失敗：${error.message}`;
      console.error(error);
    }
    finally {
      busy = false;
      render(false);
    }
  }));
  window.addEventListener("pagehide", () => manager.destroy());
  render();
});
