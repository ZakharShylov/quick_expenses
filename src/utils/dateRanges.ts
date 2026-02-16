export type AnalyticsPeriod = 'day' | 'week' | 'month';

type DateRange = {
  fromISO: string;
  toISO: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
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

function getStartOfWeekMonday(date: Date) {
  const currentDay = date.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  return startOfDay(addDays(date, diffToMonday));
}

export function getDateRange(period: AnalyticsPeriod): DateRange {
  const now = new Date();

  if (period === 'day') {
    const from = startOfDay(now);
    const to = addDays(from, 1);
    return { fromISO: formatISODate(from), toISO: formatISODate(to) };
  }

  if (period === 'week') {
    const from = getStartOfWeekMonday(now);
    const to = addDays(from, 7);
    return { fromISO: formatISODate(from), toISO: formatISODate(to) };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { fromISO: formatISODate(from), toISO: formatISODate(to) };
}

export function toISODateOnly(date: Date) {
  return formatISODate(date);
}
