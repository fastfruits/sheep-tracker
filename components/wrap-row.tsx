// @ts-nocheck
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

/**
 * A row of pills that scrolls horizontally on narrow screens and wraps onto
 * multiple lines when there is width for it.
 *
 * Horizontal scrolling hides options off the right edge with no visible
 * affordance on a desktop browser — fine on a phone, confusing on a page. The
 * `flexGrow: 0` on the ScrollView also fixes a latent bug: inside a flex column
 * the scroller stretched to fill all remaining vertical space.
 */
export function WrapRow({ children, wrap, contentContainerStyle }) {
  if (wrap) {
    return <View style={[styles.wrap, contentContainerStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  scroll: { flexGrow: 0, flexShrink: 0 },
});
