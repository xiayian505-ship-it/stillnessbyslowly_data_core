/* 慢慢軍火庫｜Slowly Video Speed Player Component v1.0.0
 * 完成品組裝：只調度軍火庫 Video、Blob URL、Filename 模組。
 * 不載入第三方套件、不上傳影片、不依賴 Piano；不重作基礎積木算法。
 * 呼叫順序：先依 README 載入 12 個 HTTPS 基礎模組，再載入本檔。
 * 外觀僅使用可覆寫的 .slowly-video-speed-player CSS 變數。
 */
(function (global) {
  "use strict";
  const REQUIRED = {
    rate: ["SlowlyVideoPlaybackRate", ["get", "set"]],
    play: ["SlowlyVideoPlayPause", ["play", "pause", "toggle"]],
    seek: ["SlowlyVideoSeek", ["restart", "to"]],
    ready: ["SlowlyVideoReady", ["wait"]],
    capture: ["SlowlyVideoCaptureStream", ["isSupported", "capture"]],
    mime: ["SlowlyVideoRecorderMime", ["choose"]],
    recorder: ["SlowlyVideoMediaRecorder", ["isSupported", "create", "start", "stop"]],
    chunks: ["SlowlyVideoRecordedChunks", ["create"]],
    progress: ["SlowlyVideoMediaProgress", ["read"]],
    remaining: ["SlowlyVideoRemainingTime", ["read"]],
    blob: ["SlowlyBlobURL", ["create", "revoke"]],
    filename: ["FilenameSanitize", ["sanitize"]]
  };
  const DEFAULT_SPEEDS = Object.freeze([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);

  function dependencies() {
    const missing = [];
    const found = {};
    for (const [name, [globalName, methods]] of Object.entries(REQUIRED)) {
      const api = global[globalName];
      if (!api || !methods.every(method => typeof api[method] === "function")) missing.push(globalName);
      else found[name] = api;
    }
    if (missing.length) throw new Error(`SlowlyVideoSpeedPlayer 缺少依賴：${missing.join("、")}`);
    return found;
  }
  function resolve(target) {
    return typeof target === "string" ? document.querySelector(target) : target;
  }
  function secondsLabel(value) {
    if (!Number.isFinite(value)) return "--:--";
    const n = Math.max(0, Math.floor(value));
    const hours = Math.floor(n / 3600);
    const mins = String(Math.floor(n / 60) % 60).padStart(hours ? 2 : 1, "0");
    const secs = String(n % 60).padStart(2, "0");
    return hours ? `${hours}:${mins}:${secs}` : `${mins}:${secs}`;
  }
  function speedLabel(n) { return `${Number(n).toFixed(1)}×`; }
  function validSpeeds(speeds) {
    if (!Array.isArray(speeds) || !speeds.length || speeds.some(v => !Number.isFinite(v) || v < 0.5 || v > 5)) {
      throw new RangeError("speeds 應是 0.5～5 的數字陣列");
    }
    return [...new Set(speeds)].sort((a, b) => a - b);
  }

  class VideoSpeedPlayer {
    constructor(host, options = {}) {
      this.api = dependencies();
      this.host = host;
      this.options = options;
      this.speeds = validSpeeds(options.speeds || DEFAULT_SPEEDS);
      this._active = true;
      this._file = null;
      this._sourceUrl = null;
      this._downloadUrl = null;
      this._session = null;
      this._preparing = false;
      this._stopRequested = false;
      this._generation = 0;
      this._controller = null;
      this._recordingStatus = "idle";
      this._listeners = [];

      const root = document.createElement("section");
      root.className = "slowly-video-speed-player";
      root.setAttribute("aria-label", "影片變速播放器");
      root.innerHTML = `
        <div class="svsp-upload" data-part="dropzone">
          <label class="svsp-file-label">選擇本機影片
            <input type="file" accept="video/*" data-part="file" aria-label="選擇影片檔案">
          </label>
          <span class="svsp-hint">也可以把影片拖放到這裡；檔案不會上傳。</span>
        </div>
        <p class="svsp-filename" data-part="filename" aria-live="polite"></p>
        <video class="svsp-video" data-part="video" controls playsinline preload="metadata"></video>
        <div class="svsp-toolbar">
          <button type="button" data-part="play">播放／暫停</button>
          <button type="button" data-part="restart">從頭播放</button>
          <button type="button" data-part="replace">更換影片</button>
        </div>
        <fieldset class="svsp-speed">
          <legend>播放速度：<output data-part="rate">1.0×</output></legend>
          <input data-part="slider" aria-label="播放倍率" type="range" min="0.5" max="5" step="0.5" value="1">
          <div class="svsp-speed-buttons" data-part="speed-buttons"></div>
        </fieldset>
        <p class="svsp-play-progress">影片進度：<output data-part="play-progress">0%</output></p>
        <fieldset class="svsp-export">
          <legend>匯出變速後的影片</legend>
          <button type="button" data-part="export">以 1.0× 速度匯出</button>
          <button type="button" data-part="stop" hidden>提前停止並保留片段</button>
          <progress data-part="progress" max="100" value="0"></progress>
          <p data-part="remaining" class="svsp-hint"></p>
          <a data-part="download" download hidden>下載已錄製影片</a>
          <p class="svsp-hint">匯出會在本機把倍速播放內容重新錄製，約需原片長度 ÷ 倍率。請保持頁面在前景、螢幕不要鎖定；能否錄製取決於瀏覽器支援。</p>
        </fieldset>
        <p class="svsp-status" data-part="status" role="status" aria-live="polite">請先選擇影片。</p>`;
      this.host.appendChild(root);
      this.root = root;
      const el = (part) => root.querySelector(`[data-part="${part}"]`);
      this.elements = Object.freeze({
        root, video: el("video"), file: el("file"), dropzone: el("dropzone"),
        filename: el("filename"), play: el("play"), restart: el("restart"),
        replace: el("replace"), slider: el("slider"), rate: el("rate"),
        buttons: el("speed-buttons"), playProgress: el("play-progress"),
        export: el("export"), stop: el("stop"), progress: el("progress"),
        remaining: el("remaining"), download: el("download"), status: el("status")
      });
      this.video = this.elements.video;
      for (const n of this.speeds) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "svsp-speed-button";
        b.dataset.rate = String(n);
        b.textContent = speedLabel(n);
        this.elements.buttons.appendChild(b);
      }
      this._bind();
      this._render();
    }
    _listen(el, type, fn) {
      el.addEventListener(type, fn);
      this._listeners.push(() => el.removeEventListener(type, fn));
    }
    _bind() {
      const e = this.elements;
      this._listen(e.file, "change", () => {
        const f = e.file.files && e.file.files[0];
        if (f) this.loadFile(f).catch(err => this._error(err));
      });
      for (const name of ["dragenter", "dragover"]) this._listen(e.dropzone, name, ev => {
        ev.preventDefault();
        e.dropzone.classList.add("is-dragover");
      });
      for (const name of ["dragleave", "drop"]) this._listen(e.dropzone, name, ev => {
        ev.preventDefault();
        e.dropzone.classList.remove("is-dragover");
      });
      this._listen(e.dropzone, "drop", ev => {
        const f = ev.dataTransfer && ev.dataTransfer.files[0];
        if (f) this.loadFile(f).catch(err => this._error(err));
      });
      this._listen(e.slider, "input", () => this.setSpeed(Number(e.slider.value)));
      this._listen(e.buttons, "click", ev => {
        const b = ev.target.closest("button[data-rate]");
        if (b) this.setSpeed(Number(b.dataset.rate));
      });
      this._listen(e.play, "click", () => {
        if (this._isBusy()) return;
        Promise.resolve(this.api.play.toggle(this.video)).catch(err => this._error(err));
      });
      this._listen(e.restart, "click", () => {
        if (this._isBusy()) return;
        try { this.api.seek.restart(this.video); } catch (err) { this._error(err); }
      });
      this._listen(e.replace, "click", () => this.reset());
      this._listen(e.export, "click", () => this.startExport().catch(err => this._error(err)));
      this._listen(e.stop, "click", () => this.stopExport().catch(err => this._error(err)));
      this._listen(this.video, "timeupdate", () => this._tick());
      this._listen(this.video, "durationchange", () => this._tick());
      this._listen(this.video, "ended", () => { if (this._session) this.stopExport().catch(err => this._error(err)); });
      this._listen(this.video, "error", () => {
        if (this._file && this.video.error) this._error(new Error("影片播放發生錯誤或格式不支援"));
      });
    }
    _status(msg) { if (this._active) this.elements.status.textContent = msg; }
    _error(error) {
      if (!this._active) return;
      this._status(`操作失敗：${error && error.message ? error.message : String(error)}`);
      if (typeof this.options.onError === "function") this.options.onError(error, this);
      else console.error(error);
    }
    _isBusy() { return this._preparing || Boolean(this._session); }
    _clearDownload() {
      const d = this.elements.download;
      d.hidden = true;
      d.removeAttribute("href");
      if (this._downloadUrl) this.api.blob.revoke(this._downloadUrl);
      this._downloadUrl = null;
    }
    _render() {
      const e = this.elements;
      const busy = this._isBusy();
      const loaded = Boolean(this._file);
      e.rate.textContent = speedLabel(this.api.rate.get(this.video));
      e.slider.value = String(this.api.rate.get(this.video));
      e.export.textContent = `以 ${speedLabel(this.api.rate.get(this.video))} 速度匯出`;
      e.export.disabled = !loaded || busy;
      e.play.disabled = !loaded || busy;
      e.restart.disabled = !loaded || busy;
      e.replace.disabled = !loaded || this._preparing || Boolean(this._session);
      e.file.disabled = busy;
      e.slider.disabled = busy || !loaded;
      for (const b of e.buttons.querySelectorAll("button[data-rate]")) {
        const active = Number(b.dataset.rate) === this.api.rate.get(this.video);
        b.setAttribute("aria-pressed", String(active));
        b.disabled = busy || !loaded;
      }
      e.stop.hidden = !busy;
      e.stop.disabled = this._recordingStatus === "stopping";
      e.video.hidden = !loaded;
      this._tick();
    }
    _tick() {
      if (!this._active) return;
      const pct = this.api.progress.read(this.video);
      this.elements.playProgress.textContent = pct === null ? "--" : `${Math.round(pct)}%`;
      if (this._session) {
        this.elements.progress.value = pct === null ? 0 : pct;
        const left = this.api.remaining.read(this.video);
        this.elements.remaining.textContent = `錄製中｜進度 ${pct === null ? "--" : Math.round(pct) + "%"}｜預估剩餘 ${secondsLabel(left)}`;
      }
    }
    setSpeed(value) {
      if (!this._active) throw new Error("播放器已銷毀");
      if (this._isBusy()) return this.api.rate.get(this.video);
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0.5 || num > 5) throw new RangeError("速度需為 0.5～5 倍");
      const v = this.api.rate.set(this.video, num);
      this._clearDownload();
      this._render();
      return v;
    }
    async loadFile(file) {
      if (!this._active) throw new Error("播放器已銷毀");
      if (this._isBusy()) throw new Error("錄製中，請先停止再更換影片");
      if (!(file instanceof File) || (file.type && !file.type.startsWith("video/"))) throw new TypeError("請選擇影片檔案");
      this.api.play.pause(this.video);
      this.video.removeAttribute("src");
      this.video.load();
      if (this._sourceUrl) this.api.blob.revoke(this._sourceUrl);
      this._sourceUrl = null;
      this._clearDownload();
      this._file = file;
      this._sourceUrl = this.api.blob.create(file);
      this.video.src = this._sourceUrl;
      this.api.rate.set(this.video, 1);
      this.video.load();
      this.elements.filename.textContent = `已載入：${file.name}`;
      this.elements.progress.value = 0;
      this.elements.remaining.textContent = "";
      this._status("影片已載入，可以調整播放倍率。");
      this._render();
      return file;
    }
    async _waitSeek(signal) {
      if (!this.video.seeking) return;
      await new Promise((resolve, reject) => {
        let timer = null;
        const cleanup = () => {
          if (timer !== null) clearTimeout(timer);
          this.video.removeEventListener("seeked", done);
          if (signal) signal.removeEventListener("abort", cancel);
        };
        const done = () => { cleanup(); resolve(); };
        const cancel = () => { cleanup(); reject(new DOMException("已取消錄製", "AbortError")); };
        if (signal && signal.aborted) return cancel();
        this.video.addEventListener("seeked", done, { once: true });
        if (signal) signal.addEventListener("abort", cancel, { once: true });
        timer = setTimeout(() => { cleanup(); reject(new Error("等待跳轉影片起點逾時")); }, 6000);
      });
    }
    async startExport() {
      if (!this._active || !this._file || this._isBusy()) return;
      const a = this.api;
      if (!a.recorder.isSupported() || !a.capture.isSupported(this.video)) {
        this._status("目前的瀏覽器無法錄製影片串流；可以只使用倍速播放。");
        return;
      }
      const type = a.mime.choose();
      if (!type) { this._status("瀏覽器找不到支援的錄製格式。"); return; }
      this._clearDownload();
      this._preparing = true;
      this._recordingStatus = "preparing";
      const ticket = ++this._generation;
      this._controller = new AbortController();
      this.elements.progress.value = 0;
      this._status("準備錄製…請保持此頁在前景，螢幕不要關閉。");
      this._render();
      let stream = null;
      try {
        a.play.pause(this.video);
        a.seek.restart(this.video);
        await a.ready.wait(this.video, { timeoutMs: 12000, minReadyState: 2, signal: this._controller.signal });
        if (ticket !== this._generation || !this._active) return;
        await this._waitSeek(this._controller.signal);
        if (ticket !== this._generation || !this._active) return;
        stream = a.capture.capture(this.video);
        // 部分瀏覽器在暫停狀態下擷取串流，會暫時沒有影像軌。
        if (!stream.getVideoTracks().length) {
          await a.play.play(this.video);
          if (ticket !== this._generation || !this._active) return;
          stream = a.capture.capture(this.video);
        }
        if (!stream.getVideoTracks().length) throw new Error("擷取串流沒有影像軌道");
        const recorder = a.recorder.create(stream, { mimeType: type });
        const chunks = a.chunks.create(type);
        chunks.attach(recorder);
        const session = { recorder, stream, chunks, type, rate: a.rate.get(this.video), file: this._file, finished: false };
        this._session = session;
        recorder.addEventListener("stop", () => this._finish(session), { once: true });
        recorder.addEventListener("error", ev => this._recordingError(session, ev.error || new Error("錄製器發生錯誤")), { once: true });
        a.recorder.start(recorder, 250);
        this._preparing = false;
        this._recordingStatus = "recording";
        this._status("正在重新錄製影片，請保持網頁在前景。");
        this._render();
        if (this.video.paused) await a.play.play(this.video);
      } catch (err) {
        if (this._session) {
          this._session.error = err;
          await this.stopExport().catch(() => {});
        } else {
          this._preparing = false;
          this._recordingStatus = "idle";
          if (stream && stream.getTracks) stream.getTracks().forEach(track => track.stop());
          if (ticket === this._generation && err.name !== "AbortError") this._error(err);
          this._render();
        }
      } finally {
        if (ticket === this._generation) this._controller = null;
      }
    }
    async stopExport() {
      if (!this._active) return;
      if (this._preparing && !this._session) {
        ++this._generation;
        if (this._controller) this._controller.abort();
        this._preparing = false;
        this._recordingStatus = "idle";
        this.api.play.pause(this.video);
        this._status("已取消準備錄製。");
        this._render();
        return;
      }
      const s = this._session;
      if (!s || this._recordingStatus === "stopping") return;
      this._recordingStatus = "stopping";
      this._status("正在完成錄製檔案…");
      this._render();
      try { await this.api.recorder.stop(s.recorder); }
      catch (err) { this._recordingError(s, err); }
    }
    _recordingError(s, err) {
      if (s.finished) return;
      s.error = err;
      this._error(err);
      if (s.recorder.state !== "inactive") {
        try { s.recorder.stop(); } catch (_) {}
      } else this._finish(s, err);
    }
    _finish(s, error = null) {
      if (s.finished) return;
      s.finished = true;
      s.chunks.detach();
      if (s.stream && typeof s.stream.getTracks === "function") {
        for (const track of s.stream.getTracks()) track.stop();
      }
      if (!this._active || this._session !== s) return;
      this._session = null;
      this._preparing = false;
      this._recordingStatus = "idle";
      this.api.play.pause(this.video);
      const pct = this.api.progress.read(this.video);
      this.elements.progress.value = this.video.ended ? 100 : (pct === null ? 0 : pct);
      this.elements.remaining.textContent = "";
      const blob = s.chunks.toBlob(s.recorder.mimeType || s.type);
      const failure = error || s.error;
      if (failure || !blob.size) {
        this._status(failure ? `錄製失敗：${failure.message}` : "沒有錄到內容；請重試。" );
      } else {
        const ext = (s.recorder.mimeType || s.type).startsWith("video/mp4") ? "mp4" : "webm";
        const base = this.api.filename.sanitize(s.file.name.replace(/\.[^/.]+$/, ""), { fallback: "video" });
        const d = this.elements.download;
        this._downloadUrl = this.api.blob.create(blob);
        d.href = this._downloadUrl;
        d.download = `${base}_${s.rate}x.${ext}`;
        d.hidden = false;
        this._status("錄製完成，可以下載影片。");
      }
      this._render();
      if (typeof this.options.onExport === "function" && !failure && blob.size) this.options.onExport(blob, this);
    }
    reset() {
      if (!this._active) return;
      if (this._isBusy()) { this._status("請先停止錄製，再更換影片。"); return; }
      this.api.play.pause(this.video);
      this.video.removeAttribute("src");
      this.video.load();
      if (this._sourceUrl) this.api.blob.revoke(this._sourceUrl);
      this._sourceUrl = null;
      this._file = null;
      this._clearDownload();
      this.elements.file.value = "";
      this.elements.filename.textContent = "";
      this.elements.progress.value = 0;
      this.elements.remaining.textContent = "";
      this._status("請先選擇影片。");
      this._render();
    }
    destroy() {
      if (!this._active) return;
      ++this._generation;
      if (this._controller) this._controller.abort();
      if (this._session) {
        const s = this._session;
        this._session = null;
        s.chunks.detach();
        try { if (s.recorder.state !== "inactive") s.recorder.stop(); } catch (_) {}
        if (s.stream && s.stream.getTracks) s.stream.getTracks().forEach(track => track.stop());
      }
      this._preparing = false;
      this.api.play.pause(this.video);
      this.video.removeAttribute("src");
      if (this._sourceUrl) this.api.blob.revoke(this._sourceUrl);
      this._sourceUrl = null;
      this._clearDownload();
      this._listeners.splice(0).forEach(off => off());
      this._active = false;
      this.root.remove();
    }
  }
  global.SlowlyVideoSpeedPlayer = Object.freeze({
    version: "1.0.0",
    mount(target, options = {}) {
      const host = resolve(target);
      if (!(host instanceof Element)) throw new Error("SlowlyVideoSpeedPlayer.mount 找不到容器");
      return new VideoSpeedPlayer(host, options);
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
