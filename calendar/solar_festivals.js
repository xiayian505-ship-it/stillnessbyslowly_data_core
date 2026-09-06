/**
 * Solar Festivals
 * Version: 1.0.0
 *
 * Fixed-date Gregorian festival lookup.
 *
 * Depends on:
 * - solar_festivals_data.js
 */

(function (global) {
  "use strict";

  if (!global.SolarFestivalsData) {
    throw new Error(
      "SolarFestivals requires solar_festivals_data.js to be loaded first."
    );
  }

  const VERSION = "1.0.0";
  const DATA = global.SolarFestivalsData.FESTIVALS;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function isValidGregorianDate(year, month, day) {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return false;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  function parseDate(input) {
    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) {
        return null;
      }

      return {
        year: input.getFullYear(),
        month: input.getMonth() + 1,
        day: input.getDate()
      };
    }

    if (typeof input !== "string") {
      return null;
    }

    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!isValidGregorianDate(year, month, day)) {
      return null;
    }

    return {
      year,
      month,
      day
    };
  }

  function getByMonthDay(month, day) {
    if (
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const key = `${pad2(month)}-${pad2(day)}`;
    const names = DATA[key];

    if (!names) {
      return null;
    }

    return {
      month,
      day,
      key,
      names: [...names]
    };
  }

  function get(date) {
    const parsed = parseDate(date);

    if (!parsed) {
      return null;
    }

    const festival = getByMonthDay(parsed.month, parsed.day);

    if (!festival) {
      return null;
    }

    return {
      date:
        `${String(parsed.year).padStart(4, "0")}-` +
        `${pad2(parsed.month)}-` +
        `${pad2(parsed.day)}`,
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      names: festival.names
    };
  }

  function getNames(date) {
    const result = get(date);

    return result ? result.names : [];
  }

  function has(date) {
    return get(date) !== null;
  }

  global.SolarFestivals = Object.freeze({
    VERSION,
    get,
    getByMonthDay,
    getNames,
    has
  });
})(globalThis);