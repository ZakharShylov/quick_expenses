import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_COLORS, ExpenseCategory } from '@/src/constants/expense-categories';
import { getCategoryTotals, getTotal } from '@/src/db/analytics';
import { colors, radius, spacing } from '@/src/theme';
import { DonutChart } from '@/src/ui/DonutChart';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';
import { AnalyticsPeriod, getDateRange } from '@/src/utils/dateRanges';

type CategoryTotal = {
  category: string;
  total: number;
};

const PERIOD_TABS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
];

function getCategoryColor(category: string) {
  if (category in CATEGORY_COLORS) {
    return CATEGORY_COLORS[category as ExpenseCategory];
  }

  return colors.textSecondary;
}

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async (selectedPeriod: AnalyticsPeriod) => {
    try {
      setError('');
      setIsLoading(true);

      const { fromISO, toISO } = getDateRange(selectedPeriod);
      const [totals, overall] = await Promise.all([
        getCategoryTotals(fromISO, toISO),
        getTotal(fromISO, toISO),
      ]);

      setCategoryTotals(totals);
      setTotal(overall);
    } catch {
      setError('Не удалось загрузить аналитику');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics(period);
    }, [loadAnalytics, period])
  );

  const donutData = useMemo(
    () =>
      categoryTotals.map((item) => ({
        label: item.category,
        value: item.total,
        color: getCategoryColor(item.category),
      })),
    [categoryTotals]
  );

  return (
    <Screen scroll contentStyle={styles.container}>
      <AppText variant="title">Статистика</AppText>

      <Card style={styles.segmentedCard}>
        <View style={styles.segmented}>
          {PERIOD_TABS.map((tab) => {
            const selected = tab.key === period;

            return (
              <Pressable
                key={tab.key}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => setPeriod(tab.key)}>
                <AppText
                  variant="body"
                  color={selected ? colors.textPrimary : colors.textSecondary}
                  style={selected ? styles.segmentTextSelected : styles.segmentText}>
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.chartCard}>
        <DonutChart data={donutData} total={total} size={230} strokeWidth={46} />
      </Card>

      {isLoading && (
        <AppText variant="body" color={colors.textSecondary} style={styles.infoText}>
          Загрузка...
        </AppText>
      )}
      {!!error && (
        <AppText variant="caption" color={colors.danger} style={styles.infoText}>
          {error}
        </AppText>
      )}
      {!isLoading && !error && categoryTotals.length === 0 && (
        <AppText variant="body" color={colors.textSecondary} style={styles.infoText}>
          Нет расходов за выбранный период
        </AppText>
      )}

      <View style={styles.list}>
        {categoryTotals.map((item) => {
          const percent = total > 0 ? (item.total / total) * 100 : 0;

          return (
            <Card key={item.category} style={styles.rowCard}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.colorDot, { backgroundColor: getCategoryColor(item.category) }]} />
                  <AppText variant="body">{item.category}</AppText>
                </View>
                <View style={styles.rowRight}>
                  <AppText variant="body" style={styles.amountText}>
                    {item.total.toFixed(2)}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {percent.toFixed(1)}%
                  </AppText>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    paddingBottom: spacing.xxxl,
  },
  segmentedCard: {
    marginTop: spacing.lg,
    padding: spacing.xs,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.card,
  },
  segmentText: {
    fontWeight: '500',
  },
  segmentTextSelected: {
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
});
