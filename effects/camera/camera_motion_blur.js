/* =========================================================
   慢慢軍火庫｜Camera Motion Blur v1.0.0
   以 Canvas 暫存圖像做多次偏移疊圖；不控制攝影機本身。
   每個實例擁有自己的緩衝畫布，避免多宿主互相影響。
========================================================= */
(function (global) {
    "use strict";

    function positiveInteger(value, name) {
        if (!Number.isInteger(value) || value < 2 || value > 64) {
            throw new RangeError("CameraMotionBlur: " + name + " 必須介於 2 至 64 的整數。");
        }
        return value;
    }

    function create(options = {}) {
        const create_canvas = options.canvas_factory || (() => global.document.createElement("canvas"));
        if (typeof create_canvas !== "function") {
            throw new TypeError("CameraMotionBlur: canvas_factory 必須是函式。");
        }
        const default_samples = positiveInteger(options.sample_count === undefined ? 8 : options.sample_count, "sample_count");
        const buffer = create_canvas();
        if (!buffer || typeof buffer.getContext !== "function") {
            throw new TypeError("CameraMotionBlur: canvas_factory 必須回傳 Canvas。");
        }
        const buffer_context = buffer.getContext("2d");
        if (!buffer_context) throw new Error("CameraMotionBlur: 無法建立 Canvas 2D 暫存 context。");
        let destroyed = false;

        function apply(canvas, blur_pixels, settings = {}) {
            if (destroyed) throw new Error("CameraMotionBlur: 此實例已 destroy。");
            if (!canvas || typeof canvas.getContext !== "function") {
                throw new TypeError("CameraMotionBlur: canvas 必須是 Canvas 元素。");
            }
            if (typeof blur_pixels !== "number" || !Number.isFinite(blur_pixels) || blur_pixels < 0) {
                throw new RangeError("CameraMotionBlur: blur_pixels 必須是非負有限數字。");
            }
            const width = canvas.width;
            const height = canvas.height;
            if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
                throw new RangeError("CameraMotionBlur: Canvas 必須有有效的正整數尺寸。");
            }
            const direction = settings.direction === undefined ? "horizontal" : settings.direction;
            if (direction !== "horizontal" && direction !== "vertical") {
                throw new RangeError("CameraMotionBlur: direction 只能是 horizontal 或 vertical。");
            }
            const sample_count = settings.sample_count === undefined
                ? default_samples
                : positiveInteger(settings.sample_count, "sample_count");
            if (blur_pixels === 0) return false;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("CameraMotionBlur: 無法取得 Canvas 2D context。");

            if (buffer.width !== width || buffer.height !== height) {
                buffer.width = width;
                buffer.height = height;
            }
            buffer_context.save();
            try {
                // 採樣的是宿主已繪好的最終像素，不應受宿主 transform 影響。
                buffer_context.setTransform(1, 0, 0, 1, 0, 0);
                buffer_context.globalAlpha = 1;
                buffer_context.globalCompositeOperation = "source-over";
                buffer_context.clearRect(0, 0, width, height);
                buffer_context.drawImage(canvas, 0, 0);
            } finally {
                buffer_context.restore();
            }

            context.save();
            try {
                context.setTransform(1, 0, 0, 1, 0, 0);
                context.globalCompositeOperation = "source-over";
                context.globalAlpha = 1;
                context.filter = "none";
                context.clearRect(0, 0, width, height);
                // 累積平均：第 n 次疊圖用 1/n，確保各樣本最終權重一致。
                for (let index = 0; index < sample_count; index += 1) {
                    const offset = (index / (sample_count - 1) - 0.5) * blur_pixels;
                    context.globalAlpha = 1 / (index + 1);
                    const offset_x = direction === "horizontal" ? offset : 0;
                    const offset_y = direction === "vertical" ? offset : 0;
                    context.drawImage(buffer, offset_x, offset_y);
                }
            } finally {
                context.restore();
            }
            return true;
        }

        function destroy() {
            if (destroyed) return;
            destroyed = true;
            buffer.width = 0;
            buffer.height = 0;
        }

        return Object.freeze({ apply, destroy });
    }

    global.SlowlyCameraMotionBlur = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
