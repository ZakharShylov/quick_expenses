export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'range';

type DateRange = {
  fromISO: string;
  toISO: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getStartOfWeekMonday(date: Date) {
  const currentDay = date.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  return startOfDay(addDays(date, diffToMonday));
}

export function toISODateOnly(date: Date) {
  return formatISODate(date);
}

export function getDayRange(date: Date): DateRange {
  const from = startOfDay(date);
  const to = addDays(from, 1);

  return { fromISO: formatISODate(from), toISO: formatISODate(to) };
}

export function getWeekRange(weekStartDate: Date): DateRange {
  const from = getStartOfWeekMonday(weekStartDate);
  const to = addDays(from, 7);

  return { fromISO: formatISODate(from), toISO: formatISODate(to) };
}

export function getMonthRange(monthDate: Date): DateRange {
  const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  return { fromISO: formatISODate(from), toISO: formatISODate(to) };
}

export function getRangeRange(rangeStart: Date, rangeEnd: Date): DateRange {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const from = start <= end ? start : end;
  const toInclusive = start <= end ? end : start;
  const toExclusive = addDays(toInclusive, 1);

  return { fromISO: formatISODate(from), toISO: formatISODate(toExclusive) };
}

export function getDateRange(period: AnalyticsPeriod): DateRange {
  const now = new Date();

  if (period === 'day') {
    return getDayRange(now);
  }

  if (period === 'week') {
    return getWeekRange(now);
  }

  if (period === 'month') {
    return getMonthRange(now);
  }

  return getDayRange(now);
}
