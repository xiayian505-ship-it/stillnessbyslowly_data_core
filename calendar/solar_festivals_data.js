/**
 * Solar Festivals Data
 * Version: 0.1.0
 *
 * Common fixed-date Gregorian festivals used by this project.
 *
 * This is a curated project dataset.
 * It is NOT an official Taiwan government holiday calendar.
 *
 * Excludes:
 * - Lunar festivals
 * - Solar terms
 * - Weekday-based festivals
 * - Government substitute holidays
 * - Make-up workdays
 */

(function (global) {
  "use strict";

  const VERSION = "0.1.0";

  const FESTIVALS = Object.freeze({
    "01-01": Object.freeze(["元旦"]),
    "02-14": Object.freeze(["西洋情人節"]),
    "02-28": Object.freeze(["和平紀念日"]),
    "03-08": Object.freeze(["婦女節"]),
    "03-14": Object.freeze(["白色情人節"]),
    "04-01": Object.freeze(["愚人節"]),
    "04-04": Object.freeze(["兒童節"]),
    "05-01": Object.freeze(["勞動節"]),
    "09-03": Object.freeze(["軍人節"]),
    "09-28": Object.freeze(["教師節"]),
    "10-10": Object.freeze(["國慶日"]),
    "10-25": Object.freeze(["臺灣光復節"]),
    "10-31": Object.freeze(["萬聖節"]),
    "12-24": Object.freeze(["平安夜"]),
    "12-25": Object.freeze(["聖誕節", "行憲紀念日"])
  });

  global.SolarFestivalsData = Object.freeze({
    VERSION,
    FESTIVALS
  });
})(globalThis);