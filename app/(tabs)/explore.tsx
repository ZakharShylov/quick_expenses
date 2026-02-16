import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_COLORS, ExpenseCategory } from '@/src/constants/expense-categories';
import { getCategoryTotals, getTotal } from '@/src/db/analytics';
import { DonutChart } from '@/src/ui/DonutChart';
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

  return '#9CA3AF';
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Статистика</Text>

      <View style={styles.segmented}>
        {PERIOD_TABS.map((tab) => {
          const selected = tab.key === period;

          return (
            <Pressable
              key={tab.key}
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => setPeriod(tab.key)}>
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DonutChart data={donutData} total={total} size={230} strokeWidth={46} />

      {isLoading && <Text style={styles.infoText}>Загрузка...</Text>}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!isLoading && !error && categoryTotals.length === 0 && (
        <Text style={styles.infoText}>Нет расходов за выбранный период</Text>
      )}

      <View style={styles.list}>
        {categoryTotals.map((item) => {
          const percent = total > 0 ? (item.total / total) * 100 : 0;

          return (
            <View key={item.category} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.colorDot, { backgroundColor: getCategoryColor(item.category) }]} />
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amountText}>{item.total.toFixed(2)}</Text>
                <Text style={styles.percentText}>{percent.toFixed(1)}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  segmented: {
    marginTop: 16,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: '#fff',
  },
  segmentText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#111827',
    fontWeight: '700',
  },
  infoText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#6B7280',
  },
  errorText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#B00020',
  },
  list: {
    marginTop: 18,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  percentText: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 12,
  },
});
