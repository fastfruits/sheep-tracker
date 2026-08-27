import { useWindowDimensions } from 'react-native';

/** Width at or above which the layout switches to a desktop-style page. */
export const DESKTOP_BREAKPOINT = 900;
/** Width at or above which the feed shows two columns. */
export const WIDE_BREAKPOINT = 1100;

export interface Breakpoint {
  width: number;
  /** Top navigation instead of a bottom tab bar; wider content. */
  isDesktop: boolean;
  /** Enough room for a two-column feed. */
  isWide: boolean;
}

/**
 * Reactive breakpoints. `useWindowDimensions` re-renders on browser resize,
 * unlike `Dimensions.get()`, which snapshots once at module load.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return {
    width,
    isDesktop: width >= DESKTOP_BREAKPOINT,
    isWide: width >= WIDE_BREAKPOINT,
  };
}
