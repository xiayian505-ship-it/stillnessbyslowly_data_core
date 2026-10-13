"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const results = document.querySelector("#results");
  const summary = document.querySelector("#summary");
  let passed = 0;
  let failed = 0;

  function test(label, condition) {
    const ok = Boolean(condition);
    const li = document.createElement("li");
    li.textContent = `${ok ? "PASS" : "FAIL"}：${label}`;
    li.className = ok ? "pass" : "fail";
    results.append(li);
    if (ok) {
      passed += 1;
    } else {
      failed += 1;
    }
  }
  async function expectError(callback) {
    try {
      await callback();
      return false;
    } catch (error) {
      return error instanceof Error;
    }
  }

  try {
    const core = window.SlowlyTextGeneratorCore;
    const family = window.SlowlyVerticalTextGenerator;
    test("core 已載入", !!core?.create);
    test("直式獨立完成品已載入", !!family?.create);
    test("舊 v1 全域名稱未被覆寫", window.SlowlyTextGenerator?.version === "1.0.0");
    test("Unicode 組合字素正常", core.splitCharacters("a\u0301").length === 1);
    test("表情符號不被拆散", core.splitCharacters("👩‍💻").length === 1);
    test("XML 跳脫正常", core.escapeXML("&<") === "&amp;&lt;");

    const art = family.create({
      maxChars: 4,
      sourceSize: { width: 720, height: 1100 },
      renderSVG(text, helpers, layout) {
        const glyphs = helpers.splitCharacters(text).map((char, index) => {
          const slot = layout.slots[index];
          return `<circle cx="${slot.x}" cy="${slot.y}" r="35" fill="#333"/>`;
        }).join("");
        return `<svg xmlns="http://www.w3.org/2000/svg" ` +
          `width="720" height="1100" viewBox="0 0 720 1100">` +
          `${glyphs}</svg>`;
      },
      presets: {
        png: { scale: 2 },
        cover: { width: 700, height: 1000, fit: "contain", paddingX: 40, paddingY: 40 }
      }
    });

    test("四字正常", art.normalize("穿林打葉") === "穿林打葉");
    test("超過四字截斷", art.normalize("穿林打葉風起") === "穿林打葉");
    test("二字正常", art.layout("春風").slots.length === 2);
    test("單字位於中央", art.layout("林").slots[0].x === 720 / 2 && art.layout("林").slots[0].y === 1100 / 2);
    test("四字字位符合直式順序", art.layout("穿林打葉").slots.every((s, i, arr) => i === 0 || s.y > arr[i - 1].y));
    test("方向標籤正確", art.layout("林").orientation === "vertical");
    test("SVG 可生成", art.generateSVG("春風").startsWith("<svg "));
    test("PNG 倍率尺寸", art.formatSize("春風", "png").width === 1440);
    const coverSize = art.formatSize("春風", "cover");
    test("封面尺寸", coverSize.width === 700 && coverSize.height === 1000);
    test("空輸入拋錯", await expectError(() => art.generateSVG("   ")));
    test("非法尺寸拋錯", await expectError(() => family.create({
      sourceSize: { width: 0, height: 120 },
      renderSVG: () => "<svg></svg>"
    }).sourceSize("字")));
    test("字位數不符拋錯", await expectError(() => family.create({
      sourceSize: { width: 200, height: 200 },
      getPositions: () => [],
      renderSVG: () => "<svg></svg>"
    }).generateSVG("文字")));

    const custom = family.create({
      sourceSize: { width: 320, height: 260 },
      getPositions: () => [{ x: 61, y: 83 }],
      renderSVG(text, helpers, layout) {
        const slot = layout.slots[0];
        return `<svg xmlns="http://www.w3.org/2000/svg">
          <circle cx="${slot.x}" cy="${slot.y}" r="8"/>
        </svg>`;
      }
    });
    test("自訂字位不被覆寫", custom.layout("字").slots[0].x === 61 && custom.layout("字").slots[0].y === 83);

    const img = document.createElement("img");
    const preview = art.createPreview(img);
    preview.set("春風");
    test("預覽 URL 已建立", img.src.startsWith("blob:"));
    preview.clear();
    test("預覽清空釋放 src", !img.hasAttribute("src"));
    preview.destroy();
    test("銷毀後禁止 set", await expectError(() => preview.set("春風")));

    const png = await art.pngBlob("穿林打葉", "png");
    const image = await createImageBitmap(png.blob);
    test("高清 PNG 畫素正確", image.width === 1440 && image.height === 2200);
    image.close?.();

    const cover = await art.pngBlob("穿林打葉", "cover");
    const coverImage = await createImageBitmap(cover.blob);
    test("書封 PNG 700×1000", coverImage.width === 700 && coverImage.height === 1000);
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(coverImage, 0, 0);
    const corner = ctx.getImageData(0, 0, 1, 1).data;
    test("書封透明背景", corner[3] === 0);
    coverImage.close?.();

    const noConverter = window.SlowlyCanvasPNG;
    try {
      window.SlowlyCanvasPNG = undefined;
      test("缺少 PNG 零件會報錯", await expectError(() => art.pngBlob("字")));
    } finally {
      window.SlowlyCanvasPNG = noConverter;
    }
    const placement = core.computePlacement(
      { width: 1200, height: 600 },
      { width: 700, height: 1000 },
      { fit: "contain" }
    );
    test("contain 保留原始比例", Math.abs(placement.width / placement.height - 2) < 1e-10);

  } catch (error) {
    console.error(error);
    test(`未預期錯誤：${error.message}`, false);
  }
  summary.textContent = `${passed} 通過，${failed} 失敗`;
  window.__testsDone = true;
  window.__testsPassed = passed;
  window.__testsFailed = failed;
});
