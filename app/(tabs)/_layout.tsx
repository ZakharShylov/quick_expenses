import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = '#9CA3AF';

type TabBarItemProps = {
  isFocused: boolean;
  label: string;
  icon: TabIconName;
  accessibilityLabel?: string;
  testID?: string;
  onPress: () => void;
  onLongPress: () => void;
};

function TabBarItem({
  isFocused,
  label,
  icon,
  accessibilityLabel,
  testID,
  onPress,
  onLongPress,
}: TabBarItemProps) {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, isFocused]);

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - focusProgress.value) * 3 }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - focusProgress.value) * 2 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabButton, isFocused && styles.tabButtonActive]}>
      <Animated.View style={[styles.tabInner, itemAnimatedStyle]}>
        <Animated.View style={iconAnimatedStyle}>
          <IconSymbol
            name={icon}
            size={isFocused ? 22 : 20}
            color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
            weight={isFocused ? 'semibold' : 'regular'}
          />
        </Animated.View>
        <AppText
          variant="caption"
          color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
          style={isFocused ? styles.tabLabelActive : styles.tabLabel}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View style={[styles.tabBarShell, { paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 }]}>
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
              <TabBarItem
                key={route.key}
                isFocused={isFocused}
                label={item.label}
                icon={item.icon}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add expense"
          style={styles.fab}
          onPress={() =>
            router.push({
              pathname: '/add-expense',
              params: {
                returnTo: 'home',
                ...(activeRouteName ? { sourceTab: activeRouteName } : {}),
              },
            })
          }>
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
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 240,
          },
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
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
    paddingTop: spacing.xs,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  pill: {
    width: 286,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.round,
    backgroundColor: '#0B0B0F',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: '#151518',
  },
  tabButton: {
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
  },
  tabButtonActive: {
    backgroundColor: '#151518',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
    width: 58,
    height: 58,
    borderRadius: radius.round,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
    shadowColor: 'rgba(0, 0, 0, 0.24)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 12,
  },
});
