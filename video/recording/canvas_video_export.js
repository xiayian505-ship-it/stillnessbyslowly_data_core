/* =============================================================
 * 慢慢軍火庫｜Canvas Video Export v1.0.0
 * 職責：使用宿主 Canvas 與逐影格更新回呼，協調瀏覽器錄影。
 * 必要依賴：SlowlyVideoRecorderMime、SlowlyVideoMediaRecorder、
 *           SlowlyVideoRecordedChunks（都由既有軍火庫提供）。
 * 不編碼 GIF、不讀取 SVG、不下載檔案、不做 MP4 轉碼。
 * ============================================================= */
(function (global) {
    "use strict";

    const FORMAT_CANDIDATES = Object.freeze({
        webm: Object.freeze([
            "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"
        ]),
        mp4: Object.freeze([
            "video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"
        ])
    });

    function assert_dependencies() {
        if (!global.SlowlyVideoRecorderMime?.choose ||
            !global.SlowlyVideoMediaRecorder?.create ||
            !global.SlowlyVideoMediaRecorder?.start ||
            !global.SlowlyVideoMediaRecorder?.stop ||
            !global.SlowlyVideoRecordedChunks?.create) {
            throw new Error("Canvas Video Export 需要先載入軍火庫的 MIME / Recorder / Chunks 三顆零件。");
        }
    }

    function get_supported_formats() {
        assert_dependencies();
        return {
            webm: global.SlowlyVideoRecorderMime.choose(FORMAT_CANDIDATES.webm),
            mp4: global.SlowlyVideoRecorderMime.choose(FORMAT_CANDIDATES.mp4)
        };
    }

    function create(options = {}) {
        assert_dependencies();
        const { canvas, draw_frame, on_progress, signal } = options;
        if (!(canvas instanceof global.HTMLCanvasElement) ||
            typeof canvas.captureStream !== "function") {
            throw new TypeError("需要支援 captureStream() 的 HTMLCanvasElement。");
        }
        if (typeof draw_frame !== "function") {
            throw new TypeError("需要 draw_frame({ canvas, context, elapsed_seconds, frame_index }) 回呼。");
        }
        if (on_progress !== undefined && typeof on_progress !== "function") {
            throw new TypeError("on_progress 必須是函式。");
        }
        if (canvas.width < 1 || canvas.height < 1) {
            throw new RangeError("Canvas 尺寸必須大於 0。");
        }
        const duration_seconds = options.duration_seconds ?? 3;
        const frames_per_second = options.frames_per_second ?? 20;
        const video_bits_per_second = options.video_bits_per_second ?? 3_500_000;
        const format = options.format ?? "webm";
        if (!Number.isFinite(duration_seconds) || duration_seconds <= 0 || duration_seconds > 300) {
            throw new RangeError("duration_seconds 必須大於 0 且不超過 300 秒。");
        }
        if (!Number.isInteger(frames_per_second) || frames_per_second < 1 || frames_per_second > 60) {
            throw new RangeError("frames_per_second 必須是 1～60 的整數。");
        }
        if (!Number.isInteger(video_bits_per_second) || video_bits_per_second <= 0) {
            throw new RangeError("video_bits_per_second 必須是正整數。");
        }
        if (!Object.hasOwn(FORMAT_CANDIDATES, format)) {
            throw new Error("format 必須是 webm 或 mp4。");
        }
        const mime_type = get_supported_formats()[format];
        if (!mime_type) {
            throw new Error(`此瀏覽器不支援直接錄製 ${format.toUpperCase()}。`);
        }

        const context = canvas.getContext("2d");
        if (!context) throw new Error("無法建立 Canvas 2D 繪圖環境。");

        let recording_state = "idle";
        let requested_stop = false;
        let requested_cancel = false;
        let active_promise = null;
        let active_stream = null;
        let active_recorder = null;
        let active_chunks = null;

        function notify_progress(value) {
            if (typeof on_progress === "function") on_progress(Math.max(0, Math.min(1, value)));
        }

        async function draw_at_time(elapsed_seconds, frame_index) {
            await draw_frame({ canvas, context, elapsed_seconds, frame_index });
            const track = active_stream?.getVideoTracks()[0];
            track?.requestFrame?.();
        }

        function stop() {
            if (recording_state === "recording") requested_stop = true;
            return active_promise;
        }

        function cancel() {
            if (recording_state === "recording") requested_cancel = true;
            return active_promise;
        }

        async function record() {
            if (recording_state !== "idle") throw new Error("同一個錄影實例只能啟動一次。");
            if (signal?.aborted) throw new Error("錄影已取消。");
            recording_state = "recording";
            const planned_duration_milliseconds = duration_seconds * 1000;
            let completed_seconds = 0;
            let start_timestamp = 0;

            try {
                // 先繪製初始影格。實際錄影仍須依照瀏覽器的實時時鐘進行。
                await draw_frame({ canvas, context, elapsed_seconds: 0, frame_index: 0 });
                active_stream = canvas.captureStream(frames_per_second);
                active_recorder = global.SlowlyVideoMediaRecorder.create(active_stream, {
                    mimeType: mime_type,
                    videoBitsPerSecond: video_bits_per_second
                });
                active_chunks = global.SlowlyVideoRecordedChunks.create(mime_type.split(";")[0]);
                active_chunks.attach(active_recorder);
                global.SlowlyVideoMediaRecorder.start(active_recorder, 250);
                start_timestamp = global.performance.now();
                let previous_frame_index = -1;

                while (!requested_stop && !requested_cancel && !signal?.aborted) {
                    const elapsed_milliseconds = global.performance.now() - start_timestamp;
                    if (elapsed_milliseconds >= planned_duration_milliseconds) break;
                    const frame_index = Math.floor(elapsed_milliseconds / 1000 * frames_per_second);
                    if (frame_index !== previous_frame_index) {
                        completed_seconds = elapsed_milliseconds / 1000;
                        await draw_at_time(completed_seconds, frame_index);
                        previous_frame_index = frame_index;
                        notify_progress(completed_seconds / duration_seconds);
                    }
                    await new Promise(resolve => global.setTimeout(resolve, Math.max(8, 1000 / frames_per_second / 4)));
                }

                if (requested_cancel || signal?.aborted) throw new Error("錄影已取消。");
                if (!requested_stop) {
                    completed_seconds = duration_seconds;
                    await draw_at_time(completed_seconds, Math.ceil(duration_seconds * frames_per_second));
                }
                // 避免在最後一次 requestFrame() 後立刻 stop，導致尾幀未送出。
                await new Promise(resolve => global.setTimeout(resolve, 120));
                await global.SlowlyVideoMediaRecorder.stop(active_recorder);
                const blob = active_chunks.toBlob(mime_type.split(";")[0]);
                if (!blob.size) throw new Error("錄影結果為空 Blob，瀏覽器可能未輸出影格。");
                recording_state = "finished";
                notify_progress(1);
                return {
                    blob,
                    mime_type: blob.type,
                    format,
                    width: canvas.width,
                    height: canvas.height,
                    duration_seconds: completed_seconds
                };
            } catch (error) {
                recording_state = requested_cancel || signal?.aborted ? "cancelled" : "failed";
                throw error;
            } finally {
                // Recorder、Chunks、MediaStream 分屬軍火庫原有零件；此處只負責協調清理。
                if (active_recorder && active_recorder.state !== "inactive") {
                    try { await global.SlowlyVideoMediaRecorder.stop(active_recorder); }
                    catch { /* 清理時不覆蓋先前的錄製錯誤。 */ }
                }
                active_chunks?.detach();
                active_stream?.getTracks().forEach(track => track.stop());
                active_recorder = null;
                active_stream = null;
                active_chunks = null;
            }
        }

        function start() {
            if (active_promise) throw new Error("錄影實例已經啟動。");
            active_promise = record();
            return active_promise;
        }

        return Object.freeze({
            start,
            stop,
            cancel,
            get state() { return recording_state; },
            get mime_type() { return mime_type; }
        });
    }

    global.SlowlyCanvasVideoExport = Object.freeze({ version: "1.0.0", create, get_supported_formats });
})(typeof window !== "undefined" ? window : globalThis);
