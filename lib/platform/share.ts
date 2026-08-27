/** Native share sheet. See `share.web.ts` for the browser implementation. */
import { Share } from 'react-native';

export type ShareResult = 'shared' | 'copied' | 'dismissed';

export async function shareText(message: string): Promise<ShareResult> {
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'dismissed';
  }
}
