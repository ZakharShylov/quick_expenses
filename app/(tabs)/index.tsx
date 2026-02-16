import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

import { getTotal } from '@/src/db/analytics';
import { getAllTransactions, Transaction } from '@/src/db/transactions';
import { colors, radius, spacing } from '@/src/theme';
import { getDateRange } from '@/src/utils/dateRanges';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';

function isDateInRange(dateValue: string, fromISO: string, toISO: string) {
  if (dateValue >= fromISO && dateValue < toISO) {
    return true;
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate >= new Date(fromISO) && parsedDate < new Date(toISO);
}

export default function HomeScreen() {
  const router = useRouter();
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loadError, setLoadError] = useState('');

  const formattedDate = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const loadHomeData = useCallback(async () => {
    try {
      setLoadError('');

      const { fromISO, toISO } = getDateRange('day');
      const [allTransactions, todayTotal] = await Promise.all([
        getAllTransactions(),
        getTotal(fromISO, toISO),
      ]);

      const filtered = allTransactions
        .filter((item) => isDateInRange(item.date, fromISO, toISO))
        .slice(0, 10);

      setTodayTransactions(filtered);
      setTotalToday(todayTotal);
    } catch {
      setLoadError('Не удалось загрузить расходы');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
    }, [loadHomeData])
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="title">{formattedDate}</AppText>
        <AppText variant="title" color={colors.textSecondary} style={styles.headerArrow}>
          ›
        </AppText>
      </View>

      <View style={styles.divider} />

      <Animated.View
        entering={FadeInUp.duration(280).withInitialValues({
          opacity: 0,
          transform: [{ translateY: 10 }],
        })}>
        <Card style={styles.todayCard}>
          <AppText variant="subtitle" color={colors.textSecondary}>
            Траты за сегодня
          </AppText>
          <AppText style={styles.todayTotal}>
            {totalToday.toLocaleString('ru-RU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </AppText>
        </Card>
      </Animated.View>

      {!!loadError && (
        <AppText variant="caption" color={colors.danger} style={styles.errorText}>
          {loadError}
        </AppText>
      )}

      {todayTransactions.length === 0 ? (
        <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
          Пока нет расходов
        </AppText>
      ) : (
        <View style={styles.list}>
          {todayTransactions.map((item, index) => (
            <Animated.View
              key={item.id}
              layout={LinearTransition.duration(260)}
              entering={FadeInUp.duration(220)
                .delay(Math.min(index * 35, 180))
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}>
              <Card style={styles.rowCard}>
                <View style={styles.row}>
                  <AppText variant="body" style={styles.rowLeftText}>
                    {item.itemName ? `${item.category} - ${item.itemName}` : item.category}
                  </AppText>
                  <AppText variant="body" style={styles.rowAmount}>
                    {item.amount.toFixed(2)}
                  </AppText>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/add-expense')}>
        <AppText style={styles.fabText}>+</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'relative',
    paddingBottom: spacing.xxxl + spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerArrow: {
    marginTop: spacing.xs,
  },
  divider: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    height: 1,
    backgroundColor: colors.border,
  },
  todayCard: {
    padding: spacing.lg,
  },
  todayTotal: {
    marginTop: spacing.xs,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  errorText: {
    marginTop: spacing.sm,
  },
  emptyText: {
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  rowCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeftText: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowAmount: {
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.round,
    backgroundColor: colors.fab,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '600',
  },
});
