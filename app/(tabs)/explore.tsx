import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getCategoryColor, getCategoryLabel } from '@/src/constants/categories';
import { getCategoryTotals, getTotal } from '@/src/db/analytics';
import { t } from '@/src/i18n/t';
import { useCurrency } from '@/src/providers/CurrencyProvider';
import { colors, radius, spacing } from '@/src/theme';
import {
  addDays,
  AnalyticsPeriod,
  getDayRange,
  getMonthRange,
  getRangeRange,
  getStartOfWeekMonday,
  getWeekRange,
  toISODateOnly,
} from '@/src/utils/dateRanges';
import { formatMoney } from '@/src/utils/money';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { DonutChart } from '@/src/ui/DonutChart';
import { Screen } from '@/src/ui/Screen';

type CategoryTotal = {
  category: string;
  total: number;
};

type MonthOption = {
  index: number;
  label: string;
};

type MarkedDateMap = Record<
  string,
  {
    selected?: boolean;
    selectedColor?: string;
    startingDay?: boolean;
    endingDay?: boolean;
    color?: string;
    textColor?: string;
  }
>;

const PERIOD_OPTIONS: AnalyticsPeriod[] = ['day', 'week', 'month', 'range'];

function parseISODate(dateISO: string) {
  const parsed = new Date(`${dateISO}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDayButton(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatWeekDayPart(date: Date) {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = date.toLocaleDateString('en-GB', { day: 'numeric' });
  return `${weekday} ${day}`;
}

function formatMonthButton(date: Date) {
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function formatRangeButton(start: Date, end: Date) {
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;

  const fromLabel = from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const toLabel = to.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return `${fromLabel} - ${toLabel}`;
}

function createWeekMarkedDates(weekStart: Date): MarkedDateMap {
  const marked: MarkedDateMap = {};

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const iso = toISODateOnly(date);
    marked[iso] = {
      startingDay: i === 0,
      endingDay: i === 6,
      color: colors.fab,
      textColor: colors.white,
    };
  }

  return marked;
}

function createRangeMarkedDates(start: Date | null, end: Date | null): MarkedDateMap {
  if (!start) return {};

  const marked: MarkedDateMap = {};

  if (!end) {
    const iso = toISODateOnly(start);
    marked[iso] = {
      startingDay: true,
      endingDay: true,
      color: colors.fab,
      textColor: colors.white,
    };

    return marked;
  }

  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const days = Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
  );

  for (let i = 0; i <= days; i += 1) {
    const date = addDays(from, i);
    const iso = toISODateOnly(date);
    marked[iso] = {
      startingDay: i === 0,
      endingDay: i === days,
      color: colors.fab,
      textColor: colors.white,
    };
  }

  return marked;
}

export default function AnalyticsScreen() {
  const { currencyCode } = useCurrency();
  const now = useMemo(() => new Date(), []);
  const [periodType, setPeriodType] = useState<AnalyticsPeriod>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getStartOfWeekMonday(now));
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isPeriodMenuVisible, setPeriodMenuVisible] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(now.getFullYear());

  const contentTransition = useSharedValue(1);
  const requestIdRef = useRef(0);

  const monthOptions = useMemo<MonthOption[]>(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        index,
        label: new Date(2000, index, 1).toLocaleDateString('en-GB', { month: 'long' }),
      })),
    []
  );

  const selectedPeriodLabel = useMemo(() => t(periodType), [periodType]);

  const rightButtonLabel = useMemo(() => {
    if (periodType === 'day') {
      return formatDayButton(selectedDate);
    }

    if (periodType === 'week') {
      const weekEnd = addDays(selectedWeekStart, 6);
      return `${formatWeekDayPart(selectedWeekStart)} - ${formatWeekDayPart(weekEnd)}`;
    }

    if (periodType === 'month') {
      return formatMonthButton(selectedMonth);
    }

    if (rangeStart && rangeEnd) {
      return formatRangeButton(rangeStart, rangeEnd);
    }

    return t('selectRange');
  }, [periodType, rangeEnd, rangeStart, selectedDate, selectedMonth, selectedWeekStart]);

  const activeRange = useMemo(() => {
    if (periodType === 'day') {
      return getDayRange(selectedDate);
    }

    if (periodType === 'week') {
      return getWeekRange(selectedWeekStart);
    }

    if (periodType === 'month') {
      return getMonthRange(selectedMonth);
    }

    if (rangeStart && rangeEnd) {
      return getRangeRange(rangeStart, rangeEnd);
    }

    return null;
  }, [periodType, rangeEnd, rangeStart, selectedDate, selectedMonth, selectedWeekStart]);

  const hasCompleteRange = periodType !== 'range' || !!(rangeStart && rangeEnd);
  const fromISO = activeRange?.fromISO ?? '';
  const toISO = activeRange?.toISO ?? '';

  const runTransitionOut = useCallback(() => {
    contentTransition.value = withTiming(0.35, {
      duration: 110,
      easing: Easing.out(Easing.quad),
    });
  }, [contentTransition]);

  const runTransitionIn = useCallback(() => {
    contentTransition.value = withTiming(1, {
      duration: 230,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentTransition]);

  const loadAnalytics = useCallback(
    async (nextFromISO: string, nextToISO: string, shouldLoad: boolean) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setError('');

      runTransitionOut();

      if (!shouldLoad) {
        setCategoryTotals([]);
        setTotal(0);
        setIsLoading(false);
        runTransitionIn();
        return;
      }

      try {
        setIsLoading(true);

        const [totals, overall] = await Promise.all([
          getCategoryTotals(nextFromISO, nextToISO),
          getTotal(nextFromISO, nextToISO),
        ]);

        if (requestId !== requestIdRef.current) return;

        setCategoryTotals(totals);
        setTotal(overall);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError(t('failedToLoadStats'));
      } finally {
        if (requestId !== requestIdRef.current) return;
        setIsLoading(false);
        runTransitionIn();
      }
    },
    [runTransitionIn, runTransitionOut]
  );

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics(fromISO, toISO, hasCompleteRange);
    }, [fromISO, hasCompleteRange, loadAnalytics, toISO])
  );

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentTransition.value,
    transform: [{ scale: 0.985 + contentTransition.value * 0.015 }],
  }));

  const donutData = useMemo(
    () =>
      categoryTotals.map((item) => ({
        label: item.category,
        value: item.total,
        color: getCategoryColor(item.category),
      })),
    [categoryTotals]
  );

  const pickerTitle = useMemo(() => {
    if (periodType === 'day') return t('selectDate');
    if (periodType === 'week') return t('selectWeek');
    if (periodType === 'month') return t('selectMonth');
    return t('selectRange');
  }, [periodType]);

  const calendarCurrent = useMemo(() => {
    if (periodType === 'day') return toISODateOnly(selectedDate);
    if (periodType === 'week') return toISODateOnly(selectedWeekStart);
    if (rangeStart) return toISODateOnly(rangeStart);
    return toISODateOnly(new Date());
  }, [periodType, rangeStart, selectedDate, selectedWeekStart]);

  const calendarMarkedDates = useMemo<MarkedDateMap>(() => {
    if (periodType === 'day') {
      return {
        [toISODateOnly(selectedDate)]: {
          selected: true,
          selectedColor: colors.fab,
        },
      };
    }

    if (periodType === 'week') {
      return createWeekMarkedDates(selectedWeekStart);
    }

    return createRangeMarkedDates(rangeStart, rangeEnd);
  }, [periodType, rangeEnd, rangeStart, selectedDate, selectedWeekStart]);

  const calendarMarkingType = periodType === 'day' ? undefined : 'period';

  const handleChangePeriodType = useCallback(
    (nextPeriod: AnalyticsPeriod) => {
      setPeriodType(nextPeriod);
      setPeriodMenuVisible(false);

      if (nextPeriod === 'month') {
        setMonthPickerYear(selectedMonth.getFullYear());
      }
    },
    [selectedMonth]
  );

  const handleOpenPicker = useCallback(() => {
    if (periodType === 'month') {
      setMonthPickerYear(selectedMonth.getFullYear());
    }

    setPickerVisible(true);
  }, [periodType, selectedMonth]);

  const handleCalendarDayPress = useCallback(
    (day: DateData) => {
      const picked = parseISODate(day.dateString);

      if (periodType === 'day') {
        setSelectedDate(picked);
        setPickerVisible(false);
        return;
      }

      if (periodType === 'week') {
        setSelectedWeekStart(getStartOfWeekMonday(picked));
        setPickerVisible(false);
        return;
      }

      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(picked);
        setRangeEnd(null);
        return;
      }

      if (picked < rangeStart) {
        setRangeStart(picked);
        setRangeEnd(rangeStart);
      } else {
        setRangeEnd(picked);
      }

      setPickerVisible(false);
    },
    [periodType, rangeEnd, rangeStart]
  );

  const handleSelectMonth = useCallback((monthIndex: number) => {
    setSelectedMonth(new Date(monthPickerYear, monthIndex, 1));
    setPickerVisible(false);
  }, [monthPickerYear]);

  return (
    <Screen scroll contentStyle={styles.container}>
      <AppText variant="title">{t('statsTitle')}</AppText>

      <Card style={styles.controlsCard}>
        <View style={styles.controlsRow}>
          <Pressable style={styles.periodDropdown} onPress={() => setPeriodMenuVisible(true)}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('periodLabel')}
            </AppText>
            <View style={styles.dropdownValueRow}>
              <AppText variant="body" style={styles.dropdownValue}>
                {selectedPeriodLabel}
              </AppText>
            </View>
          </Pressable>

          <Pressable style={styles.periodValueButton} onPress={handleOpenPicker}>
            <AppText variant="caption" color={colors.textSecondary}>
              {selectedPeriodLabel}
            </AppText>
            <AppText variant="body" style={styles.periodValueText}>
              {rightButtonLabel}
            </AppText>
          </Pressable>
        </View>
      </Card>

      <Animated.View style={animatedContentStyle}>
        <Card style={styles.chartCard}>
          <DonutChart data={donutData} total={total} currencyCode={currencyCode} size={230} strokeWidth={46} />
        </Card>

        {isLoading && (
          <AppText variant="body" color={colors.textSecondary} style={styles.infoText}>
            {t('loading')}
          </AppText>
        )}
        {!!error && (
          <AppText variant="caption" color={colors.danger} style={styles.infoText}>
            {error}
          </AppText>
        )}
        {!isLoading && !error && !hasCompleteRange && (
          <AppText variant="body" color={colors.textSecondary} style={styles.infoText}>
            {t('selectRangeToViewStats')}
          </AppText>
        )}
        {!isLoading && !error && hasCompleteRange && categoryTotals.length === 0 && (
          <AppText variant="body" color={colors.textSecondary} style={styles.infoText}>
            {t('noExpensesForSelectedPeriod')}
          </AppText>
        )}

        <View style={styles.list}>
          {categoryTotals.map((item, index) => {
            const percent = total > 0 ? (item.total / total) * 100 : 0;

            return (
              <Animated.View
                key={item.category}
                layout={LinearTransition.duration(240)}
                entering={FadeInUp.duration(220)
                  .delay(Math.min(index * 30, 140))
                  .withInitialValues({
                    opacity: 0,
                    transform: [{ translateY: 6 }],
                  })}
                exiting={FadeOut.duration(140)}>
                <Card style={styles.rowCard}>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View
                        style={[styles.colorDot, { backgroundColor: getCategoryColor(item.category) }]}
                      />
                      <AppText variant="body">{getCategoryLabel(item.category)}</AppText>
                    </View>
                    <View style={styles.rowRight}>
                      <AppText variant="body" style={styles.amountText}>
                        {formatMoney(item.total, currencyCode)}
                      </AppText>
                      <AppText variant="caption" color={colors.textSecondary}>
                        {percent.toFixed(1)}%
                      </AppText>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      <Modal
        visible={isPeriodMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodMenuVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPeriodMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            {PERIOD_OPTIONS.map((option) => {
              const selected = option === periodType;
              return (
                <Pressable
                  key={option}
                  onPress={() => handleChangePeriodType(option)}
                  style={[styles.menuItem, selected && styles.menuItemSelected]}>
                  <AppText
                    variant="body"
                    color={selected ? colors.white : colors.textPrimary}
                    style={selected ? styles.menuItemSelectedText : undefined}>
                    {t(option)}
                  </AppText>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <AppText variant="subtitle">{pickerTitle}</AppText>
              <Pressable onPress={() => setPickerVisible(false)} hitSlop={8}>
                <AppText variant="body" color={colors.textSecondary}>
                  {t('cancel')}
                </AppText>
              </Pressable>
            </View>

            {periodType === 'month' ? (
              <View>
                <View style={styles.yearRow}>
                  <Pressable
                    onPress={() => setMonthPickerYear((prev) => prev - 1)}
                    style={styles.yearControl}>
                    <AppText variant="body">{'<'}</AppText>
                  </Pressable>
                  <AppText variant="subtitle">{monthPickerYear}</AppText>
                  <Pressable
                    onPress={() => setMonthPickerYear((prev) => prev + 1)}
                    style={styles.yearControl}>
                    <AppText variant="body">{'>'}</AppText>
                  </Pressable>
                </View>

                <View style={styles.monthGrid}>
                  {monthOptions.map((monthOption) => {
                    const selected =
                      selectedMonth.getFullYear() === monthPickerYear &&
                      selectedMonth.getMonth() === monthOption.index;

                    return (
                      <Pressable
                        key={monthOption.index}
                        onPress={() => handleSelectMonth(monthOption.index)}
                        style={[styles.monthButton, selected && styles.monthButtonSelected]}>
                        <AppText
                          variant="caption"
                          color={selected ? colors.white : colors.textPrimary}
                          style={[styles.monthButtonText, selected && styles.monthButtonSelectedText]}>
                          {monthOption.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Calendar
                current={calendarCurrent}
                firstDay={1}
                markingType={calendarMarkingType}
                markedDates={calendarMarkedDates}
                onDayPress={handleCalendarDayPress}
                theme={{
                  backgroundColor: colors.card,
                  calendarBackground: colors.card,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.fab,
                  selectedDayTextColor: colors.white,
                  dayTextColor: colors.textPrimary,
                  textDisabledColor: colors.border,
                  monthTextColor: colors.textPrimary,
                  arrowColor: colors.textPrimary,
                  todayTextColor: colors.fab,
                  textMonthFontWeight: '700',
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    paddingBottom: spacing.xxxl,
  },
  controlsCard: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodDropdown: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownValueRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dropdownValue: {
    fontWeight: '700',
  },
  periodValueButton: {
    flex: 1.3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  periodValueText: {
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  chartCard: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  infoText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  list: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  rowCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.md,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.round,
    marginRight: spacing.sm,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  menuItem: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuItemSelected: {
    backgroundColor: colors.fab,
  },
  menuItemSelectedText: {
    fontWeight: '700',
  },
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pickerHeader: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  yearControl: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    rowGap: spacing.sm,
  },
  monthButton: {
    width: '33.33%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthButtonSelected: {
    backgroundColor: colors.fab,
    borderColor: colors.fab,
  },
  monthButtonSelectedText: {
    fontWeight: '700',
  },
  monthButtonText: {
    textAlign: 'center',
  },
});
