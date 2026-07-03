import * as XLSX from "xlsx";

export function toUtcMidnightIso(year, monthIndex, day) {
  const normalized = new Date(Date.UTC(year, monthIndex, day));
  return Number.isNaN(normalized.getTime()) ? null : normalized.toISOString();
}

/**
 * Normalizes any statement date cell to UTC midnight of its calendar day.
 * Statement rows are day-granular; forcing one timezone convention keeps
 * fingerprints and month-range queries from shifting by a day depending on
 * the server timezone or the source format (Excel serial vs. string).
 */
export function normalizeExcelDate(value) {
  if (value == null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    // XLSX cellDates and JS parsing can yield either UTC- or local-midnight
    // dates; pick whichever representation is a clean midnight.
    if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0) {
      return toUtcMidnightIso(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    }
    return toUtcMidnightIso(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "number") {
    const parseDateCode = XLSX?.SSF?.parse_date_code;
    if (typeof parseDateCode === "function") {
      const parsed = parseDateCode(value);
      if (!parsed) {
        return null;
      }
      return toUtcMidnightIso(parsed.y, parsed.m - 1, parsed.d);
    }
    // Fallback for environments where XLSX.SSF is unavailable.
    const excelEpoch = Date.UTC(1899, 11, 30);
    const millis = Math.round(value * 24 * 60 * 60 * 1000);
    const maybeDateFromSerial = new Date(excelEpoch + millis);
    if (Number.isNaN(maybeDateFromSerial.getTime())) {
      return null;
    }
    return toUtcMidnightIso(
      maybeDateFromSerial.getUTCFullYear(),
      maybeDateFromSerial.getUTCMonth(),
      maybeDateFromSerial.getUTCDate(),
    );
  }

  const raw = String(value).trim();
  // ISO YYYY-MM-DD → already UTC-day semantics.
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return toUtcMidnightIso(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  // Slash/dash numeric dates (assumes month-first, matching prior behavior).
  const numericMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (numericMatch) {
    const year = numericMatch[3].length === 2 ? 2000 + Number(numericMatch[3]) : Number(numericMatch[3]);
    return toUtcMidnightIso(year, Number(numericMatch[1]) - 1, Number(numericMatch[2]));
  }

  const maybeDate = new Date(raw);
  if (Number.isNaN(maybeDate.getTime())) {
    return null;
  }
  // Locale-parsed strings land at local midnight; use local components.
  return toUtcMidnightIso(maybeDate.getFullYear(), maybeDate.getMonth(), maybeDate.getDate());
}

export function getMonthDateRange(rawMonth) {
  if (!rawMonth) {
    return null;
  }
  const [yearText, monthText] = rawMonth.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return { start, end };
}

export function toMonthDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
