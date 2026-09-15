/* 慢慢的倉庫｜UI / Ruler｜Millimeter Ruler v1.0.0
   建立使用 CSS mm 單位定位的實體毫米刻度尺。
   不綁 QRCode、不綁列印版型。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function positive(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new RangeError(name + " must be > 0.");
    }
    return number;
  }

  function pxToMm(px, dpi = 96) {
    return Number(px) * 25.4 / positive(dpi, "dpi");
  }

  function mmToPx(mm, dpi = 96) {
    return Number(mm) * positive(dpi, "dpi") / 25.4;
  }

  function create(options = {}) {
    const orientation =
      options.orientation === "vertical"
        ? "vertical"
        : "horizontal";

    const lengthMm = Math.max(
      0,
      Math.floor(Number(options.lengthMm ?? 100))
    );

    const majorEvery = Math.max(
      1,
      Math.floor(Number(options.majorEvery ?? 10))
    );

    const mediumEvery = Math.max(
      1,
      Math.floor(Number(options.mediumEvery ?? 5))
    );

    const doc = options.document || global.document;

    if (!doc || typeof doc.createElement !== "function") {
      throw new Error("MillimeterRuler.create() requires a document.");
    }

    const prefix = String(options.classPrefix || "mm-ruler");

    const ruler = doc.createElement("div");
    ruler.className =
      prefix + " " +
      prefix + "--" + orientation;

    ruler.dataset.orientation = orientation;
    ruler.dataset.lengthMm = String(lengthMm);

    for (let mm = 0; mm <= lengthMm; mm += 1) {
      const tick = doc.createElement("div");
      tick.className = prefix + "__tick";

      const major = mm % majorEvery === 0;
      const medium = !major && mm % mediumEvery === 0;

      tick.dataset.mm = String(mm);
      tick.dataset.level = major ? "major" : medium ? "medium" : "minor";

      if (orientation === "horizontal") {
        tick.style.left = mm + "mm";
        tick.style.height = major ? "5mm" : medium ? "3.5mm" : "2mm";
      } else {
        tick.style.top = mm + "mm";
        tick.style.width = major ? "5mm" : medium ? "3.5mm" : "2mm";
      }

      ruler.appendChild(tick);

      if (major) {
        const label = doc.createElement("div");
        label.className = prefix + "__label";
        label.dataset.mm = String(mm);
        label.textContent = String(mm / majorEvery);

        if (orientation === "horizontal") {
          label.style.left = mm + "mm";
        } else {
          label.style.top = mm + "mm";
        }

        ruler.appendChild(label);
      }
    }

    return ruler;
  }

  global.MillimeterRuler = Object.freeze({
    version: VERSION,
    pxToMm,
    mmToPx,
    create
  });

})(typeof window !== "undefined" ? window : globalThis);
