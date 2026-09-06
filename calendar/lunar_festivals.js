/*
 * Lunar Festivals
 * 農曆節日查詢模組
 *
 * Version: 1.0.0
 * Data version: LunarFestivalsData.VERSION
 *
 * ============================================================
 * 職責
 * ============================================================
 *
 * 1. 呼叫既有 Lunar 模組取得農曆日期。
 * 2. 依 lunar_festivals_data.js 判斷固定農曆節日。
 * 3. 處理「除夕 = 農曆十二月最後一日」的動態規則。
 * 4. 排除閏月重複產生固定節日。
 *
 * ============================================================
 * 禁止事項
 * ============================================================
 *
 * - 不重新實作農曆換算。
 * - 不自行推算閏月、大小月或農曆年邊界。
 * - 不處理清明；清明屬 SolarTerms。
 * - 不處理國定假日、補假、補班、連假或政府行政日曆。
 * - 不把閏月同月同日自動視為同一節日。
 * - 不超出 Lunar 的可靠支援範圍自行猜測。
 *
 * Festival ≠ Holiday ≠ Day Off
 */

(function (global) {
    "use strict";

    if (!global.LunarFestivalsData) {
        throw new Error("LunarFestivals requires lunar_festivals_data.js");
    }

    if (!global.Lunar) {
        throw new Error("LunarFestivals requires lunar.js");
    }

    const DATA = global.LunarFestivalsData;

    function cloneFestival(rule, extra) {
        return Object.assign({
            id: rule.id,
            name: rule.name,
            type: "lunar",
            source: "LunarFestivals"
        }, extra || {});
    }

    function readLunarFields(lunar) {
        if (!lunar || typeof lunar !== "object") {
            throw new TypeError("Invalid lunar date object");
        }

        const year = lunar.lunarYear ?? lunar.year;
        const month = lunar.lunarMonth ?? lunar.month;
        const day = lunar.lunarDay ?? lunar.day;
        const isLeapMonth = Boolean(
            lunar.isLeapMonth ??
            lunar.isLeap ??
            lunar.leap ??
            false
        );

        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
            throw new TypeError("Lunar result does not contain usable year/month/day fields");
        }

        return { year, month, day, isLeapMonth };
    }

    function isSupportedDate(date) {
        if (typeof global.Lunar.isSupportedGregorian === "function") {
            return global.Lunar.isSupportedGregorian(date);
        }

        try {
            global.Lunar.toLunar(date);
            return true;
        } catch (error) {
            return false;
        }
    }

    function getByLunar(lunar) {
        const value = readLunarFields(lunar);
        const results = [];

        // 固定農曆節日只適用於非閏月。
        if (!value.isLeapMonth) {
            for (const rule of DATA.FIXED) {
                if (rule.month === value.month && rule.day === value.day) {
                    results.push(cloneFestival(rule, {
                        lunarYear: value.year,
                        lunarMonth: value.month,
                        lunarDay: value.day,
                        isLeapMonth: false,
                        rule: "FIXED_LUNAR_DATE"
                    }));
                }
            }
        }

        // 除夕：農曆十二月最後一天，不固定為十二月三十。
        if (!value.isLeapMonth && value.month === 12) {
            const lastDay = global.Lunar.getMonthDays(value.year, 12, false);

            if (value.day === lastDay) {
                const rule = DATA.DYNAMIC.find(
                    item => item.rule === "LAST_DAY_OF_LUNAR_YEAR"
                );

                if (rule) {
                    results.push(cloneFestival(rule, {
                        lunarYear: value.year,
                        lunarMonth: value.month,
                        lunarDay: value.day,
                        isLeapMonth: false,
                        rule: rule.rule
                    }));
                }
            }
        }

        return results;
    }

    function get(date) {
        if (!isSupportedDate(date)) {
            throw new RangeError("Date is outside Lunar supported range or invalid");
        }

        const lunar = global.Lunar.toLunar(date);
        return getByLunar(lunar);
    }

    function has(date) {
        return get(date).length > 0;
    }

    function getNames(date) {
        return get(date).map(item => item.name);
    }

    const LunarFestivals = Object.freeze({
        VERSION: "1.0.0",
        DATA_VERSION: DATA.VERSION,
        get,
        getByLunar,
        getNames,
        has,
        isSupportedDate
    });

    global.LunarFestivals = LunarFestivals;
})(typeof window !== "undefined" ? window : globalThis);
