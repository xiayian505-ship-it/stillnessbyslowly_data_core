/* =============================================================
 * 慢慢軍火庫｜SVG Animation Frame Extractor v1.0.0
 * 職責：從受限 SVG 取得指定時間的 RGBA / Canvas 畫格。
 * 來源：慢慢藝術字站「動畫定格 → SVG 快照 → Canvas」流程。
 * CSS/SMIL 動畫以實際瀏覽器結果為準；不保證 path morph、
 * JavaScript 動畫、外部素材、所有濾鏡或所有瀏覽器結果一致。
 * 依賴：SlowlyBlobURL（建立及回收每一格的 SVG 影像網址）。
 * 不負責 GIF / PNG 編碼、影片錄製、下載及外觀。
 * ============================================================= */
(function (global) {
    "use strict";

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
    const MAXIMUM_SVG_CHARACTERS = 2_000_000;
    const MAXIMUM_ELEMENTS = 3500;
    const DEFAULT_MAXIMUM_FRAME_BYTES = 96 * 1024 * 1024;
    const RESTRICTED_TAGS = new Set([
        "script", "foreignobject", "iframe", "object", "embed", "audio", "video", "link"
    ]);
    const ANIMATION_TAGS = "animate, animateTransform, animateMotion, animateColor, set";
    const VISUAL_PROPERTIES = [
        "opacity", "display", "visibility", "color", "fill", "fill-opacity",
        "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray",
        "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
        "paint-order", "vector-effect", "filter", "clip-path", "mask",
        "font-family", "font-size", "font-weight", "font-style", "letter-spacing",
        "text-anchor", "dominant-baseline", "mix-blend-mode", "isolation",
        "stop-color", "stop-opacity", "flood-color", "flood-opacity",
        "transform", "transform-origin", "transform-box"
    ];

    function assert_dependency() {
        if (!global.SlowlyBlobURL?.create || !global.SlowlyBlobURL?.revoke) {
            throw new Error("SVG Frame Extractor 需要先載入 SlowlyBlobURL。");
        }
    }

    function parse_length(value) {
        const match = /^(\d+(?:\.\d+)?|\.\d+)(?:px)?$/i.exec(String(value || "").trim());
        const number = match ? Number(match[1]) : NaN;
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function validate_svg(svg_text) {
        if (typeof svg_text !== "string" || !svg_text.trim() ||
            svg_text.length > MAXIMUM_SVG_CHARACTERS) {
            throw new TypeError("SVG 必須為非空字串，且長度不得超過 200 萬字元。");
        }
        if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(svg_text)) {
            throw new Error("SVG 不接受 DOCTYPE 或 ENTITY 宣告。");
        }
        const parsed = new DOMParser().parseFromString(svg_text, "image/svg+xml");
        const root = parsed.documentElement;
        if (parsed.querySelector("parsererror") || root.localName !== "svg" ||
            root.namespaceURI !== SVG_NAMESPACE) {
            throw new Error("內容不是有效的 SVG XML。");
        }
        const descendants = Array.from(root.querySelectorAll("*"));
        if (descendants.length > MAXIMUM_ELEMENTS) {
            throw new Error("SVG 元素數量超過安全限制。");
        }

        // 不能把不可信來源的事件、外部網址或可執行元素插入宿主 DOM。
        // 這是「受限 SVG」輸入檢查，不宣稱是通用 SVG 安全清洗器。
        for (const element of [root, ...descendants]) {
            const element_name = element.localName.toLowerCase();
            if (element.namespaceURI !== SVG_NAMESPACE || RESTRICTED_TAGS.has(element_name)) {
                throw new Error(`不支援 SVG 元素：${element.localName}。`);
            }
            for (const attribute of Array.from(element.attributes)) {
                const name = attribute.name.toLowerCase();
                const value = attribute.value.trim();
                if (/^on[a-z]/.test(name)) {
                    throw new Error(`不允許事件屬性：${attribute.name}。`);
                }
                if (name === "href" || name === "xlink:href") {
                    if (!value.startsWith("#") &&
                        !/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
                        throw new Error("不支援外部連結、外部素材或腳本連結。");
                    }
                }
                // CSS 可以引用 SVG 內部的 #id，但不可發出任何網路請求。
                if (/url\s*\(/i.test(value) &&
                    /url\s*\(\s*['"]?(?!#)[^)]*\)/i.test(value)) {
                    throw new Error("CSS / SVG 屬性不得引用外部網址。");
                }
            }
            if (element_name === "style") {
                const css_text = element.textContent || "";
                if (/@import\b|@font-face\b|expression\s*\(|-moz-binding\b/i.test(css_text) ||
                    /url\s*\(\s*['"]?(?!#)[^)]*\)/i.test(css_text)) {
                    throw new Error("SVG 樣式不得載入外部資源。");
                }
            }
        }

        const box_values = (root.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
        const has_view_box = box_values.length === 4 && box_values.every(Number.isFinite) &&
            box_values[2] > 0 && box_values[3] > 0;
        const width = parse_length(root.getAttribute("width")) || (has_view_box ? box_values[2] : null);
        const height = parse_length(root.getAttribute("height")) || (has_view_box ? box_values[3] : null);
        if (!width || !height) {
            throw new Error("SVG 必須提供有效的 width / height 或 viewBox。");
        }
        if (!has_view_box) {
            root.setAttribute("viewBox", `0 0 ${width} ${height}`);
        }
        return { parsed, width, height };
    }

    function validate_capture_options(options, source_width, source_height) {
        const width = options.width ?? Math.round(source_width);
        const height = options.height ?? Math.round(source_height * width / source_width);
        const time_seconds = options.time_seconds ?? 0;
        if (!Number.isInteger(width) || !Number.isInteger(height) ||
            width < 1 || height < 1 || width > 4096 || height > 4096 ||
            width * height > 16_777_216) {
            throw new RangeError("影格寬高必須是 1～4096 的整數且不能超過 16777216 像素。");
        }
        if (!Number.isFinite(time_seconds) || time_seconds < 0 || time_seconds > 3600) {
            throw new RangeError("time_seconds 必須在 0～3600 秒之間。");
        }
        const background = options.background ?? "#ffffff";
        if (typeof background !== "string" ||
            !/^(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba)\([^)]{1,60}\)|[a-zA-Z]{1,30})$/.test(background)) {
            throw new TypeError("background 必須是基本 CSS 顏色值。");
        }
        return { width, height, time_seconds, transparent: options.transparent !== false, background };
    }

    function animated_value(element, name) {
        const property = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        if (["transform", "gradientTransform", "patternTransform"].includes(name)) {
            const list = element[property]?.animVal;
            if (list && Number.isInteger(list.numberOfItems)) {
                let combined = new global.DOMMatrix();
                for (let index = 0; index < list.numberOfItems; index++) {
                    combined = combined.multiply(list.getItem(index).matrix);
                }
                return `matrix(${combined.a} ${combined.b} ${combined.c} ${combined.d} ${combined.e} ${combined.f})`;
            }
        }
        if (name === "points" && element.animatedPoints) {
            const points = element.animatedPoints;
            return Array.from({ length: points.numberOfItems }, (_, index) => {
                const point = points.getItem(index);
                return `${point.x},${point.y}`;
            }).join(" ");
        }
        const value = element[property]?.animVal;
        if (typeof value === "number" || typeof value === "string") return String(value);
        if (value && (typeof value.value === "number" || typeof value.value === "string")) {
            return String(value.value);
        }
        return null;
    }

    function normalize_fragment_url(value) {
        // computed style 有時把 url(#mask) 轉為絕對網址；定格後必須還原 #id。
        const document_url = global.location?.href?.split("#")[0] || "";
        return String(value).replace(/url\(\s*['"]?([^)'"\s]+)#([^)'"\s]+)['"]?\s*\)/g,
            (match, source, fragment) => source === document_url ? `url(#${fragment})` : match);
    }

    function create(options = {}) {
        assert_dependency();
        const maximum_frame_bytes = options.maximum_frame_bytes ?? DEFAULT_MAXIMUM_FRAME_BYTES;
        if (!Number.isInteger(maximum_frame_bytes) || maximum_frame_bytes <= 0) {
            throw new RangeError("maximum_frame_bytes 必須是正整數。");
        }
        let source_root = null;
        let source_width = 0;
        let source_height = 0;
        let isolated_host = null;
        let busy = false;
        let destroyed = false;

        function require_loaded() {
            if (destroyed) throw new Error("SVG Frame Extractor 已銷毀。");
            if (!source_root) throw new Error("請先 load() 載入 SVG。");
        }

        function release_source() {
            isolated_host?.remove();
            isolated_host = null;
            source_root = null;
            source_width = 0;
            source_height = 0;
        }

        function load(svg_text) {
            if (destroyed) throw new Error("SVG Frame Extractor 已銷毀。");
            if (busy) throw new Error("擷取進行中，不能重新載入 SVG。");
            const { parsed, width, height } = validate_svg(svg_text);
            release_source();

            // 使用 ShadowRoot 隔離來源 SVG 的 <style>，不污染宿主 CSS。
            // 必須連到 DOM 才能讓瀏覽器實時計算 SMIL / CSS 動畫。
            isolated_host = document.createElement("div");
            isolated_host.style.cssText = [
                "all:initial", "position:fixed", "left:-30000px", "top:0",
                `width:${width}px`, `height:${height}px`, "overflow:hidden",
                "opacity:0", "pointer-events:none"
            ].join(";");
            const shadow_root = isolated_host.attachShadow({ mode: "closed" });
            source_root = document.importNode(parsed.documentElement, true);
            source_root.setAttribute("width", String(width));
            source_root.setAttribute("height", String(height));
            shadow_root.appendChild(source_root);
            document.body.appendChild(isolated_host);
            source_width = width;
            source_height = height;
            return get_info();
        }

        function get_info() {
            require_loaded();
            const animated = Boolean(source_root.querySelector(ANIMATION_TAGS)) ||
                Boolean(source_root.querySelector('[style*="animation"]')) ||
                Array.from(source_root.querySelectorAll("style")).some(
                    element => /@keyframes|\banimation(?:-name)?\s*:/i.test(element.textContent || "")
                );
            return { width: source_width, height: source_height, animated };
        }

        function freeze_frame() {
            const replica_root = source_root.cloneNode(true);
            const originals = [source_root, ...source_root.querySelectorAll("*")];
            const replicas = [replica_root, ...replica_root.querySelectorAll("*")];
            const replica_by_original = new Map(originals.map((element, index) => [element, replicas[index]]));

            for (let index = 0; index < originals.length; index++) {
                const original = originals[index];
                const replica = replicas[index];
                if (["animate", "animatetransform", "animatemotion", "animatecolor", "set"]
                    .includes(original.localName.toLowerCase())) continue;
                const style = global.getComputedStyle(original);
                for (const property of VISUAL_PROPERTIES) {
                    const computed_value = style.getPropertyValue(property);
                    if (computed_value && computed_value !== "normal" && computed_value !== "initial") {
                        replica.style.setProperty(property, normalize_fragment_url(computed_value), "important");
                    }
                }
                replica.style.setProperty("animation", "none", "important");
                replica.style.setProperty("transition", "none", "important");
            }

            for (const animation of source_root.querySelectorAll("animate, animateTransform, set")) {
                const attribute_name = animation.getAttribute("attributeName") ||
                    (animation.localName === "animateTransform" ? "transform" : "");
                if (!attribute_name) continue;
                const reference = animation.getAttribute("href") || animation.getAttributeNS(XLINK_NAMESPACE, "href");
                let source_target = animation.parentElement;
                if (reference?.startsWith("#")) {
                    source_target = Array.from(source_root.querySelectorAll("[id]")).find(
                        element => element.id === reference.slice(1)
                    );
                }
                const replica_target = replica_by_original.get(source_target);
                if (!replica_target) continue;
                let value = animated_value(source_target, attribute_name);
                if (value === null) {
                    value = global.getComputedStyle(source_target).getPropertyValue(attribute_name) || null;
                }
                if (value !== null) {
                    replica_target.setAttribute(attribute_name, normalize_fragment_url(value));
                    if (VISUAL_PROPERTIES.includes(attribute_name)) {
                        replica_target.style.setProperty(attribute_name, normalize_fragment_url(value), "important");
                    }
                }
            }
            for (const animation of replica_root.querySelectorAll(ANIMATION_TAGS)) animation.remove();
            replica_root.setAttribute("xmlns", SVG_NAMESPACE);
            replica_root.setAttribute("width", String(source_width));
            replica_root.setAttribute("height", String(source_height));
            return new XMLSerializer().serializeToString(replica_root);
        }

        async function image_from_svg(svg_text) {
            const url = global.SlowlyBlobURL.create(new Blob([svg_text], { type: "image/svg+xml;charset=utf-8" }));
            try {
                const image = new Image();
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = () => reject(new Error("SVG 定格影像無法載入 Canvas。"));
                    image.src = url;
                });
                return image;
            } finally {
                global.SlowlyBlobURL.revoke(url);
            }
        }

        async function capture_internal(options = {}) {
            const capture_options = validate_capture_options(options, source_width, source_height);
            const { width, height, time_seconds, transparent, background } = capture_options;
            // SVG SMIL 時間線通常要經過一次瀏覽器繪製循環才會初始化。
            // 在剛載入後立刻 seek，部分瀏覽器會取得錯誤的起始影格。
            await new Promise(resolve => global.requestAnimationFrame(resolve));
            source_root.pauseAnimations?.();
            const css_animations = source_root.getAnimations?.({ subtree: true }) || [];
            for (const animation of css_animations) animation.pause();
            source_root.setCurrentTime?.(time_seconds);
            for (const animation of css_animations) {
                try { animation.currentTime = time_seconds * 1000; }
                catch { /* 部分 CSS 動畫不接受直接 seek；如實記錄支援限制。 */ }
            }
            const frozen_svg = freeze_frame();
            const image = await image_from_svg(frozen_svg);
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) throw new Error("無法取得 Canvas 2D 繪圖環境。");
            if (!transparent) {
                context.fillStyle = background;
                context.fillRect(0, 0, width, height);
            }
            context.drawImage(image, 0, 0, width, height);
            const pixels = new Uint8ClampedArray(context.getImageData(0, 0, width, height).data);
            return { canvas, pixels, width, height, time_seconds };
        }

        async function capture(options = {}) {
            require_loaded();
            if (busy) throw new Error("已有影格擷取工作在執行。");
            busy = true;
            try {
                return await capture_internal(options);
            } finally {
                busy = false;
            }
        }

        async function capture_frames(options = {}) {
            require_loaded();
            if (busy) throw new Error("已有影格擷取工作在執行。");
            const duration_seconds = options.duration_seconds;
            const frames_per_second = options.frames_per_second;
            if (!Number.isFinite(duration_seconds) || duration_seconds <= 0 || duration_seconds > 60 ||
                !Number.isInteger(frames_per_second) || frames_per_second < 1 || frames_per_second > 60) {
                throw new RangeError("duration_seconds 需為 0～60 秒；frames_per_second 需為 1～60 整數。");
            }
            const dimensions = validate_capture_options(options, source_width, source_height);
            const frame_count = Math.ceil(duration_seconds * frames_per_second);
            if (dimensions.width * dimensions.height * 4 * frame_count > maximum_frame_bytes) {
                throw new RangeError("影格總記憶體超過 maximum_frame_bytes 限制。");
            }
            busy = true;
            const frames = [];
            try {
                for (let frame_index = 0; frame_index < frame_count; frame_index++) {
                    if (options.signal?.aborted) throw new Error("SVG 影格擷取已取消。");
                    const frame = await capture_internal({
                        ...options, time_seconds: frame_index / frames_per_second
                    });
                    frames.push(frame.pixels);
                    options.on_progress?.((frame_index + 1) / frame_count);
                }
                return { frames, width: dimensions.width, height: dimensions.height, frames_per_second };
            } finally {
                busy = false;
            }
        }

        function destroy() {
            if (busy) throw new Error("擷取進行中；請先等候或取消後再銷毀。");
            if (destroyed) return;
            release_source();
            destroyed = true;
        }

        return Object.freeze({ load, get_info, capture, capture_frames, destroy });
    }

    global.SlowlySVGAnimationFrameExtractor = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
