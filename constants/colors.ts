/**
 * Shared SheepFinder palette. Previously duplicated as a local `C` object at the
 * top of every screen; lifted here so the platform dialog can match the app.
 */
export const C = {
  bg: '#F7F6F2',
  card: '#FFFFFF',
  green: '#1B4D0E',
  greenMid: '#2D7A18',
  greenLight: '#EBF5E6',
  border: '#E4E2DA',
  text: '#111111',
  textSec: '#77776E',
  red: '#D93025',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  amberBorder: '#FDE68A',
  orange: '#E8531F',
  escapedBg: '#FFF3EE',
  escapedBorder: '#F3AA8C',
  escapedDot: '#E8531F',
  resolvedBg: '#EDFAF1',
  resolvedBorder: '#74C98A',
  resolvedDot: '#2D7A18',
  confirmBlue: '#1D6FA4',
  confirmBlueBg: '#EBF4FB',
} as const;

export default C;
