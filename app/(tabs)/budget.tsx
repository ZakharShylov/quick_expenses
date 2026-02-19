import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, TouchableWithoutFeedback, View } from 'react-native';

import { getTopSpendingDays, getTotal, TopSpendingDayRow } from '@/src/db/analytics';
import {
  getBudgetMonthSetting,
  getMonthlyBudgetSetting,
  setBudgetMonthSetting,
  setMonthlyBudgetSetting,
} from '@/src/db/settings';
import { useCurrency } from '@/src/providers/CurrencyProvider';
import { colors, radius, spacing } from '@/src/theme';
import { getMonthRange } from '@/src/utils/dateRanges';
import { CurrencyCode, formatMoney, getCurrencySymbol } from '@/src/utils/money';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';

const MAX_BUDGET_DIGITS = 9;

function getCurrentMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function parseBudgetInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function sanitizeBudgetInput(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, MAX_BUDGET_DIGITS);
}

function formatBudgetDisplay(value: string) {
  if (!value) return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString('en-US');
}

function getProgressColor(progress: number) {
  if (progress >= 0.6) return '#22C55E';
  if (progress >= 0.3) return '#F59E0B';
  return '#EF4444';
}

function formatTopDayLabel(isoDate: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? new Date(`${isoDate}T00:00:00`)
    : new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) return isoDate;

  return parsed.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });
}

function formatCompactCurrency(amount: number, currencyCode: CurrencyCode) {
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;
  const absAmount = Math.abs(normalizedAmount);

  if (absAmount < 1_000) {
    return formatMoney(normalizedAmount, currencyCode);
  }

  const symbol = getCurrencySymbol(currencyCode);
  const sign = normalizedAmount < 0 ? '-' : '';
  let divisor = 1_000;
  let suffix = 'K';

  if (absAmount >= 1_000_000_000) {
    divisor = 1_000_000_000;
    suffix = 'B';
  } else if (absAmount >= 1_000_000) {
    divisor = 1_000_000;
    suffix = 'M';
  }

  const compactValue = absAmount / divisor;
  const roundedValue = compactValue >= 100 ? Math.round(compactValue) : Math.round(compactValue * 10) / 10;
  const displayValue = Number.isInteger(roundedValue)
    ? String(roundedValue)
    : roundedValue.toFixed(1).replace(/\.0$/, '');

  return `${sign}${symbol}${displayValue}${suffix}`;
}

export default function BudgetScreen() {
  const { currencyCode } = useCurrency();
  const [monthKey, setMonthKey] = useState('');
  const [rawBudget, setRawBudget] = useState('');
  const [isBudgetFocused, setIsBudgetFocused] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [spentThisMonth, setSpentThisMonth] = useState(0);
  const [topSpendingDays, setTopSpendingDays] = useState<TopSpendingDayRow[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadBudget = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);

      const now = new Date();
      const currentMonthKey = getCurrentMonthKey(now);
      const savedBudgetMonth = await getBudgetMonthSetting();

      if (savedBudgetMonth !== currentMonthKey) {
        await setBudgetMonthSetting(currentMonthKey);
      }

      const { fromISO, toISO } = getMonthRange(now);
      const [savedBudget, spent, topDays] = await Promise.all([
        getMonthlyBudgetSetting(),
        getTotal(fromISO, toISO),
        getTopSpendingDays(fromISO, toISO, 10),
      ]);

      const normalizedBudget = savedBudget === null ? '' : sanitizeBudgetInput(String(savedBudget));
      const parsedNormalizedBudget = parseBudgetInput(normalizedBudget);

      setMonthKey(currentMonthKey);
      setMonthlyBudget(parsedNormalizedBudget);
      setRawBudget(normalizedBudget);
      setSpentThisMonth(spent);
      setTopSpendingDays(topDays);
    } catch {
      setError('Failed to load budget');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBudget();
    }, [loadBudget])
  );

  const handleChangeBudget = useCallback((value: string) => {
    const sanitizedValue = sanitizeBudgetInput(value);
    setRawBudget(sanitizedValue);

    if (!sanitizedValue) {
      setMonthlyBudget(null);
      void setMonthlyBudgetSetting(null);
      return;
    }

    const parsed = parseBudgetInput(sanitizedValue);
    if (parsed === null) return;

    setMonthlyBudget(parsed);
    void setMonthlyBudgetSetting(parsed);
  }, []);

  const displayBudget = useMemo(() => formatBudgetDisplay(rawBudget), [rawBudget]);

  const remaining = useMemo(() => {
    if (!monthlyBudget || monthlyBudget <= 0) return 0;
    return Math.max(monthlyBudget - spentThisMonth, 0);
  }, [monthlyBudget, spentThisMonth]);

  const progress = useMemo(() => {
    if (!monthlyBudget || monthlyBudget <= 0) return 0;
    const ratio = remaining / monthlyBudget;
    return Math.max(0, Math.min(1, ratio));
  }, [monthlyBudget, remaining]);

  const progressColor = useMemo(() => getProgressColor(progress), [progress]);

  return (
    <Screen>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <AppText variant="title">Budget</AppText>

          <Card style={styles.card}>
            <AppText variant="subtitle">Monthly budget</AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.monthText}>
              {monthKey || getCurrentMonthKey(new Date())}
            </AppText>

            <TextInput
              value={isBudgetFocused ? rawBudget : displayBudget}
              onChangeText={handleChangeBudget}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              onFocus={() => setIsBudgetFocused(true)}
              onBlur={() => setIsBudgetFocused(false)}
              onEndEditing={() => setIsBudgetFocused(false)}
              maxLength={MAX_BUDGET_DIGITS}
              placeholder="500"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

              <View style={styles.values}>
                <View style={styles.valueRow}>
                  <AppText variant="body" color={colors.textSecondary} style={styles.valueLabel}>
                    Spent this month
                  </AppText>
                  <AppText
                    variant="body"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.valueAmount}>
                    {formatCompactCurrency(spentThisMonth, currencyCode)}
                  </AppText>
                </View>

                <View style={styles.valueRow}>
                  <AppText variant="body" color={colors.textSecondary} style={styles.valueLabel}>
                    Remaining
                  </AppText>
                  <AppText
                    variant="body"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.valueAmount, styles.remainingValue]}>
                    {formatCompactCurrency(remaining, currencyCode)}
                  </AppText>
                </View>
              </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: progressColor },
                ]}
              />
            </View>

            {!!error && (
              <AppText variant="caption" color={colors.danger} style={styles.errorText}>
                {error}
              </AppText>
            )}
            {isLoading && (
              <AppText variant="caption" color={colors.textSecondary} style={styles.loadingText}>
                Loading...
              </AppText>
            )}
          </Card>

          <Card style={styles.topDaysCard}>
            <AppText variant="subtitle">Top spending days</AppText>

            {topSpendingDays.length === 0 ? (
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
                No data for this month
              </AppText>
            ) : (
              <View style={styles.topDaysList}>
                {topSpendingDays.map((day) => (
                  <View key={day.date} style={styles.topDaysRow}>
                    <AppText variant="body" color={colors.textSecondary}>
                      {formatTopDayLabel(day.date)}
                    </AppText>
                    <AppText variant="body" style={styles.topDaysAmount}>
                      {formatMoney(day.total, currencyCode)}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },
  monthText: {
    marginTop: spacing.xs,
  },
  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  values: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueLabel: {
    flex: 1,
    marginRight: spacing.sm,
  },
  valueAmount: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  remainingValue: {
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 10,
    width: '100%',
    borderRadius: radius.round,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.round,
  },
  errorText: {
    marginTop: spacing.sm,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  topDaysCard: {
    padding: spacing.lg,
  },
  topDaysList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  topDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topDaysAmount: {
    fontWeight: '700',
  },
  emptyText: {
    marginTop: spacing.md,
  },
});
