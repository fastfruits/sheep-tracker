// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useApp } from '@/store/app-store';

function NotifBadge() {
  const { unreadCount, currentUser } = useApp();
  if (!currentUser?.isFarmer || unreadCount === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B4D0E',
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopColor: '#E4E2DA',
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="exclamationmark.triangle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="photo.on.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol name="person.fill" color={color} />
              <NotifBadge />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#D93025',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '800',
  },
});
