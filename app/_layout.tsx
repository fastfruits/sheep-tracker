// @ts-nocheck
import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider } from '@/store/app-store';
import { DialogProvider } from '@/lib/platform/dialog';
import { CONTENT_MAX_WIDTH } from '@/constants/layout';
import { resetReengagementTimer, subscribeToNotificationTaps } from '@/lib/platform/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    // No-op on web — see lib/platform/notifications.web.ts
    const unsubscribe = subscribeToNotificationTaps(data => {
      if (data?.type === 'escape_alert') {
        // Farmer tapped escape alert → open Account tab to see the notification
        router.push('/(tabs)/account');
      } else if (data?.type === 'follow_post') {
        // Follower tapped a "friend posted" notification → open Community feed
        router.push('/(tabs)/gallery');
      }
    });

    // Reset reengagement timer when the app comes to foreground
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') resetReengagementTimer();
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <DialogProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NotificationHandler />
          {/* Clamp to a phone-ish column so the site is readable on a desktop
              browser. No-op on phones, which are all narrower than the max. */}
          <View style={styles.shell}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="profile/[userId]" options={{ headerShown: false }} />
            </Stack>
          </View>
          <StatusBar style="dark" />
        </ThemeProvider>
      </DialogProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
});
