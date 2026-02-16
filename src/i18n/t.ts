const dictionary = {
  statsTitle: 'Stats',
  periodLabel: 'Period',
  day: 'Day',
  week: 'Week',
  month: 'Month',
  range: 'Range',
  selectDate: 'Select date',
  selectWeek: 'Select week',
  selectRange: 'Select range',
  selectMonth: 'Select month',
  done: 'Done',
  cancel: 'Cancel',
  loading: 'Loading...',
  noExpensesForSelectedPeriod: 'No expenses for selected period',
  selectRangeToViewStats: 'Select range to view stats',
  failedToLoadStats: 'Failed to load stats',
  previousYear: 'Previous year',
  nextYear: 'Next year',
} as const;

export type TranslationKey = keyof typeof dictionary;

export function t(key: TranslationKey) {
  return dictionary[key];
}
