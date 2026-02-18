import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
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
const INACTIVE_COLOR = 'rgba(255,255,255,0.5)';
const ACTIVE_BG = 'rgba(255,255,255,0.12)';
const ICON_SIZE = 21;
const TAB_LABEL_SIZE = 11;
const TAB_LABEL_LINE_HEIGHT = 13;

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
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, isFocused]);

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focusProgress.value, [0, 1], ['rgba(255,255,255,0)', ACTIVE_BG]),
  }));

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - focusProgress.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}>
      <Animated.View style={[styles.tabInner, itemAnimatedStyle]}>
        <View style={styles.iconStack}>
          <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
            <IconSymbol name={icon} size={ICON_SIZE} color={INACTIVE_COLOR} weight="regular" />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, activeIconStyle]}>
            <IconSymbol name={icon} size={ICON_SIZE} color={ACTIVE_COLOR} weight="regular" />
          </Animated.View>
        </View>
        <AppText
          variant="caption"
          numberOfLines={1}
          ellipsizeMode="tail"
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
    <View
      pointerEvents="box-none"
      style={[styles.tabBarShell, { paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 }]}>
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
        tabBarBackground: () => null,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          shadowColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        sceneStyle: {
          backgroundColor: 'transparent',
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    backgroundColor: '#000000',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: '#151518',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
  },
  tabInner: {
    width: '100%',
    maxWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.round,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  iconStack: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: TAB_LABEL_SIZE,
    lineHeight: TAB_LABEL_LINE_HEIGHT,
    letterSpacing: 0.15,
  },
  tabLabelActive: {
    width: '100%',
    textAlign: 'center',
    fontSize: TAB_LABEL_SIZE,
    lineHeight: TAB_LABEL_LINE_HEIGHT,
    letterSpacing: 0.15,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 12,
  },
});
