// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider } from '@/store/app-store';
import { resetReengagementTimer } from '@/lib/pushNotifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NotificationHandler() {
  const router = useRouter();
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    // Fired when a notification is received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Badge count updates automatically via expo-notifications
    });

    // Fired when the user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'escape_alert') {
        // Farmer tapped escape alert → open Account tab to see the notification
        router.push('/(tabs)/account');
      } else if (data?.type === 'follow_post') {
        // Follower tapped a "friend posted" notification → open Community feed
        router.push('/(tabs)/gallery');
      }
    });

    // Reset reengagement timer when app comes to foreground
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') resetReengagementTimer();
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateSub.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NotificationHandler />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[userId]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AppProvider>
  );
}
