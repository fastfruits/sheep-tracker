/**
 * Web no-op notification stubs.
 *
 * Browsers have no Expo push token. Farmer alerts still work end to end — they
 * are written to the `notifications` table and surface as the unread badge on
 * the Account tab, which is the whole user-visible flow.
 *
 * The signatures mirror `notifications.ts` exactly, and `profiles.push_token`
 * plus the send seam are left in place, so Web Push (VAPID + service worker)
 * can be added later by filling these in rather than restructuring callers.
 */

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

export type NotificationTapData = { type?: string } & Record<string, unknown>;

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null;
}

export async function sendExpoPushNotifications(_messages: PushMessage[]): Promise<void> {
  // No-op: the accompanying `notifications` rows are what the web UI reads.
}

export async function scheduleReengagementNotification(): Promise<void> {}

export async function cancelReengagementNotification(): Promise<void> {}

export async function resetReengagementTimer(): Promise<void> {}

export function subscribeToNotificationTaps(
  _onTap: (data: NotificationTapData) => void
): () => void {
  return () => {};
}
