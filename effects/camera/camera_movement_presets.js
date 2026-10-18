/* =========================================================
   慢慢軍火庫｜Camera Movement Presets v1.0.0
   九種運鏡的純計算。輸入同一進度和參數，輸出必然一致。
   宿主提供 camera 和追蹤目標；不控制時間、不繪圖。
========================================================= */
(function (global) {
    "use strict";

    const MOVEMENTS = Object.freeze([
        { id: "pan", name: "水平搖攝", duration_seconds: 6 },
        { id: "tilt", name: "垂直搖攝", duration_seconds: 6 },
        { id: "zoom_in", name: "變焦拉近", duration_seconds: 5 },
        { id: "dolly_in", name: "鏡頭前推", duration_seconds: 5 },
        { id: "tracking", name: "跟拍", duration_seconds: 7 },
        { id: "orbit", name: "環繞", duration_seconds: 8 },
        { id: "whip_pan", name: "快速甩鏡", duration_seconds: 5 },
        { id: "rack_focus", name: "焦點轉移", duration_seconds: 5 },
        { id: "crane_up", name: "搖臂升起", duration_seconds: 6 }
    ]);

    function finiteNumber(value, name) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new TypeError("CameraMovementPresets: " + name + " 必須是有限數字。");
        }
        return value;
    }

    function numberOption(options, name, fallback) {
        return finiteNumber(options[name] === undefined ? fallback : options[name], name);
    }

    function interpolate(from, to, fraction) {
        return from + (to - from) * fraction;
    }

    function smoothstep(progress) {
        return progress * progress * (3 - 2 * progress);
    }

    function ease(progress, easing) {
        if (easing === "linear") return progress;
        if (easing === undefined || easing === "ease_in_out") {
            return progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(2 - 2 * progress, 2) / 2;
        }
        if (typeof easing === "function") {
            const eased = finiteNumber(easing(progress), "easing result");
            return Math.min(1, Math.max(0, eased));
        }
        throw new RangeError("CameraMovementPresets: easing 只能是 linear、ease_in_out 或函式。");
    }

    function readPoint(point, name) {
        if (!point || typeof point !== "object") {
            throw new TypeError("CameraMovementPresets: " + name + " 需提供 {x, y, z}。");
        }
        return {
            x: finiteNumber(point.x, name + ".x"),
            y: finiteNumber(point.y, name + ".y"),
            z: finiteNumber(point.z, name + ".z")
        };
    }

    function readCamera(initial_camera) {
        if (!initial_camera || typeof initial_camera !== "object" || Array.isArray(initial_camera)) {
            throw new TypeError("CameraMovementPresets: initial_camera 必須是物件。");
        }
        const camera = { ...initial_camera };
        for (const field of ["x", "y", "z", "yaw", "pitch"]) {
            camera[field] = finiteNumber(camera[field] === undefined ? 0 : camera[field], "initial_camera." + field);
        }
        camera.focal = finiteNumber(camera.focal === undefined ? 600 : camera.focal, "initial_camera.focal");
        if (camera.focal <= 0) throw new RangeError("CameraMovementPresets: focal 必須大於零。");
        return camera;
    }

    function calculate(movement_id, progress, initial_camera = {}, options = {}) {
        if (!MOVEMENTS.some(movement => movement.id === movement_id)) {
            throw new RangeError("CameraMovementPresets: 不存在的運鏡 " + movement_id);
        }
        if (!options || typeof options !== "object" || Array.isArray(options)) {
            throw new TypeError("CameraMovementPresets: options 必須是物件。");
        }
        const position = finiteNumber(progress, "progress");
        const fraction = Math.min(1, Math.max(0, position));
        const eased = ease(fraction, options.easing);
        const camera = readCamera(initial_camera);
        camera.motion_blur_pixels = 0;

        switch (movement_id) {
            case "pan":
                camera.yaw = interpolate(numberOption(options, "from_yaw", camera.yaw - 0.6), numberOption(options, "to_yaw", camera.yaw + 0.6), eased);
                break;
            case "tilt":
                camera.pitch = interpolate(numberOption(options, "from_pitch", camera.pitch - 0.2), numberOption(options, "to_pitch", camera.pitch + 0.7), eased);
                break;
            case "zoom_in":
                camera.focal = interpolate(numberOption(options, "from_focal", camera.focal), numberOption(options, "to_focal", camera.focal * 2), eased);
                if (camera.focal <= 0) throw new RangeError("CameraMovementPresets: 焦距不能小於等於零。");
                break;
            case "dolly_in":
                camera.z = interpolate(numberOption(options, "from_z", camera.z), numberOption(options, "to_z", camera.z + 400), eased);
                break;
            case "tracking": {
                // 可由宿主用進度函式指定移動目標，不再修改 sceneState。
                const target = typeof options.target_at === "function"
                    ? readPoint(options.target_at(fraction), "target_at")
                    : (() => {
                        const start = readPoint(options.target_start || { x: 0, y: 0, z: 0 }, "target_start");
                        const end = readPoint(options.target_end || { x: 500, y: 0, z: 0 }, "target_end");
                        return { x: interpolate(start.x, end.x, fraction), y: interpolate(start.y, end.y, fraction), z: interpolate(start.z, end.z, fraction) };
                    })();
                const offset = readPoint(options.offset || { x: 0, y: 0, z: -500 }, "offset");
                camera.x = target.x + offset.x;
                camera.y = target.y + offset.y;
                camera.z = target.z + offset.z;
                break;
            }
            case "orbit": {
                const center = readPoint(options.center || { x: 0, y: 0, z: 500 }, "center");
                const radius = numberOption(options, "radius", 500);
                if (radius <= 0) throw new RangeError("CameraMovementPresets: radius 必須大於零。");
                const angle = numberOption(options, "start_angle", 0) + numberOption(options, "sweep_angle", Math.PI * 2) * eased;
                camera.x = center.x + Math.sin(angle) * radius;
                camera.z = center.z - Math.cos(angle) * radius;
                camera.y = numberOption(options, "camera_y", camera.y);
                camera.yaw = Math.atan2(center.x - camera.x, center.z - camera.z);
                if (options.aim_vertical === true) {
                    const horizontal_distance = Math.hypot(center.x - camera.x, center.z - camera.z);
                    camera.pitch = Math.atan2(center.y - camera.y, horizontal_distance);
                }
                break;
            }
            case "whip_pan": {
                const start = numberOption(options, "whip_start", 0.4);
                const end = numberOption(options, "whip_end", 0.55);
                if (start < 0 || end > 1 || end <= start) throw new RangeError("CameraMovementPresets: whip_start / whip_end 範圍不正確。");
                const whip_fraction = Math.min(1, Math.max(0, (fraction - start) / (end - start)));
                const transition = smoothstep(whip_fraction);
                camera.yaw = interpolate(numberOption(options, "from_yaw", camera.yaw), numberOption(options, "to_yaw", camera.yaw + 1.2), transition);
                camera.motion_blur_pixels = Math.max(0, numberOption(options, "max_blur_pixels", 90)) * Math.sin(Math.PI * whip_fraction);
                break;
            }
            case "rack_focus":
                camera.focus_depth = interpolate(numberOption(options, "from_focus_depth", 250), numberOption(options, "to_focus_depth", 500), eased);
                break;
            case "crane_up":
                camera.y = interpolate(numberOption(options, "from_y", camera.y), numberOption(options, "to_y", camera.y + 300), eased);
                camera.pitch = interpolate(numberOption(options, "from_pitch", camera.pitch), numberOption(options, "to_pitch", camera.pitch - 0.3), eased);
                break;
        }
        return camera;
    }

    global.SlowlyCameraMovementPresets = Object.freeze({
        version: "1.0.0",
        list() { return MOVEMENTS.map(movement => ({ ...movement })); },
        get(movement_id) {
            const movement = MOVEMENTS.find(item => item.id === movement_id);
            return movement ? { ...movement } : null;
        },
        calculate
    });
})(typeof window !== "undefined" ? window : globalThis);
