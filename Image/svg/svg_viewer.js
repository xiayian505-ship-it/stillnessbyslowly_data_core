/* =============================================================
 * 慢慢軍火庫｜SVG Viewer v1.0.0
 * 職責：驗證與預覽本機 SVG、讀取尺寸、縮放及釋放暫時網址。
 * 不建立按鈕或網站外觀；SVG 一律顯示在 <img>，不執行來源腳本。
 * 依賴：SlowlyBlobURL（data/blob/blob_url.js）。
 * ============================================================= */
(function (global) {
    "use strict";

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const PROHIBITED_DECLARATION = /<!\s*(?:DOCTYPE|ENTITY)\b/i;
    const ANIMATION_ELEMENTS = new Set([
        "animate", "animatemotion", "animatetransform", "animatecolor", "set"
    ]);

    function assert_dependency() {
        if (!global.SlowlyBlobURL?.create || !global.SlowlyBlobURL?.revoke) {
            throw new Error("SVG Viewer 需要先載入 SlowlyBlobURL。");
        }
    }

    function parse_positive_length(value) {
        const match = /^(\d+(?:\.\d+)?|\.\d+)(?:px)?$/i.exec(String(value || "").trim());
        const number = match ? Number(match[1]) : NaN;
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function inspect_svg(svg_text, name = "image.svg", fallback_width = 800, fallback_height = 600) {
        if (typeof svg_text !== "string" || !svg_text.trim()) {
            throw new TypeError("SVG 原始碼不得為空。");
        }
        if (PROHIBITED_DECLARATION.test(svg_text)) {
            throw new Error("不接受含 DOCTYPE 或 ENTITY 宣告的 SVG。");
        }
        const parsed = new DOMParser().parseFromString(svg_text, "image/svg+xml");
        const root = parsed.documentElement;
        if (parsed.querySelector("parsererror") || root.localName !== "svg" || root.namespaceURI !== SVG_NAMESPACE) {
            throw new Error("內容不是有效的 SVG XML。");
        }
        const elements = [root, ...root.getElementsByTagName("*")];
        if (elements.some(element => element.localName.toLowerCase() === "script")) {
            throw new Error("不接受含 script 的 SVG。");
        }

        const view_box_values = (root.getAttribute("viewBox") || "")
            .trim().split(/[\s,]+/).map(Number);
        const valid_view_box = view_box_values.length === 4 &&
            view_box_values.every(Number.isFinite) &&
            view_box_values[2] > 0 && view_box_values[3] > 0;
        const declared_width = parse_positive_length(root.getAttribute("width"));
        const declared_height = parse_positive_length(root.getAttribute("height"));
        const animated_svg = elements.some(element => ANIMATION_ELEMENTS.has(element.localName.toLowerCase()));
        const animated_css = elements.some(element => {
            const css_text = element.localName.toLowerCase() === "style" ? element.textContent || "" : "";
            const inline_style = element.getAttribute("style") || "";
            return /@keyframes|\banimation(?:-name)?\s*:/i.test(css_text) ||
                /(?:^|;)\s*animation(?:-name)?\s*:/i.test(inline_style);
        });

        return {
            name,
            width: declared_width || (valid_view_box ? view_box_values[2] : fallback_width),
            height: declared_height || (valid_view_box ? view_box_values[3] : fallback_height),
            declared_width,
            declared_height,
            view_box: valid_view_box ? view_box_values.join(" ") : null,
            animated: animated_svg || animated_css,
            animation_type: animated_svg && animated_css ? "smil_css" : animated_svg ? "smil" : animated_css ? "css" : "none"
        };
    }

    function create(options = {}) {
        assert_dependency();
        const { image, stage, viewport, on_state } = options;
        if (!(image instanceof global.HTMLImageElement) || !stage || !viewport) {
            throw new TypeError("create() 需要 image（img）、stage 與 viewport DOM 元素。");
        }
        const maximum_bytes = options.maximum_bytes ?? 15 * 1024 * 1024;
        const minimum_zoom = options.minimum_zoom ?? 0.1;
        const maximum_zoom = options.maximum_zoom ?? 16;
        const padding = options.padding ?? 20;
        const maximum_rendered_dimension = options.maximum_rendered_dimension ?? 14000;
        if (!Number.isFinite(maximum_bytes) || maximum_bytes <= 0 ||
            !(minimum_zoom > 0) || !(maximum_zoom >= minimum_zoom) ||
            !Number.isFinite(padding) || padding < 0) {
            throw new RangeError("SVG Viewer 的尺寸或縮放設定無效。");
        }

        let current_url = null;
        let current_info = null;
        let zoom = 1;
        let request_number = 0;
        let destroyed = false;
        let observer = null;

        function notify(message = "", is_error = false) {
            if (typeof on_state === "function") {
                on_state({ info: get_info(), zoom, message, is_error });
            }
        }

        function release_url() {
            image.removeAttribute("src");
            image.hidden = true;
            if (current_url) {
                global.SlowlyBlobURL.revoke(current_url);
                current_url = null;
            }
        }

        function update_size() {
            if (!current_info || destroyed) return;
            const available_width = Math.max(1, viewport.clientWidth - padding * 2);
            const available_height = Math.max(1, viewport.clientHeight - padding * 2);
            const fitted_scale = Math.min(
                available_width / current_info.width,
                available_height / current_info.height
            );
            const rendered_width = Math.max(1, Math.min(
                maximum_rendered_dimension, Math.round(current_info.width * fitted_scale * zoom)
            ));
            const rendered_height = Math.max(1, Math.min(
                maximum_rendered_dimension, Math.round(current_info.height * fitted_scale * zoom)
            ));
            image.style.width = `${rendered_width}px`;
            image.style.height = `${rendered_height}px`;
            stage.style.width = `${Math.max(viewport.clientWidth, rendered_width + padding * 2)}px`;
            stage.style.height = `${Math.max(viewport.clientHeight, rendered_height + padding * 2)}px`;
        }

        function clear() {
            if (destroyed) return;
            request_number++;
            release_url();
            current_info = null;
            zoom = 1;
            image.style.width = "";
            image.style.height = "";
            stage.style.width = "";
            stage.style.height = "";
            notify("已清除預覽。");
        }

        async function load_text(svg_text, name = "image.svg") {
            if (destroyed) throw new Error("SVG Viewer 已銷毀。");
            const this_request = ++request_number;
            release_url();
            current_info = null;
            try {
                const bytes = new Blob([svg_text]).size;
                if (bytes > maximum_bytes) throw new Error("SVG 超過檔案大小限制。");
                const info = inspect_svg(svg_text, name, options.fallback_width ?? 800, options.fallback_height ?? 600);
                const url = global.SlowlyBlobURL.create(new Blob([svg_text], { type: "image/svg+xml" }));
                if (destroyed || this_request !== request_number) {
                    global.SlowlyBlobURL.revoke(url);
                    return null;
                }
                current_url = url;
                current_info = { ...info, bytes };
                zoom = 1;
                image.alt = name;
                image.hidden = false;
                image.src = current_url;
                update_size();
                viewport.scrollLeft = 0;
                viewport.scrollTop = 0;
                notify("SVG 已載入。");
                return get_info();
            } catch (error) {
                if (this_request === request_number) notify(error.message, true);
                throw error;
            }
        }

        async function open_file(file) {
            if (destroyed) throw new Error("SVG Viewer 已銷毀。");
            const file_request = ++request_number;
            if (!(file instanceof Blob) || typeof file.text !== "function") {
                throw new TypeError("open_file() 需要 SVG File 或 Blob。");
            }
            if (file.size > maximum_bytes) throw new Error("SVG 超過檔案大小限制。");
            if (file.type && file.type !== "image/svg+xml" &&
                !/\.svg$/i.test(file.name || "")) {
                throw new Error("只接受 SVG 檔案。");
            }
            const svg_text = await file.text();
            // 慢速檔案讀取完成時，不能覆蓋後來已載入的新預覽。
            if (destroyed || file_request !== request_number) return null;
            return load_text(svg_text, file.name || "image.svg");
        }

        function set_zoom(value) {
            if (destroyed) throw new Error("SVG Viewer 已銷毀。");
            if (!Number.isFinite(value) || value < minimum_zoom || value > maximum_zoom) {
                throw new RangeError(`縮放倍率必須在 ${minimum_zoom} ～ ${maximum_zoom} 之間。`);
            }
            zoom = value;
            update_size();
            notify("已更新縮放倍率。");
            return zoom;
        }

        function get_info() {
            return current_info ? { ...current_info } : null;
        }

        function on_image_error() {
            if (current_info) notify("瀏覽器無法顯示這份 SVG。", true);
        }

        image.addEventListener("error", on_image_error);
        if (typeof global.ResizeObserver === "function") {
            observer = new global.ResizeObserver(update_size);
            observer.observe(viewport);
        } else {
            global.addEventListener("resize", update_size);
        }

        function destroy() {
            if (destroyed) return;
            clear();
            destroyed = true;
            observer?.disconnect();
            if (!observer) global.removeEventListener("resize", update_size);
            image.removeEventListener("error", on_image_error);
        }

        return Object.freeze({ load_text, open_file, set_zoom, get_info, clear, destroy, update_size });
    }

    global.SlowlySVGViewer = Object.freeze({ version: "1.0.0", create, inspect_svg });
})(typeof window !== "undefined" ? window : globalThis);
