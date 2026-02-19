import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Platform, StyleSheet, TextInput, TouchableWithoutFeedback, View } from 'react-native';

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
import { formatMoney } from '@/src/utils/money';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';

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
  return value.replace(/[^0-9]/g, '');
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

export default function BudgetScreen() {
  const { currencyCode } = useCurrency();
  const [monthKey, setMonthKey] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
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

      setMonthKey(currentMonthKey);
      setMonthlyBudget(savedBudget);
      setBudgetInput(savedBudget === null ? '' : String(savedBudget));
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
    setBudgetInput(sanitizedValue);

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
              value={budgetInput}
              onChangeText={handleChangeBudget}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              inputMode="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              placeholder="500"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            <View style={styles.values}>
              <View style={styles.valueRow}>
                <AppText variant="body" color={colors.textSecondary}>
                  Spent this month
                </AppText>
                <AppText variant="body">{formatMoney(spentThisMonth, currencyCode)}</AppText>
              </View>

              <View style={styles.valueRow}>
                <AppText variant="body" color={colors.textSecondary}>
                  Remaining
                </AppText>
                <AppText variant="body" style={styles.remainingValue}>
                  {formatMoney(remaining, currencyCode)}
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
