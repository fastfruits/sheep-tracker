// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useApp, SPECIES_LIST, timeAgo } from '@/store/app-store';

const C = {
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
  orange: '#E8531F',
  escapedBg: '#FFF3EE',
  escapedBorder: '#F3AA8C',
  resolvedBg: '#EDFAF1',
  resolvedBorder: '#74C98A',
};

const FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'Escaped', label: '🚨 Escaped' },
  { key: 'Community', label: '📸 Community' },
];

function PostCard({ post, currentUserId, onLike, onAddComment }) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const isLiked = post.likes.includes(currentUserId ?? 'guest');
  const speciesInfo = SPECIES_LIST.find(s => s.value === post.species);
  const isEscaped = post.isSighting && post.sightingStatus !== 'resolved';
  const isResolved = post.isSighting && post.sightingStatus === 'resolved';

  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    onAddComment(post.id, text);
    setCommentText('');
  };

  return (
    <View style={styles.card}>
      {/* Escaped/resolved banner */}
      {isEscaped && (
        <View style={styles.escapedBanner}>
          <Text style={styles.escapedBannerText}>🚨  Escaped Animal — Help needed!</Text>
        </View>
      )}
      {isResolved && (
        <View style={styles.resolvedBanner}>
          <Text style={styles.resolvedBannerText}>✅  Reunited with owner</Text>
        </View>
      )}

      {/* Photo */}
      {post.photo ? (
        <Image source={{ uri: post.photo }} style={styles.cardPhoto} />
      ) : (
        <View style={styles.cardPhotoEmpty}>
          <Text style={styles.cardPhotoEmoji}>{speciesInfo?.emoji ?? '🐾'}</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: stringToColor(post.userName) }]}>
            <Text style={styles.avatarText}>{post.userName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardUserName}>{post.userName}</Text>
            <Text style={styles.cardTime}>{timeAgo(post.timestamp)}</Text>
          </View>
          {speciesInfo && (
            <View style={styles.speciesTag}>
              <Text style={styles.speciesTagText}>{speciesInfo.emoji} {speciesInfo.label}</Text>
            </View>
          )}
        </View>

        {/* Caption */}
        <Text style={styles.caption}>{post.caption}</Text>

        {/* Sighting details */}
        {post.isSighting && (post.markings || post.primaryColor) && (
          <View style={styles.detailsBox}>
            {post.primaryColor && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Colour</Text>
                <Text style={styles.detailVal}>{post.primaryColor}</Text>
              </View>
            )}
            {post.markings && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Markings</Text>
                <Text style={styles.detailVal}>{post.markings}</Text>
              </View>
            )}
          </View>
        )}

        {/* Location */}
        {post.locationLabel && (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>{post.locationLabel}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.actionLabel, isLiked && { color: C.red }]}>{post.likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentOpen(v => !v)} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>{post.comments.length}</Text>
          </TouchableOpacity>
        </View>

        {/* Comments section */}
        {commentOpen && (
          <View style={styles.commentsWrap}>
            {post.comments.map(c => (
              <View key={c.id} style={styles.commentRow}>
                <Text style={styles.commentUser}>{c.userName}</Text>
                <Text style={styles.commentText}> {c.text}</Text>
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment…"
                placeholderTextColor={C.textSec}
                value={commentText}
                onChangeText={setCommentText}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity onPress={submitComment} activeOpacity={0.8}>
                <Text style={styles.commentSend}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function stringToColor(str) {
  const colors = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { posts, currentUser, toggleLike, addComment, addCommunityPost } = useApp();
  const [filter, setFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [sharePhoto, setSharePhoto] = useState(null);
  const [shareCaption, setShareCaption] = useState('');
  const [shareSpecies, setShareSpecies] = useState(null);
  const [shareLocation, setShareLocation] = useState('');

  const filtered = posts.filter(p => {
    if (filter === 'Escaped') return p.isSighting && p.sightingStatus !== 'resolved';
    if (filter === 'Community') return !p.isSighting;
    return true;
  });

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo library access required'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!r.canceled) setSharePhoto(r.assets[0].uri);
  };

  const submitShare = () => {
    if (!shareCaption.trim()) { Alert.alert('Add a caption first'); return; }
    addCommunityPost({ photo: sharePhoto, caption: shareCaption.trim(), species: shareSpecies, locationLabel: shareLocation.trim() || undefined });
    setModalOpen(false);
    setSharePhoto(null); setShareCaption(''); setShareSpecies(null); setShareLocation('');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSub}>{posts.filter(p => p.isSighting && p.sightingStatus !== 'resolved').length} open sightings</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
          <Text style={styles.shareBtnText}>+ Share</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <PostCard post={item} currentUserId={currentUser?.id} onLike={toggleLike} onAddComment={addComment} />
        )}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>
              {filter === 'Escaped' ? 'No open sightings right now.' : 'Be the first to share a photo!'}
            </Text>
          </View>
        }
      />

      {/* Share modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalBar}>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Share a photo</Text>
              <TouchableOpacity onPress={submitShare}>
                <Text style={styles.modalPost}>Post</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.sharePhotoBox} onPress={pickPhoto} activeOpacity={0.85}>
                {sharePhoto
                  ? <Image source={{ uri: sharePhoto }} style={{ width: '100%', height: '100%' }} />
                  : <View style={styles.sharePhotoEmpty}>
                      <Text style={{ fontSize: 40 }}>🖼️</Text>
                      <Text style={styles.sharePhotoLabel}>Tap to add a photo</Text>
                    </View>
                }
              </TouchableOpacity>

              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="What's the story with this animal?"
                placeholderTextColor={C.textSec}
                value={shareCaption}
                onChangeText={setShareCaption}
                multiline
              />

              <Text style={styles.label}>Animal type (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {SPECIES_LIST.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.pill, shareSpecies === s.value && styles.pillActive]}
                    onPress={() => setShareSpecies(v => v === s.value ? null : s.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.pillEmoji}>{s.emoji}</Text>
                    <Text style={[styles.pillLabel, shareSpecies === s.value && styles.pillLabelActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Location (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Where was this taken?"
                placeholderTextColor={C.textSec}
                value={shareLocation}
                onChangeText={setShareLocation}
              />
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: C.textSec, marginTop: 1 },
  shareBtn: {
    backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 100,
  },
  shareBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
  },
  filterPillActive: { backgroundColor: C.green, borderColor: C.green },
  filterText: { fontSize: 14, fontWeight: '600', color: C.textSec },
  filterTextActive: { color: '#FFF' },

  feed: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },

  card: {
    backgroundColor: C.card, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  escapedBanner: { backgroundColor: C.escapedBg, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.escapedBorder },
  escapedBannerText: { fontSize: 13, fontWeight: '700', color: C.orange },
  resolvedBanner: { backgroundColor: C.resolvedBg, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.resolvedBorder },
  resolvedBannerText: { fontSize: 13, fontWeight: '700', color: '#1A7A3A' },

  cardPhoto: { width: '100%', height: 240, resizeMode: 'cover' },
  cardPhotoEmpty: { width: '100%', height: 170, backgroundColor: '#F3F2ED', justifyContent: 'center', alignItems: 'center' },
  cardPhotoEmoji: { fontSize: 76 },

  cardBody: { padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cardUserName: { fontSize: 15, fontWeight: '700', color: C.text },
  cardTime: { fontSize: 12, color: C.textSec },
  speciesTag: { backgroundColor: C.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  speciesTagText: { fontSize: 12, fontWeight: '700', color: C.green },

  caption: { fontSize: 15, color: C.text, lineHeight: 22 },

  detailsBox: { backgroundColor: '#F7F6F2', borderRadius: 10, padding: 12, gap: 6 },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailKey: { fontSize: 13, fontWeight: '700', color: C.textSec, width: 70 },
  detailVal: { fontSize: 13, color: C.text, flex: 1 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationIcon: { fontSize: 13 },
  locationText: { fontSize: 13, color: C.textSec, flex: 1 },

  actions: {
    flexDirection: 'row', gap: 18, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: C.textSec },

  commentsWrap: { gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  commentRow: { flexDirection: 'row', flexWrap: 'wrap' },
  commentUser: { fontSize: 14, fontWeight: '700', color: C.text },
  commentText: { fontSize: 14, color: C.text },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: {
    flex: 1, backgroundColor: C.bg, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: C.text,
  },
  commentSend: { color: C.green, fontWeight: '800', fontSize: 14 },

  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyEmoji: { fontSize: 54 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  emptySub: { fontSize: 14, color: C.textSec, textAlign: 'center', paddingHorizontal: 40, lineHeight: 21 },

  modal: { flex: 1, backgroundColor: C.bg },
  modalBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card,
  },
  modalCancel: { fontSize: 16, color: C.textSec },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  modalPost: { fontSize: 16, fontWeight: '800', color: C.green },
  modalBody: { padding: 20, gap: 12 },

  sharePhotoBox: {
    width: '100%', height: 200, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderStyle: 'dashed',
  },
  sharePhotoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  sharePhotoLabel: { fontSize: 15, fontWeight: '600', color: C.textSec },

  input: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.text,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '700', color: C.textSec, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 },
  pillRow: { gap: 8, paddingBottom: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 100,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
  },
  pillActive: { backgroundColor: C.green, borderColor: C.green },
  pillEmoji: { fontSize: 17 },
  pillLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  pillLabelActive: { color: '#FFF' },
});
