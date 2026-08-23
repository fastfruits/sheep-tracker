/**
 * Web share. RN's `Share` is a no-op in react-native-web, so use the Web Share
 * API where it exists (mobile browsers, Safari) and fall back to the clipboard
 * on desktop. The caller shows "Copied to clipboard" when we return 'copied'.
 */
export type ShareResult = 'shared' | 'copied' | 'dismissed';

export async function shareText(message: string): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: message });
      return 'shared';
    } catch (e: any) {
      // AbortError means the user closed the sheet — not worth a fallback.
      if (e?.name === 'AbortError') return 'dismissed';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(message);
      return 'copied';
    } catch {
      // Clipboard can be blocked by permissions policy; fall through.
    }
  }

  return 'dismissed';
}
