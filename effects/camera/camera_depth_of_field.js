/* =========================================================
   慢慢軍火庫｜Camera Depth of Field v1.0.0
   簡易景深近似計算。只計算模糊量，或暫時套用 Canvas filter。
   焦距 depth 使用宿主世界單位；blur 回傳 Canvas CSS 像素。
========================================================= */
(function (global) {
    "use strict";

    function requireFinite(value, name) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new TypeError("CameraDepthOfField: " + name + " 必須是有限數字。");
        }
        return value;
    }

    function calculateBlur(object_depth, focus_depth, options = {}) {
        if (options.enabled === false || focus_depth === null || focus_depth === undefined) return 0;
        const depth = requireFinite(object_depth, "object_depth");
        const focus = requireFinite(focus_depth, "focus_depth");
        const strength = requireFinite(options.strength === undefined ? 0.02 : options.strength, "strength");
        const max_blur = requireFinite(options.max_blur === undefined ? 7 : options.max_blur, "max_blur");
        const threshold = requireFinite(options.threshold === undefined ? 0.3 : options.threshold, "threshold");
        if (depth < 0 || focus < 0 || strength < 0 || max_blur < 0 || threshold < 0) {
            throw new RangeError("CameraDepthOfField: 深度、倍率、最大模糊量和門檻不可為負。");
        }
        const blur = Math.min(max_blur, Math.abs(depth - focus) * strength);
        return blur > threshold ? blur : 0;
    }

    function withContext(context, blur_pixels, draw) {
        if (!context || typeof context.save !== "function" || typeof context.restore !== "function") {
            throw new TypeError("CameraDepthOfField: 需要 Canvas 2D context。");
        }
        if (typeof draw !== "function") {
            throw new TypeError("CameraDepthOfField: draw 必須是繪圖回呼函式。");
        }
        const blur = requireFinite(blur_pixels, "blur_pixels");
        if (blur < 0) throw new RangeError("CameraDepthOfField: blur_pixels 不可為負。");
        context.save();
        try {
            // 舊瀏覽器沒有 filter 時直接畫清晰畫面，不阻止宿主繪圖。
            if (typeof context.filter === "string") {
                context.filter = blur > 0 ? "blur(" + blur + "px)" : "none";
            }
            return draw(context);
        } finally {
            context.restore();
        }
    }

    global.SlowlyCameraDepthOfField = Object.freeze({
        version: "1.0.0", calculateBlur, withContext
    });
})(typeof window !== "undefined" ? window : globalThis);
