"use strict";
window.addEventListener("DOMContentLoaded", async () => {
  const results = document.querySelector("#results");
  const summary = document.querySelector("#summary");
  let count = 0, failed = 0;
  function test(name, condition) {
    count++;
    const li = document.createElement("li");
    if (condition) li.className = "pass"; else {
      failed++;
      li.className = "fail";
    }
    li.textContent = `${condition ? "PASS" : "FAIL"}：${name}`;
    results.append(li);
  }
  try {
    const engine = window.SlowlyTextGenerator;
    test("軍火庫完成品成功載入", !!engine?.create);
    test("基本字素分割", engine.splitCharacters("電閃雷鳴").length === 4);
    test("組合字素不可錯誤拆開", engine.splitCharacters("a\u0301").length === 1);
    test("字元 XML 安全處理", engine.escapeXML("&<\"") === "&amp;&lt;&quot;");
    const art = engine.create({
      maxChars: 3,
      sourceSize: txt => ({ width: 300, height: engine.splitCharacters(txt).length * 250 }),
      renderSVG: (txt, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="${h.splitCharacters(txt).length * 250}" viewBox="0 0 300 ${h.splitCharacters(txt).length * 250}"><rect x="80" y="40" width="100" height="140" fill="red"/><text x="80" y="200" fill="white">${h.escapeXML(txt)}</text></svg>`,
      presets: {
        png: { scale: 2 },
        cover: { width: 700, height: 1000, fit: "contain", paddingX: 45, paddingY: 32 }
      }
    });
    test("上限由宿主決定", art.normalize("電閃雷鳴") === "電閃雷");
    test("動態來源尺寸", art.sourceSize("電閃").height === 500);
    test("兩倍輸出依動態尺寸", art.formatSize("電閃", "png").height === 1000);
    test("書封固定 700x1000", art.formatSize("電閃雷鳴", "cover").width === 700 && art.formatSize("電閃雷鳴", "cover").height === 1000);
    const { blob, width, height } = await art.pngBlob("電閃雷鳴", "cover");
    test("Blob 為 PNG 格式", blob.type === "image/png" && blob.size > 0);
    const image = await createImageBitmap(blob);
    test("實際 PNG 像素為 700x1000", image.width === 700 && image.height === 1000 && width === 700 && height === 1000);
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const a = ctx.getImageData(0, 0, 1, 1).data, b = ctx.getImageData(350, 200, 1, 1).data;
    test("透明書封背景存在", a[3] === 0);
    test("輸出中心含圖像", b[3] > 0);
    image.close?.();
  } catch (error) {
    test(`未預期例外：${error.message}`, false);
    console.error(error);
  }
  summary.textContent = `${count - failed}/${count} 通過${failed ? '（請檢查錯誤）' : '，全部通過'}`;
  window.__testsDone = true;
  window.__testsFailed = failed;
});
