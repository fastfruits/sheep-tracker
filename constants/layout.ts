/**
 * Layout widths.
 *
 * The screens were designed as a phone layout; on a desktop browser everything
 * would otherwise stretch edge to edge. Content is clamped and centred, with a
 * wider bound for feed/profile pages than for forms, which read better narrow.
 */

/** Site chrome (nav bar, footer) inner width. */
export const SITE_MAX_WIDTH = 1120;
/** Feed and profile pages. */
export const CONTENT_MAX_WIDTH = 1120;
/** Forms and single-column reading, e.g. the report page and account settings. */
export const NARROW_MAX_WIDTH = 660;
/** Height of the desktop top navigation bar. */
export const NAV_HEIGHT = 64;
