// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp, SPECIES_LIST, timeAgo } from '@/store/app-store';
import { C } from '@/constants/colors';
import { PageHead } from '@/components/page-head';

const TABS = ['Posts', 'Animals'];

function stringToColor(str) {
  const colors = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function GridItem({ post }) {
  const speciesInfo = SPECIES_LIST.find(s => s.value === post.species);
  const isEscaped = post.isSighting && post.sightingStatus !== 'resolved';
  const isResolved = post.isSighting && post.sightingStatus === 'resolved';

  return (
    <View style={styles.gridItem}>
      {post.photo ? (
        <Image source={{ uri: post.photo }} style={styles.gridPhoto} />
      ) : (
        <View style={[styles.gridPhotoEmpty, { backgroundColor: post.isSighting ? '#FFF3EE' : '#F3F2ED' }]}>
          <Text style={styles.gridEmoji}>{speciesInfo?.emoji ?? '🐾'}</Text>
        </View>
      )}
      {isEscaped && <View style={[styles.gridBadge, { backgroundColor: C.escapedDot }]}><Text style={styles.gridBadgeText}>🚨</Text></View>}
      {isResolved && <View style={[styles.gridBadge, { backgroundColor: C.resolvedDot }]}><Text style={styles.gridBadgeText}>✅</Text></View>}
      <View style={styles.gridOverlay}>
        <Text style={styles.gridOverlayLikes}>🤍 {post.likes.length}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser, posts, registeredAnimals,
    toggleFollow, isFollowing, getFollowerCount, getFollowingCount, getUserById,
  } = useApp();

  const [activeTab, setActiveTab] = useState('Posts');

  const user = getUserById(userId);
  const isOwn = currentUser?.id === userId;
  const following = isFollowing(userId);
  const followerCount = getFollowerCount(userId);
  const followingCount = getFollowingCount(userId);
  const userPosts = posts.filter(p => p.userId === userId);
  const userAnimals = registeredAnimals.filter(a => a.ownerId === userId);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerComponent = (
    <>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Profile hero */}
      <View style={styles.profileHero}>
        <View style={[styles.avatar, { backgroundColor: stringToColor(user.name) }]}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        {user.isFarmer && (
          <View style={styles.farmerBadge}>
            <Text style={styles.farmerBadgeText}>🌾 {user.farmName ?? 'Farmer'}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={[styles.statItem, styles.statMiddle]}>
            <Text style={styles.statNum}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Follow / Edit button */}
        {!isOwn && (
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={() => {
              if (!currentUser) {
                router.push('/(tabs)/account');
                return;
              }
              toggleFollow(userId);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? 'Following ✓' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
        {isOwn && (
          <View style={styles.ownProfileNote}>
            <Text style={styles.ownProfileNoteText}>Your profile</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.filter(t => t === 'Posts' || user.isFarmer).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  if (activeTab === 'Animals') {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.animalsScroll} showsVerticalScrollIndicator={false}>
          {headerComponent}
          {userAnimals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🐑</Text>
              <Text style={styles.emptyTitle}>No animals registered</Text>
            </View>
          ) : (
            userAnimals.map(animal => {
              const s = SPECIES_LIST.find(x => x.value === animal.species);
              return (
                <View key={animal.id} style={styles.animalCard}>
                  <Text style={styles.animalEmoji}>{s?.emoji ?? '🐾'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.animalName}>{animal.name}</Text>
                    <Text style={styles.animalMeta}>{s?.label} · {animal.primaryColor}</Text>
                    {animal.markings ? <Text style={styles.animalMarkings}>{animal.markings}</Text> : null}
                    {animal.tagNumber ? <Text style={styles.animalTag}>Tag #{animal.tagNumber}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Posts grid
  const rows = [];
  for (let i = 0; i < userPosts.length; i += 2) {
    rows.push(userPosts.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <PageHead title={user.name} description={`${user.name}'s sightings and animals on SheepFinder.`} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {headerComponent}
        {userPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📷</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>Nothing shared here yet.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map(post => <GridItem key={post.id} post={post} />)}
                {row.length === 1 && <View style={styles.gridItemSpacer} />}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 20 },
  animalsScroll: { padding: 20 },

  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontSize: 16, color: C.green, fontWeight: '700' },

  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  notFoundEmoji: { fontSize: 48 },
  notFoundText: { fontSize: 17, color: C.textSec },

  profileHero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, gap: 8 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  avatarText: { fontSize: 38, fontWeight: '800', color: '#FFF' },
  userName: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  farmerBadge: {
    backgroundColor: C.greenLight, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 100,
  },
  farmerBadgeText: { fontSize: 13, fontWeight: '700', color: C.green },

  statsRow: { flexDirection: 'row', width: '100%', marginTop: 8 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  statNum: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: C.textSec, fontWeight: '600', marginTop: 2 },

  followBtn: {
    marginTop: 4, paddingHorizontal: 40, paddingVertical: 11,
    borderRadius: 100, backgroundColor: C.green, borderWidth: 2, borderColor: C.green,
  },
  followBtnActive: { backgroundColor: 'transparent' },
  followBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  followBtnTextActive: { color: C.green },
  ownProfileNote: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: C.border,
  },
  ownProfileNoteText: { fontSize: 14, color: C.textSec, fontWeight: '600' },

  tabs: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: C.border, backgroundColor: C.card,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.green },
  tabText: { fontSize: 14, fontWeight: '700', color: C.textSec },
  tabTextActive: { color: C.green },

  grid: { padding: 16, gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  gridItem: {
    flex: 1, aspectRatio: 1, borderRadius: 12,
    overflow: 'hidden', backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
  },
  gridItemSpacer: { flex: 1 },
  gridPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridPhotoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridEmoji: { fontSize: 48 },
  gridBadge: {
    position: 'absolute', top: 8, left: 8,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  gridBadgeText: { fontSize: 11 },
  gridOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  gridOverlayLikes: { fontSize: 12, color: '#FFF', fontWeight: '700' },

  emptyState: { paddingTop: 48, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  emptySub: { fontSize: 14, color: C.textSec },

  animalCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
  },
  animalEmoji: { fontSize: 30, marginTop: 2 },
  animalName: { fontSize: 16, fontWeight: '800', color: C.text },
  animalMeta: { fontSize: 13, color: C.textSec, marginTop: 1 },
  animalMarkings: { fontSize: 13, color: C.textSec, marginTop: 2, lineHeight: 19 },
  animalTag: { fontSize: 12, color: C.green, fontWeight: '700', marginTop: 2 },
});
