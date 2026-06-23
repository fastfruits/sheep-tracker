// @ts-nocheck
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// How notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Token registration ───────────────────────────────────────────────────────

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications only work on physical devices
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B4D0E',
    });
    await Notifications.setNotificationChannelAsync('escape-alert', {
      name: 'Escape Alerts',
      description: 'Urgent alerts when a matching animal sighting is reported',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FF3B30',
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

// ── Send via Expo Push API (client-side, no server needed) ───────────────────

export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export async function sendExpoPushNotifications(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;

  // Expo push API accepts batches of up to 100
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  await Promise.all(
    chunks.map(chunk =>
      fetch('https://exp.host/--/expo-push-notification-handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      }).catch(() => {}) // Fire-and-forget; don't block the UI
    )
  );
}

// ── Local scheduled notifications ────────────────────────────────────────────

const REENGAGEMENT_ID = 'reengagement-reminder';

/** Schedule a "haven't checked in" local notification 3 days from now. */
export async function scheduleReengagementNotification(): Promise<void> {
  // Cancel any existing one first so we don't stack them
  await cancelReengagementNotification();

  const messages = [
    "🐑 Someone might need help — new sightings waiting!",
    "🌾 Any escaped animals today? Check the feed!",
    "Haven't seen you in a while — hop in and help a farmer out!",
  ];
  const body = messages[Math.floor(Date.now() / 1000) % messages.length];

  await Notifications.scheduleNotificationAsync({
    identifier: REENGAGEMENT_ID,
    content: {
      title: 'SheepFinder',
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3 * 24 * 60 * 60, // 3 days
      repeats: false,
    },
  });
}

export async function cancelReengagementNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REENGAGEMENT_ID).catch(() => {});
}

/** Call on app foreground to reset the reengagement timer. */
export async function resetReengagementTimer(): Promise<void> {
  await scheduleReengagementNotification();
}
