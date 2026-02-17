import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import {
  Alert,
  FlatList,
  ListRenderItemInfo,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { getTotal } from '@/src/db/analytics';
import { deleteTransaction, getTransactionsByDate, Transaction } from '@/src/db/transactions';
import { useCurrency } from '@/src/providers/CurrencyProvider';
import { colors, radius, spacing } from '@/src/theme';
import { toISODateOnly } from '@/src/utils/dateRanges';
import { type CurrencyCode, formatMoney } from '@/src/utils/money';
import { formatTitle } from '@/src/utils/transactionTitle';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseISODate(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isExplicitHorizontalSwipe(dx: number, dy: number) {
  return Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 40;
}

function formatTransactionDate(dateValue: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type TransactionRowCardProps = {
  item: Transaction;
  expanded: boolean;
  currencyCode: CurrencyCode;
  onPress: () => void;
  onLongPress: () => void;
  onAttachmentPress: (uri: string) => void;
};

function TransactionRowCard({
  item,
  expanded,
  currencyCode,
  onPress,
  onLongPress,
  onAttachmentPress,
}: TransactionRowCardProps) {
  const pressScale = useSharedValue(1);
  const pressHighlight = useSharedValue(0);
  const chevronRotation = useSharedValue(expanded ? 90 : 0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    shadowColor: colors.shadow,
    shadowOpacity: 0.02 + pressHighlight.value * 0.16,
    shadowRadius: 6 + pressHighlight.value * 10,
    shadowOffset: { width: 0, height: 3 + pressHighlight.value * 5 },
    elevation: 1 + pressHighlight.value * 5,
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.98, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [pressScale]);

  const handleLongPress = useCallback(() => {
    pressScale.value = withTiming(1.02, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    pressHighlight.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    onLongPress();
  }, [onLongPress, pressHighlight, pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    pressHighlight.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [pressHighlight, pressScale]);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 90 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [chevronRotation, expanded]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.rowCardWrapper, animatedCardStyle]}>
      <Card style={styles.rowCard}>
        <Pressable
          style={styles.rowPressable}
          onPress={onPress}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={280}>
          <View style={styles.row}>
            <AppText variant="body" style={styles.rowLeftText}>
              {formatTitle(item.category, item.itemName)}
            </AppText>

            <View style={styles.rowRight}>
              <AppText variant="body" style={styles.rowAmount}>
                {formatMoney(item.amount, currencyCode)}
              </AppText>
              <Animated.View style={[styles.rowChevronIconWrap, chevronAnimatedStyle]}>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </Animated.View>
            </View>
          </View>
        </Pressable>

        {expanded ? (
          <Animated.View
            layout={LinearTransition.duration(240)}
            entering={FadeIn.duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: -4 }],
            })}
            exiting={FadeOut.duration(140)}
            style={styles.expandedBlock}>
            {item.note ? (
              <View style={styles.noteBlock}>
                <AppText variant="caption" color={colors.textSecondary}>
                  Note
                </AppText>
                <AppText variant="caption" style={styles.noteText}>
                  {item.note}
                </AppText>
              </View>
            ) : null}
            {item.attachmentUri ? (
              <View style={styles.attachmentBlock}>
                <AppText variant="caption" color={colors.textSecondary} style={styles.attachmentLabel}>
                  Attachment
                </AppText>
                <Pressable
                  style={styles.attachmentThumbWrap}
                  onPress={() => onAttachmentPress(item.attachmentUri!)}>
                  <Image source={{ uri: item.attachmentUri! }} style={styles.attachmentThumb} contentFit="cover" />
                </Pressable>
              </View>
            ) : null}
            <AppText variant="caption" color={colors.textSecondary} style={styles.dateLine}>
              Date: {formatTransactionDate(item.date)}
            </AppText>
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { currencyCode } = useCurrency();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [fullscreenAttachmentUri, setFullscreenAttachmentUri] = useState<string | null>(null);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [dateShiftDirection, setDateShiftDirection] = useState<'next' | 'prev' | 'neutral'>(
    'neutral'
  );
  const contentTransition = useSharedValue(1);
  const hasRenderedRef = useRef(false);
  const longPressRowIdRef = useRef<string | null>(null);

  const selectedDateISO = useMemo(() => toISODateOnly(selectedDate), [selectedDate]);
  const nextDateISO = useMemo(() => toISODateOnly(addDays(selectedDate, 1)), [selectedDate]);

  const formattedDate = useMemo(
    () =>
      selectedDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [selectedDate]
  );

  const changeDateByDays = useCallback((days: number) => {
    setDateShiftDirection(days > 0 ? 'next' : 'prev');
    setSelectedDate((prev) => addDays(prev, days));
  }, []);

  const handleCalendarSelect = useCallback(
    (dateISO: string) => {
      if (dateISO > selectedDateISO) {
        setDateShiftDirection('next');
      } else if (dateISO < selectedDateISO) {
        setDateShiftDirection('prev');
      } else {
        setDateShiftDirection('neutral');
      }

      setSelectedDate(parseISODate(dateISO));
      setCalendarVisible(false);
    },
    [selectedDateISO]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isExplicitHorizontalSwipe(gestureState.dx, gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          isExplicitHorizontalSwipe(gestureState.dx, gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (!isExplicitHorizontalSwipe(gestureState.dx, gestureState.dy)) return;

          if (gestureState.dx < 0) {
            changeDateByDays(1);
          } else {
            changeDateByDays(-1);
          }
        },
      }),
    [changeDateByDays]
  );

  const loadHomeData = useCallback(async () => {
    try {
      setLoadError('');

      const [transactionsByDate, dayTotal] = await Promise.all([
        getTransactionsByDate(selectedDateISO, 10),
        getTotal(selectedDateISO, nextDateISO),
      ]);

      setTodayTransactions(transactionsByDate);
      setTotalToday(dayTotal);
      setExpandedTransactionId((prev) =>
        prev && transactionsByDate.some((item) => item.id === prev) ? prev : null
      );
    } catch {
      setLoadError('Failed to load expenses');
    }
  }, [nextDateISO, selectedDateISO]);

  const handleTransactionPress = useCallback((transactionId: string) => {
    if (longPressRowIdRef.current === transactionId) {
      longPressRowIdRef.current = null;
      return;
    }

    setExpandedTransactionId((prev) => (prev === transactionId ? null : transactionId));
  }, []);

  const handleTransactionLongPress = useCallback(
    (transaction: Transaction) => {
      longPressRowIdRef.current = transaction.id;

      Alert.alert(
        'Delete?',
        'This transaction will be permanently removed.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              longPressRowIdRef.current = null;
            },
          },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await deleteTransaction(transaction.id);
                  setExpandedTransactionId((prev) => (prev === transaction.id ? null : prev));
                  await loadHomeData();
                } catch {
                  setLoadError('Failed to delete expense');
                } finally {
                  longPressRowIdRef.current = null;
                }
              })();
            },
          },
        ],
        {
          onDismiss: () => {
            longPressRowIdRef.current = null;
          },
        }
      );
    },
    [loadHomeData]
  );

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
    }, [loadHomeData])
  );

  useEffect(() => {
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      return;
    }

    contentTransition.value = withSequence(
      withTiming(0.35, {
        duration: 110,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1, {
        duration: 230,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [contentTransition, loadError, selectedDateISO, todayTransactions, totalToday]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentTransition.value,
    transform: [{ scale: 0.985 + contentTransition.value * 0.015 }],
  }));

  const dateEntering = useMemo(() => {
    if (dateShiftDirection === 'next') {
      return FadeInRight.duration(260).withInitialValues({
        opacity: 0,
        transform: [{ translateX: 14 }],
      });
    }

    if (dateShiftDirection === 'prev') {
      return FadeInLeft.duration(260).withInitialValues({
        opacity: 0,
        transform: [{ translateX: -14 }],
      });
    }

    return FadeIn.duration(220);
  }, [dateShiftDirection]);

  const renderTransactionItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Transaction>) => (
      <Animated.View
        layout={LinearTransition.duration(260)}
        entering={FadeInUp.duration(220)
          .delay(Math.min(index * 35, 180))
          .withInitialValues({
            opacity: 0,
            transform: [{ translateY: 8 }],
          })}
        exiting={FadeOut.duration(150)}>
        <TransactionRowCard
          item={item}
          expanded={expandedTransactionId === item.id}
          currencyCode={currencyCode}
          onPress={() => handleTransactionPress(item.id)}
          onLongPress={() => handleTransactionLongPress(item)}
          onAttachmentPress={(uri) => setFullscreenAttachmentUri(uri)}
        />
      </Animated.View>
    ),
    [currencyCode, expandedTransactionId, handleTransactionLongPress, handleTransactionPress]
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <Animated.View key={selectedDateISO} entering={dateEntering} style={styles.dateWrapper}>
          <AppText variant="title">{formattedDate}</AppText>
        </Animated.View>

        <Pressable
          style={styles.headerArrowButton}
          onPress={() => setCalendarVisible(true)}
          hitSlop={8}>
          <AppText variant="title" color={colors.textSecondary} style={styles.headerArrow}>
            {'>'}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Card style={styles.todayCard}>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Spent today
        </AppText>
        <AppText style={styles.todayTotal}>{formatMoney(totalToday, currencyCode)}</AppText>
      </Card>

      {!!loadError && (
        <AppText variant="caption" color={colors.danger} style={styles.errorText}>
          {loadError}
        </AppText>
      )}
    </View>
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.gestureArea} {...panResponder.panHandlers}>
        <Animated.View style={[styles.listWrap, animatedContentStyle]}>
          <FlatList
            data={todayTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={listHeader}
            stickyHeaderIndices={[0]}
            ListEmptyComponent={
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
                No expenses yet
              </AppText>
            }
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      </View>

      <Modal
        visible={isCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Calendar
              current={selectedDateISO}
              firstDay={1}
              onDayPress={(day) => handleCalendarSelect(day.dateString)}
              markedDates={{
                [selectedDateISO]: {
                  selected: true,
                  selectedColor: colors.fab,
                },
              }}
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
                textMonthFontWeight: '700',
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!fullscreenAttachmentUri}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenAttachmentUri(null)}>
        <View style={styles.fullscreenModal}>
          <Pressable style={styles.fullscreenBackdrop} onPress={() => setFullscreenAttachmentUri(null)} />
          {fullscreenAttachmentUri ? (
            <Image
              source={{ uri: fullscreenAttachmentUri }}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          ) : null}
          <Pressable
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenAttachmentUri(null)}>
            <MaterialIcons name="close" size={24} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'relative',
    paddingBottom: 0,
  },
  gestureArea: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  listHeader: {
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateWrapper: {
    flexShrink: 1,
  },
  headerArrowButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
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
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 140,
  },
  rowCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowCardWrapper: {
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  rowPressable: {
    borderRadius: radius.md,
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowChevronIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteBlock: {
    marginBottom: spacing.xs,
  },
  attachmentBlock: {
    marginBottom: spacing.sm,
  },
  attachmentLabel: {
    marginBottom: spacing.xs,
  },
  attachmentThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
  },
  noteText: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  dateLine: {
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullscreenBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  fullscreenImage: {
    width: '100%',
    height: '78%',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: spacing.xxl + spacing.sm,
    right: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: radius.round,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

