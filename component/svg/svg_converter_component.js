/* =============================================================
 * 慢慢軍火庫｜SVG Converter Component v1.0.0
 * 完成品：SVG 預覽、單幀 PNG、動畫 GIF、Canvas 影片輸出。
 *
 * 所有 SVG 解析、影格擷取、GIF 編碼、PNG 編碼、錄影與 Blob URL
 * 都交由軍火庫既有公開零件。此檔只負責表單、流程、生命週期及資料傳遞。
 *
 * 宿主可以覆蓋 CSS、操作選項與回呼；不綁定慢慢藝術字站。
 * ============================================================= */
(function (global) {
    "use strict";

    const DEFAULT_SETTINGS = Object.freeze({
        maximum_upload_bytes: 8 * 1024 * 1024,
        maximum_frame_bytes: 96 * 1024 * 1024,
        maximum_output_dimension: 2048,
        width: 480,
        frames_per_second: 10,
        duration_seconds: 2,
        transparent: true,
        background: "#ffffff",
        zoom: 1,
        show_controls: true
    });

    const ACTIVE_INSTANCES = new WeakMap();

    const REQUIRED_DEPENDENCIES = Object.freeze([
        ["SlowlyBlobURL", ["create", "revoke"]],
        ["FilenameSanitize", ["sanitize"]],
        ["SlowlySVGViewer", ["create"]],
        ["SlowlySVGAnimationFrameExtractor", ["create"]],
        ["SlowlyCanvasPNG", ["toBlob"]],
        ["SlowlyGIFEncoder", ["encode"]],
        ["SlowlyCanvasVideoExport", ["create", "get_supported_formats"]],
        ["SlowlyVideoRecorderMime", ["choose"]],
        ["SlowlyVideoMediaRecorder", ["create", "start", "stop"]],
        ["SlowlyVideoRecordedChunks", ["create"]]
    ]);

    function verify_dependencies() {
        for (const [name, methods] of REQUIRED_DEPENDENCIES) {
            if (!global[name] || methods.some(method => typeof global[name][method] !== "function")) {
                throw new Error(`SVG Converter Component 缺少軍火庫依賴：${name}。請先按使用說明載入。`);
            }
        }
    }

    function resolve_root(target) {
        const element = typeof target === "string" ? document.querySelector(target) : target;
        if (!(element instanceof global.HTMLElement)) {
            throw new TypeError("mount() 需要有效的 HTMLElement 或 CSS 選擇器。");
        }
        return element;
    }

    function positive_integer(value, name, maximum) {
        const number = Number(value);
        if (!Number.isInteger(number) || number < 1 || number > maximum) {
            throw new RangeError(`${name} 必須是 1～${maximum} 的整數。`);
        }
        return number;
    }

    function finite_positive(value, name, maximum) {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0 || number > maximum) {
            throw new RangeError(`${name} 必須大於 0 且不超過 ${maximum}。`);
        }
        return number;
    }

    function normalize_settings(options) {
        const settings = { ...DEFAULT_SETTINGS, ...options };
        positive_integer(settings.maximum_upload_bytes, "maximum_upload_bytes", 50 * 1024 * 1024);
        positive_integer(settings.maximum_frame_bytes, "maximum_frame_bytes", 512 * 1024 * 1024);
        positive_integer(settings.maximum_output_dimension, "maximum_output_dimension", 4096);
        positive_integer(settings.width, "width", settings.maximum_output_dimension);
        positive_integer(settings.frames_per_second, "frames_per_second", 60);
        finite_positive(settings.duration_seconds, "duration_seconds", 60);
        finite_positive(settings.zoom, "zoom", 16);
        if (typeof settings.background !== "string") {
            throw new TypeError("background 必須是顏色字串。");
        }
        for (const name of ["on_state", "on_export", "on_error"]) {
            if (settings[name] !== undefined && typeof settings[name] !== "function") {
                throw new TypeError(`${name} 必須是函式。`);
            }
        }
        return settings;
    }

    function mount(target, options = {}) {
        verify_dependencies();
        const root = resolve_root(target);
        if (ACTIVE_INSTANCES.has(root)) {
            throw new Error("同一個容器已有 SVG Converter Component 實例，請先 destroy()。");
        }
        const settings = normalize_settings(options);

        // 完成品對 root 的內容有管理權；宿主可將 root 放在任意自定義容器。
        root.classList.add("sbs-svg-converter");
        root.innerHTML = `
            <div class="sbs-svg-converter__controls">
                <label>SVG 檔案 <input data-role="file" type="file" accept=".svg,image/svg+xml"></label>
                <button data-role="clear" type="button">清除</button>
                <button data-role="replay" type="button">重新播放預覽</button>
                <label>縮放
                    <input data-role="zoom" type="range" min="0.25" max="4" step="0.25" value="1">
                    <output data-role="zoom-value">100%</output>
                </label>
            </div>
            <div class="sbs-svg-converter__workspace">
                <div class="sbs-svg-converter__viewport" data-role="viewport">
                    <div class="sbs-svg-converter__stage" data-role="stage">
                        <img data-role="image" alt="SVG 預覽" hidden>
                    </div>
                </div>
                <div class="sbs-svg-converter__settings">
                    <label>輸出寬度（px） <input data-role="width" type="number" min="1" max="4096" step="1"></label>
                    <label>動畫秒數 <input data-role="duration" type="number" min="0.1" max="60" step="0.1"></label>
                    <label>每秒影格（FPS） <input data-role="fps" type="number" min="1" max="60" step="1"></label>
                    <label>PNG 取樣時間（秒） <input data-role="time" type="number" min="0" max="3600" step="0.1" value="0"></label>
                    <label><input data-role="transparent" type="checkbox">透明背景</label>
                    <label>不透明背景色 <input data-role="background" type="color"></label>
                    <label>影片格式 <select data-role="format"><option value="webm">WebM</option><option value="mp4">MP4</option></select></label>
                    <div class="sbs-svg-converter__actions">
                        <button data-role="png" type="button">輸出 PNG</button>
                        <button data-role="gif" type="button">輸出 GIF</button>
                        <button data-role="video" type="button">輸出影片</button>
                        <button data-role="cancel" type="button">取消輸出</button>
                    </div>
                    <progress data-role="progress" max="1" value="0"></progress>
                    <output data-role="status" role="status" aria-live="polite">請選擇 SVG 檔案。</output>
                    <pre data-role="info"></pre>
                    <div data-role="result" class="sbs-svg-converter__result"></div>
                </div>
            </div>
        `;

        const refs = Object.fromEntries(Array.from(root.querySelectorAll("[data-role]")).map(
            element => [element.dataset.role, element]
        ));
        if (settings.show_controls === false) refs.settings?.classList.add("sbs-svg-converter__hidden");

        refs.width.value = String(settings.width);
        refs.duration.value = String(settings.duration_seconds);
        refs.fps.value = String(settings.frames_per_second);
        refs.transparent.checked = settings.transparent;
        refs.background.value = /^#[0-9a-fA-F]{6}$/.test(settings.background) ? settings.background : "#ffffff";
        refs.zoom.value = String(Math.min(4, Math.max(0.25, settings.zoom)));
        refs["zoom-value"].textContent = `${Math.round(Number(refs.zoom.value) * 100)}%`;

        const supported_video_formats = global.SlowlyCanvasVideoExport.get_supported_formats();
        refs.format.querySelectorAll("option").forEach(option => {
            option.disabled = !supported_video_formats[option.value];
        });
        const first_video_format = Object.keys(supported_video_formats).find(
            format => supported_video_formats[format]
        );
        if (first_video_format) refs.format.value = first_video_format;

        let svg_text = null;
        let svg_info = null;
        let source_name = "image.svg";
        let export_available = false;
        let busy_action = null;
        let active_operation = null;
        let abort_controller = null;
        let video_recorder = null;
        let output_url = null;
        let destroyed = false;
        let source_generation = 0;
        const event_listeners = [];
        const extractor = global.SlowlySVGAnimationFrameExtractor.create({
            maximum_frame_bytes: settings.maximum_frame_bytes
        });
        const viewer = global.SlowlySVGViewer.create({
            image: refs.image,
            stage: refs.stage,
            viewport: refs.viewport,
            maximum_bytes: settings.maximum_upload_bytes,
            maximum_zoom: 16,
            on_state(snapshot) {
                if (snapshot.is_error) set_status(snapshot.message, true);
            }
        });

        function listen(element, event_name, handler) {
            element.addEventListener(event_name, handler);
            event_listeners.push([element, event_name, handler]);
        }

        function ensure_alive() {
            if (destroyed) throw new Error("SVG Converter Component 已銷毀。");
        }

        function set_status(message, is_error = false) {
            refs.status.textContent = message;
            refs.status.dataset.error = String(is_error);
            if (is_error) settings.on_error?.(new Error(message));
        }

        function get_state() {
            return {
                file_name: svg_info?.name || null,
                info: svg_info ? { ...svg_info } : null,
                export_available,
                busy_action,
                zoom: Number(refs.zoom.value),
                supported_video_formats: { ...supported_video_formats }
            };
        }

        function notify_state() {
            settings.on_state?.(get_state());
        }

        function update_controls() {
            const has_file = Boolean(svg_info);
            const can_export = has_file && export_available && !busy_action;
            refs.png.disabled = !can_export;
            refs.gif.disabled = !can_export;
            refs.video.disabled = !can_export || !first_video_format;
            refs.replay.disabled = !has_file || Boolean(busy_action);
            refs.clear.disabled = Boolean(busy_action);
            refs.file.disabled = Boolean(busy_action);
            refs.cancel.disabled = !busy_action;
            refs.zoom.disabled = !has_file;
        }

        function show_info() {
            if (!svg_info) {
                refs.info.textContent = "";
                return;
            }
            const type = svg_info.animation_type === "none" ? "靜態" : svg_info.animation_type;
            refs.info.textContent = [
                `檔案：${svg_info.name}`,
                `尺寸：${svg_info.width} × ${svg_info.height}`,
                `動畫：${type}`,
                `轉檔：${export_available ? "可用" : "此 SVG 僅可預覽"}`
            ].join("\n");
        }

        function cleanup_output() {
            refs.result.replaceChildren();
            if (output_url) {
                global.SlowlyBlobURL.revoke(output_url);
                output_url = null;
            }
        }

        function output_filename(extension) {
            const base_name = source_name.replace(/\.svg$/i, "");
            return `${global.FilenameSanitize.sanitize(base_name, { fallback: "svg_export" })}.${extension}`;
        }

        function present_output(blob, extension, mime_type) {
            cleanup_output();
            output_url = global.SlowlyBlobURL.create(blob);
            const download_link = document.createElement("a");
            download_link.href = output_url;
            download_link.download = output_filename(extension);
            download_link.textContent = `下載 ${extension.toUpperCase()}（${Math.round(blob.size / 1024)} KiB）`;
            refs.result.appendChild(download_link);
            if (mime_type.startsWith("image/")) {
                const image_preview = document.createElement("img");
                image_preview.alt = "匯出預覽";
                image_preview.src = output_url;
                refs.result.appendChild(image_preview);
            } else if (mime_type.startsWith("video/")) {
                const video_preview = document.createElement("video");
                video_preview.controls = true;
                video_preview.src = output_url;
                refs.result.appendChild(video_preview);
            }
            settings.on_export?.({ blob, extension, mime_type, file_name: download_link.download });
        }

        function read_export_options() {
            const width = positive_integer(refs.width.value, "輸出寬度", Math.min(settings.maximum_output_dimension, 4096));
            if (!svg_info) throw new Error("請先載入 SVG。");
            const height = Math.max(1, Math.round(width * svg_info.height / svg_info.width));
            if (height > settings.maximum_output_dimension) {
                throw new RangeError("依 SVG 長寬比換算的輸出高度超過最大限制，請縮小寬度。");
            }
            return {
                width,
                height,
                duration_seconds: finite_positive(refs.duration.value, "動畫秒數", 60),
                frames_per_second: positive_integer(refs.fps.value, "FPS", 60),
                transparent: refs.transparent.checked,
                background: refs.background.value
            };
        }

        async function load_text(text, name = "image.svg") {
            ensure_alive();
            if (busy_action) throw new Error("輸出處理中，請先取消或等待完成。");
            const generation = ++source_generation;
            svg_text = null;
            svg_info = null;
            export_available = false;
            cleanup_output();
            refs.progress.value = 0;
            viewer.clear();
            show_info();
            update_controls();
            try {
                const info = await viewer.load_text(text, name);
                if (!info || generation !== source_generation || destroyed) return null;
                viewer.set_zoom(Number(refs.zoom.value));
                svg_text = text;
                source_name = name;
                svg_info = info;
                try {
                    extractor.load(text);
                    export_available = true;
                    set_status("SVG 已載入，可預覽及轉檔。");
                } catch (conversion_error) {
                    export_available = false;
                    set_status(`SVG 可預覽，但動畫擷取零件拒絕轉檔：${conversion_error.message}`, true);
                }
                show_info();
                update_controls();
                notify_state();
                return get_state();
            } catch (error) {
                if (!destroyed && generation === source_generation) {
                    viewer.clear();
                    set_status(error.message, true);
                    update_controls();
                    notify_state();
                }
                throw error;
            }
        }

        async function load_file(file) {
            ensure_alive();
            if (!(file instanceof Blob) || typeof file.text !== "function") {
                throw new TypeError("load_file() 需要 File 或 Blob。");
            }
            if (file.size > settings.maximum_upload_bytes) {
                throw new Error("SVG 檔案超過大小限制。");
            }
            if (file.name && !/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") {
                throw new Error("請選擇 SVG 檔案。");
            }
            // 讀檔本身是非同步，避免較慢的舊檔案覆蓋後來載入的新檔案。
            const generation = ++source_generation;
            const text = await file.text();
            if (generation !== source_generation || destroyed) return null;
            return load_text(text, file.name || "image.svg");
        }

        function set_zoom(value) {
            ensure_alive();
            viewer.set_zoom(Number(value));
            refs.zoom.value = String(value);
            refs["zoom-value"].textContent = `${Math.round(Number(value) * 100)}%`;
            notify_state();
        }

        function replay() {
            ensure_alive();
            if (!svg_text) return;
            // 重新給 img 一個新 URL，讓 SMIL/CSS 動畫從頭播放。
            return viewer.load_text(svg_text, source_name).then(() => {
                viewer.set_zoom(Number(refs.zoom.value));
                set_status("已重新播放預覽。");
            });
        }

        async function run_export(kind, executor) {
            ensure_alive();
            if (!export_available || !svg_info) throw new Error("這份 SVG 尚不能轉檔。");
            if (busy_action) throw new Error("已有輸出工作在執行。");
            const export_options = read_export_options();
            busy_action = kind;
            refs.progress.value = 0;
            abort_controller = new AbortController();
            set_status(`正在輸出 ${kind.toUpperCase()}…`);
            update_controls();
            notify_state();
            const job = (async () => {
                try {
                    const result = await executor(export_options, abort_controller.signal);
                    if (abort_controller.signal.aborted) throw new Error("使用者已取消輸出。");
                    present_output(result.blob, result.extension, result.mime_type);
                    refs.progress.value = 1;
                    set_status(`${kind.toUpperCase()} 已完成，請使用結果區的下載連結。`);
                    return result.blob;
                } catch (error) {
                    set_status(error.message, true);
                    throw error;
                } finally {
                    busy_action = null;
                    abort_controller = null;
                    video_recorder = null;
                    active_operation = null;
                    update_controls();
                    notify_state();
                }
            })();
            active_operation = job;
            return job;
        }

        function export_png() {
            return run_export("png", async (export_options, signal) => {
                const time_seconds = Number(refs.time.value);
                if (!Number.isFinite(time_seconds) || time_seconds < 0 || time_seconds > 3600) {
                    throw new RangeError("PNG 取樣時間必須介於 0～3600 秒。");
                }
                const frame = await extractor.capture({ ...export_options, time_seconds });
                if (signal.aborted) throw new Error("使用者已取消輸出。");
                const blob = await global.SlowlyCanvasPNG.toBlob(frame.canvas);
                return { blob, extension: "png", mime_type: "image/png" };
            });
        }

        function export_gif() {
            return run_export("gif", async (export_options, signal) => {
                // 使用者一次選太高解析度／時長，先拒絕，避免大量記憶體配置。
                const frame_count = Math.ceil(export_options.duration_seconds * export_options.frames_per_second);
                const required_bytes = export_options.width * export_options.height * 4 * frame_count;
                if (required_bytes > settings.maximum_frame_bytes) {
                    throw new RangeError("GIF 影格總大小超過限制；請降低寬度、秒數或 FPS。");
                }
                const batch = await extractor.capture_frames({
                    ...export_options,
                    signal,
                    on_progress(ratio) { refs.progress.value = ratio * 0.8; }
                });
                if (signal.aborted) throw new Error("使用者已取消輸出。");
                const blob = await global.SlowlyGIFEncoder.encode({
                    frames: batch.frames,
                    width: batch.width,
                    height: batch.height,
                    fps: batch.frames_per_second,
                    transparent: export_options.transparent,
                    onProgress(ratio) { refs.progress.value = 0.8 + 0.2 * ratio; }
                });
                return { blob, extension: "gif", mime_type: "image/gif" };
            });
        }

        function export_video() {
            return run_export("video", async (export_options, signal) => {
                const format = refs.format.value;
                const canvas = document.createElement("canvas");
                canvas.width = export_options.width;
                canvas.height = export_options.height;
                video_recorder = global.SlowlyCanvasVideoExport.create({
                    canvas,
                    duration_seconds: export_options.duration_seconds,
                    frames_per_second: export_options.frames_per_second,
                    format,
                    signal,
                    on_progress(ratio) { refs.progress.value = ratio; },
                    async draw_frame({ context, elapsed_seconds }) {
                        if (signal.aborted) throw new Error("使用者已取消輸出。");
                        const frame = await extractor.capture({
                            ...export_options,
                            time_seconds: elapsed_seconds
                        });
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        context.drawImage(frame.canvas, 0, 0);
                    }
                });
                const result = await video_recorder.start();
                return { blob: result.blob, extension: result.format, mime_type: result.mime_type };
            });
        }

        function cancel_export() {
            if (!busy_action) return false;
            abort_controller?.abort();
            video_recorder?.cancel();
            set_status("正在取消輸出…");
            return true;
        }

        async function clear() {
            ensure_alive();
            source_generation++;
            cancel_export();
            if (active_operation) {
                try { await active_operation; }
                catch { /* 取消操作預期會拒絕，仍要繼續清理。 */ }
            }
            viewer.clear();
            svg_text = null;
            svg_info = null;
            export_available = false;
            source_name = "image.svg";
            refs.file.value = "";
            cleanup_output();
            refs.progress.value = 0;
            show_info();
            set_status("已清除 SVG 與輸出結果。");
            update_controls();
            notify_state();
        }

        async function destroy() {
            if (destroyed) return;
            await clear();
            viewer.destroy();
            extractor.destroy();
            event_listeners.forEach(([element, event_name, handler]) => {
                element.removeEventListener(event_name, handler);
            });
            destroyed = true;
            root.replaceChildren();
            root.classList.remove("sbs-svg-converter");
            ACTIVE_INSTANCES.delete(root);
        }

        function handle_action(promise) {
            Promise.resolve(promise).catch(error => {
                if (!destroyed) set_status(error.message, true);
            });
        }

        listen(refs.file, "change", () => {
            const file = refs.file.files?.[0];
            if (file) handle_action(load_file(file));
        });
        listen(refs.clear, "click", () => handle_action(clear()));
        listen(refs.replay, "click", () => handle_action(replay()));
        listen(refs.zoom, "input", () => handle_action(set_zoom(refs.zoom.value)));
        listen(refs.png, "click", () => handle_action(export_png()));
        listen(refs.gif, "click", () => handle_action(export_gif()));
        listen(refs.video, "click", () => handle_action(export_video()));
        listen(refs.cancel, "click", cancel_export);
        update_controls();
        ACTIVE_INSTANCES.set(root, true);

        return Object.freeze({
            load_text,
            load_file,
            set_zoom,
            replay,
            export_png,
            export_gif,
            export_video,
            cancel_export,
            get_state,
            clear,
            destroy
        });
    }

    global.SlowlySVGConverterComponent = Object.freeze({
        version: "1.0.0",
        defaults: DEFAULT_SETTINGS,
        mount
    });
})(typeof window !== "undefined" ? window : globalThis);
