/**
 * Calendar Custom
 * Version: 1.0.0
 *
 * User-defined calendar event CRUD module.
 *
 * Storage:
 * - localStorage
 *
 * Supports:
 * - Gregorian events
 * - Lunar events
 * - One-time events
 * - Yearly recurring events
 * - Create / read / update / delete
 * - Date lookup
 *
 * Optional dependency:
 * - lunar.js
 *   Required only when lunar events are queried by Gregorian date.
 *
 * Title rules:
 * - Required
 * - 1–5 Unicode letters/numbers
 * - No spaces or special characters
 * - 2 characters recommended for calendar display
 */

(function (global) {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_NAMESPACE = "calendar-custom";
  const TITLE_MAX_LENGTH = 5;
  const TITLE_RECOMMENDED_LENGTH = 2;

  function create(options = {}) {
    const namespace =
      typeof options.namespace === "string" && options.namespace.trim()
        ? options.namespace.trim()
        : DEFAULT_NAMESPACE;

    const storageKey = `${namespace}:events`;

    function readStorage() {
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        return [];
      }

      try {
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    }

    function writeStorage(events) {
      localStorage.setItem(storageKey, JSON.stringify(events));
    }

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function createId() {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
      );
    }

    function nowISO() {
      return new Date().toISOString();
    }

    function pad2(value) {
      return String(value).padStart(2, "0");
    }

    function formatGregorianDate(year, month, day) {
      return (
        `${String(year).padStart(4, "0")}-` +
        `${pad2(month)}-` +
        `${pad2(day)}`
      );
    }

    function parseGregorianDate(value) {
      if (typeof value !== "string") {
        return null;
      }

      const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

      if (!match) {
        return null;
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const date = new Date(
        Date.UTC(year, month - 1, day)
      );

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        return null;
      }

      return {
        year,
        month,
        day,
        value: formatGregorianDate(year, month, day)
      };
    }

    function normalizeTitle(title) {
      if (typeof title !== "string") {
        throw new TypeError("title must be a string.");
      }

      const value = title.trim();

      if (!value) {
        throw new Error("title is required.");
      }

      if (Array.from(value).length > TITLE_MAX_LENGTH) {
        throw new Error(
          `title must not exceed ${TITLE_MAX_LENGTH} characters.`
        );
      }

      if (!/^[\p{L}\p{N}]+$/u.test(value)) {
        throw new Error(
          "title may contain letters and numbers only."
        );
      }

      return value;
    }

    function getTitleAdvice(title) {
      if (typeof title !== "string") {
        return null;
      }

      const value = title.trim();

      if (!value) {
        return null;
      }

      if (
        Array.from(value).length ===
        TITLE_RECOMMENDED_LENGTH
      ) {
        return null;
      }

      return "建議使用 2 個字，日曆顯示效果較佳。";
    }

    function normalizeNote(note) {
      if (note == null) {
        return "";
      }

      if (typeof note !== "string") {
        throw new TypeError("note must be a string.");
      }

      return note.trim();
    }

    function normalizeYearly(yearly) {
      if (yearly == null) {
        return false;
      }

      if (typeof yearly !== "boolean") {
        throw new TypeError("yearly must be a boolean.");
      }

      return yearly;
    }

    function normalizeSolar(input) {
      const parsed = parseGregorianDate(input.date);

      if (!parsed) {
        throw new Error(
          "solar event requires a valid date in YYYY-MM-DD format."
        );
      }

      return {
        calendar: "solar",
        date: parsed.value,
        lunarYear: null,
        lunarMonth: null,
        lunarDay: null,
        isLeapMonth: false
      };
    }

    function normalizeLunar(input) {
      const lunarYear =
        input.lunarYear == null
          ? null
          : Number(input.lunarYear);

      const lunarMonth = Number(input.lunarMonth);
      const lunarDay = Number(input.lunarDay);

      if (
        !Number.isInteger(lunarMonth) ||
        lunarMonth < 1 ||
        lunarMonth > 12
      ) {
        throw new Error(
          "lunarMonth must be an integer from 1 to 12."
        );
      }

      if (
        !Number.isInteger(lunarDay) ||
        lunarDay < 1 ||
        lunarDay > 30
      ) {
        throw new Error(
          "lunarDay must be an integer from 1 to 30."
        );
      }

      if (
        input.isLeapMonth != null &&
        typeof input.isLeapMonth !== "boolean"
      ) {
        throw new TypeError(
          "isLeapMonth must be a boolean."
        );
      }

      if (
        input.yearly !== true &&
        !Number.isInteger(lunarYear)
      ) {
        throw new Error(
          "non-yearly lunar event requires lunarYear."
        );
      }

      return {
        calendar: "lunar",
        date: null,
        lunarYear,
        lunarMonth,
        lunarDay,
        isLeapMonth: input.isLeapMonth === true
      };
    }

    function normalizeCalendar(input) {
      if (input.calendar === "solar") {
        return normalizeSolar(input);
      }

      if (input.calendar === "lunar") {
        return normalizeLunar(input);
      }

      throw new Error(
        'calendar must be either "solar" or "lunar".'
      );
    }

    function normalizeInput(input) {
      if (!input || typeof input !== "object") {
        throw new TypeError("event must be an object.");
      }

      return {
        ...normalizeCalendar(input),
        yearly: normalizeYearly(input.yearly),
        title: normalizeTitle(input.title),
        note: normalizeNote(input.note)
      };
    }

    function all() {
      return clone(readStorage());
    }

    function get(id) {
      if (typeof id !== "string" || !id) {
        return null;
      }

      const event = readStorage().find(
        item => item.id === id
      );

      return event ? clone(event) : null;
    }

    function add(input) {
      const normalized = normalizeInput(input);
      const events = readStorage();
      const timestamp = nowISO();

      const event = {
        id: createId(),
        ...normalized,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      events.push(event);
      writeStorage(events);

      return clone(event);
    }

    function update(id, changes) {
      if (typeof id !== "string" || !id) {
        throw new Error("id is required.");
      }

      if (!changes || typeof changes !== "object") {
        throw new TypeError("changes must be an object.");
      }

      const events = readStorage();
      const index = events.findIndex(
        item => item.id === id
      );

      if (index === -1) {
        return null;
      }

      const current = events[index];

      const merged = {
        ...current,
        ...changes
      };

      const normalized = normalizeInput(merged);

      const updated = {
        id: current.id,
        ...normalized,
        createdAt: current.createdAt,
        updatedAt: nowISO()
      };

      events[index] = updated;
      writeStorage(events);

      return clone(updated);
    }

    function remove(id) {
      if (typeof id !== "string" || !id) {
        return false;
      }

      const events = readStorage();
      const index = events.findIndex(
        item => item.id === id
      );

      if (index === -1) {
        return false;
      }

      events.splice(index, 1);
      writeStorage(events);

      return true;
    }

    function clear() {
      localStorage.removeItem(storageKey);
    }

    function matchesSolarEvent(event, target) {
      const eventDate = parseGregorianDate(event.date);

      if (!eventDate) {
        return false;
      }

      if (event.yearly) {
        return (
          eventDate.month === target.month &&
          eventDate.day === target.day
        );
      }

      return event.date === target.value;
    }

    function getLunarForGregorian(target) {
      if (
        !global.Lunar ||
        typeof global.Lunar.toLunar !== "function"
      ) {
        throw new Error(
          "Lunar events require lunar.js to be loaded."
        );
      }

      return global.Lunar.toLunar(target.value);
    }

    function readLunarField(lunar, names) {
      for (const name of names) {
        if (lunar[name] != null) {
          return lunar[name];
        }
      }

      return undefined;
    }

    function normalizeLunarResult(lunar) {
      if (!lunar || typeof lunar !== "object") {
        return null;
      }

      const month = Number(
        readLunarField(lunar, [
          "month",
          "lunarMonth"
        ])
      );

      const day = Number(
        readLunarField(lunar, [
          "day",
          "lunarDay"
        ])
      );

      const yearValue = readLunarField(lunar, [
        "year",
        "lunarYear"
      ]);

      const year =
        yearValue == null ? null : Number(yearValue);

      const leapValue = readLunarField(lunar, [
        "isLeapMonth",
        "isLeap",
        "leap"
      ]);

      if (
        !Number.isInteger(month) ||
        !Number.isInteger(day)
      ) {
        return null;
      }

      return {
        year:
          Number.isInteger(year) ? year : null,
        month,
        day,
        isLeapMonth: leapValue === true
      };
    }

    function matchesLunarEvent(event, lunar) {
      if (!lunar) {
        return false;
      }

      if (
        event.lunarMonth !== lunar.month ||
        event.lunarDay !== lunar.day ||
        event.isLeapMonth !== lunar.isLeapMonth
      ) {
        return false;
      }

      if (event.yearly) {
        return true;
      }

      return (
        Number.isInteger(event.lunarYear) &&
        Number.isInteger(lunar.year) &&
        event.lunarYear === lunar.year
      );
    }

    function getByDate(date) {
      const target = parseGregorianDate(date);

      if (!target) {
        throw new Error(
          "date must be a valid YYYY-MM-DD date."
        );
      }

      const events = readStorage();
      const result = [];

      for (const event of events) {
        if (
          event.calendar === "solar" &&
          matchesSolarEvent(event, target)
        ) {
          result.push(clone(event));
        }
      }

      const lunarEvents = events.filter(
        event => event.calendar === "lunar"
      );

      if (lunarEvents.length > 0) {
        const lunar = normalizeLunarResult(
          getLunarForGregorian(target)
        );

        for (const event of lunarEvents) {
          if (matchesLunarEvent(event, lunar)) {
            result.push(clone(event));
          }
        }
      }

      return result;
    }

    function has(date) {
      return getByDate(date).length > 0;
    }

    function getStorageKey() {
      return storageKey;
    }

    return Object.freeze({
      VERSION,
      TITLE_MAX_LENGTH,
      TITLE_RECOMMENDED_LENGTH,

      all,
      get,
      add,
      update,
      remove,
      clear,

      getByDate,
      has,

      getTitleAdvice,
      getStorageKey
    });
  }

  global.CalendarCustom = Object.freeze({
    VERSION,
    TITLE_MAX_LENGTH,
    TITLE_RECOMMENDED_LENGTH,
    create
  });
})(globalThis);