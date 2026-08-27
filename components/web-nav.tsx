// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { C } from '@/constants/colors';
import { NAV_HEIGHT, SITE_MAX_WIDTH } from '@/constants/layout';
import { useApp } from '@/store/app-store';

const LINKS = [
  { label: 'Report a sighting', href: '/', match: ['/', '/(tabs)', '/(tabs)/index'] },
  { label: 'Community', href: '/gallery', match: ['/gallery', '/(tabs)/gallery'] },
  { label: 'Account', href: '/account', match: ['/account', '/(tabs)/account'] },
];

/**
 * Desktop top navigation. Replaces the bottom tab bar above the desktop
 * breakpoint — a bottom bar on a wide screen is the strongest visual signal
 * that a site is a phone app in a browser.
 */
export function WebNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount, currentUser } = useApp();

  const showBadge = !!currentUser?.isFarmer && unreadCount > 0;

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.brand}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
          accessibilityRole="link"
        >
          <Text style={styles.brandMark}>🐑</Text>
          <Text style={styles.brandName}>SheepFinder</Text>
        </TouchableOpacity>

        <View style={styles.links}>
          {LINKS.map(link => {
            const active = link.match.includes(pathname);
            return (
              <TouchableOpacity
                key={link.href}
                dataSet={{ hoverable: 'nav' }}
                style={[styles.link, active && styles.linkActive]}
                onPress={() => router.push(link.href)}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.linkText, active && styles.linkTextActive]}>{link.label}</Text>
                {link.href === '/account' && showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: NAV_HEIGHT,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    justifyContent: 'center',
    zIndex: 10,
  },
  inner: {
    width: '100%',
    maxWidth: SITE_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { fontSize: 22 },
  brandName: { fontSize: 19, fontWeight: '800', color: C.green, letterSpacing: -0.4 },

  links: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
  },
  linkActive: { backgroundColor: C.greenLight },
  linkText: { fontSize: 15, fontWeight: '600', color: C.textSec },
  linkTextActive: { color: C.green, fontWeight: '700' },

  badge: {
    backgroundColor: C.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 10, color: '#FFF', fontWeight: '800' },
});
