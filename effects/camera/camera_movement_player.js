/* =========================================================
   慢慢軍火庫｜Camera Movement Player v1.0.0
   純時間軸播放器。播放狀態不依賴 Canvas、固定運鏡或畫面。
   on_progress(progress, state) 由宿主接計算／渲染工作。
========================================================= */
(function (global) {
    "use strict";

    function requireProgress(progress) {
        if (typeof progress !== "number" || !Number.isFinite(progress)) {
            throw new TypeError("CameraMovementPlayer: progress 必須是有限數字。");
        }
        return Math.max(0, Math.min(1, progress));
    }

    function create(options = {}) {
        const duration_ms = options.duration_ms === undefined ? 5000 : options.duration_ms;
        if (typeof duration_ms !== "number" || !Number.isFinite(duration_ms) || duration_ms <= 0) {
            throw new RangeError("CameraMovementPlayer: duration_ms 必須大於零。");
        }
        const on_progress = options.on_progress;
        const on_complete = options.on_complete;
        if (on_progress !== undefined && typeof on_progress !== "function") {
            throw new TypeError("CameraMovementPlayer: on_progress 必須是函式。");
        }
        if (on_complete !== undefined && typeof on_complete !== "function") {
            throw new TypeError("CameraMovementPlayer: on_complete 必須是函式。");
        }
        const request_frame = options.request_frame || global.requestAnimationFrame?.bind(global);
        const cancel_frame = options.cancel_frame || global.cancelAnimationFrame?.bind(global);
        if (typeof request_frame !== "function" || typeof cancel_frame !== "function") {
            throw new Error("CameraMovementPlayer: 瀏覽器不支援 requestAnimationFrame / cancelAnimationFrame。");
        }

        let progress = 0;
        let is_playing = false;
        let destroyed = false;
        let loop = options.loop === true;
        let scheduled_frame = null;
        let last_timestamp = null;

        function assertAlive() {
            if (destroyed) throw new Error("CameraMovementPlayer: 此實例已 destroy。");
        }

        function getState() {
            return { progress, is_playing, loop, duration_ms, destroyed };
        }

        function publish() {
            if (typeof on_progress === "function") on_progress(progress, getState());
        }

        function cancelScheduledFrame() {
            if (scheduled_frame !== null) {
                cancel_frame(scheduled_frame);
                scheduled_frame = null;
            }
        }

        function tick(timestamp) {
            scheduled_frame = null;
            if (!is_playing || destroyed) return;
            if (last_timestamp !== null) {
                const elapsed = Math.max(0, timestamp - last_timestamp);
                const next_progress = progress + elapsed / duration_ms;
                if (loop) {
                    progress = next_progress % 1;
                    publish();
                } else if (next_progress >= 1) {
                    progress = 1;
                    is_playing = false;
                    last_timestamp = null;
                    publish();
                    if (typeof on_complete === "function") on_complete(getState());
                    return;
                } else {
                    progress = next_progress;
                    publish();
                }
            }
            last_timestamp = timestamp;
            if (is_playing) scheduled_frame = request_frame(tick);
        }

        function play() {
            assertAlive();
            if (is_playing) return;
            if (progress >= 1) progress = 0;
            is_playing = true;
            last_timestamp = null;
            publish();
            scheduled_frame = request_frame(tick);
        }

        function pause() {
            assertAlive();
            is_playing = false;
            last_timestamp = null;
            cancelScheduledFrame();
        }

        function seek(next_progress) {
            assertAlive();
            progress = requireProgress(next_progress);
            last_timestamp = null;
            publish();
            return progress;
        }

        function restart() {
            assertAlive();
            pause();
            seek(0);
            play();
        }

        function stop() {
            assertAlive();
            pause();
            seek(0);
        }

        function setLoop(value) {
            assertAlive();
            loop = value === true;
        }

        function destroy() {
            if (destroyed) return;
            is_playing = false;
            destroyed = true;
            last_timestamp = null;
            cancelScheduledFrame();
        }

        return Object.freeze({ play, pause, seek, restart, stop, setLoop, getState, destroy });
    }

    global.SlowlyCameraMovementPlayer = Object.freeze({ version: "1.0.0", create });
})(typeof window !== "undefined" ? window : globalThis);
