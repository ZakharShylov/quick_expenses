import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/src/theme';
import { AppText } from '@/src/ui/AppText';

type TabIconName = 'house.fill' | 'chart.pie.fill' | 'creditcard.fill' | 'gearshape.fill';

const TAB_ITEMS: Record<string, { label: string; icon: TabIconName }> = {
  index: { label: 'Home', icon: 'house.fill' },
  explore: { label: 'Stats', icon: 'chart.pie.fill' },
  budget: { label: 'Budget', icon: 'creditcard.fill' },
  settings: { label: 'Settings', icon: 'gearshape.fill' },
};

const ACTIVE_COLOR = '#7DD3FC';
const INACTIVE_COLOR = 'rgba(226, 232, 240, 0.82)';

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.tabBarShell, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.tabBarRow}>
        <View style={styles.pill}>
          {state.routes.map((route, index) => {
            const item = TAB_ITEMS[route.name];
            if (!item) return null;

            const isFocused = state.index === index;
            const { options } = descriptors[route.key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={[styles.tabButton, isFocused && styles.tabButtonActive]}>
                <IconSymbol
                  name={item.icon}
                  size={isFocused ? 22 : 20}
                  color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  weight={isFocused ? 'semibold' : 'regular'}
                />
                <AppText
                  variant="caption"
                  color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  style={isFocused ? styles.tabLabelActive : styles.tabLabel}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          style={styles.fab}
          onPress={() => router.push('/add-expense')}>
          <MaterialIcons name="add" size={30} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Stats' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarShell: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.round,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 14,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    gap: 2,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(125, 211, 252, 0.14)',
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabLabelActive: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: radius.round,
    backgroundColor: colors.fab,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 15,
  },
});
