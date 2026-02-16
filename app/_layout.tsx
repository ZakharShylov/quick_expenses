import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CurrencyProvider } from '@/src/providers/CurrencyProvider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <CurrencyProvider>
          <BottomSheetModalProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </BottomSheetModalProvider>
        </CurrencyProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
