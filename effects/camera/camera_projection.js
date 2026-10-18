/* =========================================================
   慢慢軍火庫｜Camera Projection v1.0.0
   簡易三維世界座標 → 攝影機座標 → 二維像素透視投影。
   座標：+X 向右、+Y 向上、+Z 向前；角度使用弧度。
   只處理數學，不建立場景、不繪圖、不修改宿主 DOM。
========================================================= */
(function (global) {
    "use strict";

    function requireFiniteNumber(value, name) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new TypeError("CameraProjection: " + name + " 必須是有限數字。");
        }
        return value;
    }

    function normalizeCamera(camera) {
        if (!camera || typeof camera !== "object") {
            throw new TypeError("CameraProjection: camera 必須是物件。");
        }
        const normalized = {};
        for (const field of ["x", "y", "z", "yaw", "pitch"]) {
            normalized[field] = requireFiniteNumber(camera[field] === undefined ? 0 : camera[field], "camera." + field);
        }
        normalized.focal = requireFiniteNumber(camera.focal === undefined ? 600 : camera.focal, "camera.focal");
        if (normalized.focal <= 0) {
            throw new RangeError("CameraProjection: camera.focal 必須大於零。");
        }
        return normalized;
    }

    function normalizeViewport(viewport) {
        if (!viewport || typeof viewport !== "object") {
            throw new TypeError("CameraProjection: viewport 必須包含 width 和 height。");
        }
        const width = requireFiniteNumber(viewport.width, "viewport.width");
        const height = requireFiniteNumber(viewport.height, "viewport.height");
        const near_clip = requireFiniteNumber(viewport.near_clip === undefined ? 0.01 : viewport.near_clip, "viewport.near_clip");
        if (width <= 0 || height <= 0 || near_clip <= 0) {
            throw new RangeError("CameraProjection: 視口尺寸與 near_clip 必須大於零。");
        }
        return { width, height, near_clip };
    }

    function normalizePoint(point) {
        if (!point || typeof point !== "object") {
            throw new TypeError("CameraProjection: point 必須是物件。");
        }
        return {
            x: requireFiniteNumber(point.x, "point.x"),
            y: requireFiniteNumber(point.y, "point.y"),
            z: requireFiniteNumber(point.z, "point.z")
        };
    }

    function toCameraSpace(camera, point) {
        const position = normalizePoint(point);
        const view = normalizeCamera(camera);
        const relative_x = position.x - view.x;
        const relative_y = position.y - view.y;
        const relative_z = position.z - view.z;

        // 維持原運鏡 Demo 的 yaw → pitch 座標轉換順序。
        const yaw_x = relative_x * Math.cos(view.yaw) - relative_z * Math.sin(view.yaw);
        const yaw_z = relative_x * Math.sin(view.yaw) + relative_z * Math.cos(view.yaw);
        const pitch_y = relative_y * Math.cos(view.pitch) - yaw_z * Math.sin(view.pitch);
        const pitch_z = relative_y * Math.sin(view.pitch) + yaw_z * Math.cos(view.pitch);

        return { x: yaw_x, y: pitch_y, depth: pitch_z };
    }

    function toScreen(camera, camera_point, viewport) {
        const view = normalizeCamera(camera);
        const frame = normalizeViewport(viewport);
        if (!camera_point || typeof camera_point !== "object") {
            throw new TypeError("CameraProjection: camera_point 必須是物件。");
        }
        const x = requireFiniteNumber(camera_point.x, "camera_point.x");
        const y = requireFiniteNumber(camera_point.y, "camera_point.y");
        const depth = requireFiniteNumber(camera_point.depth, "camera_point.depth");
        if (depth < frame.near_clip) {
            return { visible: false, x: null, y: null, scale: null, depth, in_viewport: false };
        }
        const scale = view.focal / depth;
        const screen_x = frame.width / 2 + x * scale;
        const screen_y = frame.height / 2 - y * scale;
        return {
            visible: true,
            x: screen_x,
            y: screen_y,
            scale,
            depth,
            in_viewport: screen_x >= 0 && screen_x <= frame.width && screen_y >= 0 && screen_y <= frame.height
        };
    }

    function project(camera, point, viewport) {
        return toScreen(camera, toCameraSpace(camera, point), viewport);
    }

    global.SlowlyCameraProjection = Object.freeze({
        version: "1.0.0",
        toCameraSpace,
        toScreen,
        project
    });
})(typeof window !== "undefined" ? window : globalThis);
