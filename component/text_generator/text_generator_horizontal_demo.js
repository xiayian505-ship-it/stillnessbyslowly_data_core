"use strict";

/* 獨立示範：模板完全由宿主定義，不內建於軍火庫完成品。 */
document.addEventListener("DOMContentLoaded", () => {
  const art = window.SlowlyHorizontalTextGenerator.create({
    maxChars: 4,
    sourceSize: { width: 1200, height: 650 },
    renderSVG(text, helpers, layout) {
      const glyphs = helpers.splitCharacters(text).map((char, index) => {
        const slot = layout.slots[index];
        return `<text x="${slot.x}" y="${slot.y}" ` +
          `text-anchor="middle" dominant-baseline="middle" ` +
          `font-family="serif" font-size="160" ` +
          `fill="#303030">${helpers.escapeXML(char)}</text>`;
      }).join("\n");
      return `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `width="1200" height="650" viewBox="0 0 1200 650">` +
        `<g>${glyphs}</g></svg>`;
    },
    presets: {
      png: { scale: 2 },
      cover: { width: 700, height: 1000, fit: "contain", paddingX: 48, paddingY: 54 }
    },
    filenames: {
      svg: text => `${text}_horizontal.svg`,
      png: text => `${text}_horizontal_2x.png`,
      cover: text => `${text}_horizontal_700x1000.png`
    }
  });

  const input = document.querySelector("#art-text");
  const image = document.querySelector("#preview");
  const status = document.querySelector("#status");
  const counter = document.querySelector("#counter");
  const preview = art.createPreview(image);
  const buttons = ["#download-svg", "#download-png", "#download-cover"]
    .map(selector => document.querySelector(selector));
  let composing = false;
  let busy = false;

  function refresh() {
    const raw = input.value;
    const text = art.normalize(raw);
    if (input.value !== text) input.value = text;
    const valid = !!text;
    counter.textContent = `${art.splitCharacters(text).length} / ${art.maxChars}`;
    buttons.forEach(button => button.disabled = !valid || busy);
    if (!valid) {
      preview.clear();
      status.textContent = "請輸入至少一個字。";
      return;
    }
    try {
      preview.set(text);
      status.textContent = "";
    } catch (error) {
      preview.clear();
      status.textContent = `預覽失敗：${error.message}`;
      buttons.forEach(button => button.disabled = true);
    }
  }

  input.addEventListener("compositionstart", () => {
    composing = true;
  });
  input.addEventListener("compositionend", () => {
    composing = false;
    refresh();
  });
  input.addEventListener("input", () => {
    if (!composing) refresh();
  });

  async function download(action) {
    if (busy || !art.normalize(input.value)) return;
    busy = true;
    buttons.forEach(button => button.disabled = true);
    status.textContent = "正在準備下載……";
    try {
      const result = await action();
      status.textContent = `已送出下載：${result.filename}`;
    } catch (error) {
      console.error(error);
      status.textContent = `下載失敗：${error.message}`;
    } finally {
      busy = false;
      buttons.forEach(button => button.disabled = !art.normalize(input.value));
    }
  }

  buttons[0].addEventListener("click", () => {
    download(() => art.downloadSVG(input.value));
  });
  buttons[1].addEventListener("click", () => {
    download(() => art.downloadPNG(input.value, "png"));
  });
  buttons[2].addEventListener("click", () => {
    download(() => art.downloadCover(input.value));
  });
  window.addEventListener("pagehide", () => preview.destroy(), { once: true });
  refresh();
});
