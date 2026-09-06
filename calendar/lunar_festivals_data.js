/*
 * Lunar Festivals Data
 * 農曆節日規則資料
 *
 * Version: 0.1.0
 *
 * 職責：
 * - 保存 LunarFestivals 使用的節日名稱與規則。
 * - 不進行國曆／農曆換算。
 * - 不處理放假、補假、補班或政府行政日曆。
 *
 * 依據：
 * - lunar_festivals_reference.txt
 *
 * 設計原則：
 * 正確性 > 可追溯性 > 可讀性 > 收錄數量
 */

(function (global) {
    "use strict";

    const FIXED = Object.freeze([
        Object.freeze({ id: "spring-festival", month: 1, day: 1, name: "春節" }),
        Object.freeze({ id: "lunar-01-02", month: 1, day: 2, name: "初二" }),
        Object.freeze({ id: "lunar-01-03", month: 1, day: 3, name: "初三" }),
        Object.freeze({ id: "lunar-01-04", month: 1, day: 4, name: "初四" }),
        Object.freeze({ id: "start-work", month: 1, day: 5, name: "開工" }),
        Object.freeze({ id: "lantern-festival", month: 1, day: 15, name: "元宵節" }),
        Object.freeze({ id: "dragon-boat-festival", month: 5, day: 5, name: "端午節" }),
        Object.freeze({ id: "qixi", month: 7, day: 7, name: "七夕" }),
        Object.freeze({ id: "ghost-festival", month: 7, day: 15, name: "中元節" }),
        Object.freeze({ id: "mid-autumn-festival", month: 8, day: 15, name: "中秋節" }),
        Object.freeze({ id: "double-ninth-festival", month: 9, day: 9, name: "重陽節" })
    ]);

    const DYNAMIC = Object.freeze([
        Object.freeze({
            id: "lunar-new-years-eve",
            name: "除夕",
            rule: "LAST_DAY_OF_LUNAR_YEAR"
        })
    ]);

    const LunarFestivalsData = Object.freeze({
        VERSION: "0.1.0",
        FIXED,
        DYNAMIC
    });

    global.LunarFestivalsData = LunarFestivalsData;
})(typeof window !== "undefined" ? window : globalThis);
