import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCurrency } from '@/src/providers/CurrencyProvider';
import { colors, radius, spacing } from '@/src/theme';
import { CurrencyCode, SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/src/utils/money';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';

export default function SettingsScreen() {
  const { currencyCode, setCurrencyCode } = useCurrency();
  const [isSaving, setIsSaving] = useState(false);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const chevronRotation = useSharedValue(0);

  useEffect(() => {
    chevronRotation.value = withTiming(isCurrencyModalVisible ? 180 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [chevronRotation, isCurrencyModalVisible]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleSelectCurrency = async (nextCode: CurrencyCode) => {
    if (isSaving) return;

    if (nextCode === currencyCode) {
      setCurrencyModalVisible(false);
      return;
    }

    try {
      setIsSaving(true);
      await setCurrencyCode(nextCode);
    } finally {
      setIsSaving(false);
      setCurrencyModalVisible(false);
    }
  };

  return (
    <Screen contentStyle={styles.container}>
      <AppText variant="title">Settings</AppText>

      <Card style={styles.sectionCard}>
        <Pressable
          style={styles.settingRow}
          disabled={isSaving}
          onPress={() => setCurrencyModalVisible(true)}>
          <AppText variant="body">Currency</AppText>
          <View style={styles.settingValueGroup}>
            <AppText variant="body" color={colors.textSecondary} style={styles.settingValue}>
              {currencyCode}
            </AppText>
            <Animated.View style={[styles.settingChevronWrap, chevronAnimatedStyle]}>
              <MaterialIcons name="expand-more" size={20} color={colors.textSecondary} />
            </Animated.View>
          </View>
        </Pressable>
      </Card>

      <Modal
        visible={isCurrencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCurrencyModalVisible(false)}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <AppText variant="subtitle">Select currency</AppText>
            <View style={styles.sheetList}>
              {SUPPORTED_CURRENCIES.map((code) => {
                const selected = code === currencyCode;
                return (
                  <Pressable
                    key={code}
                    style={[styles.sheetRow, selected && styles.sheetRowSelected]}
                    onPress={() => {
                      void handleSelectCurrency(code);
                    }}>
                    <View style={styles.currencyInfo}>
                      <AppText variant="body">{code}</AppText>
                      <AppText variant="caption" color={colors.textSecondary}>
                        {getCurrencySymbol(code)}
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      color={selected ? colors.fab : colors.textSecondary}
                      style={selected ? styles.sheetSelectedText : undefined}>
                      {selected ? 'Selected' : 'Select'}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.cancelButton} onPress={() => setCurrencyModalVisible(false)}>
              <AppText variant="body" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  sectionCard: {
    padding: spacing.lg,
  },
  settingRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  settingValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValue: {
    fontWeight: '600',
  },
  settingChevronWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  sheetCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sheetList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  sheetRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  sheetRowSelected: {
    borderColor: colors.fab,
  },
  currencyInfo: {
    gap: 2,
  },
  sheetSelectedText: {
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
