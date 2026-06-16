// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, Modal, ScrollView, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useApp, SPECIES_LIST, timeAgo } from '@/store/app-store';

const C = {
  bg: '#F4F1E8',
  card: '#FFFFFF',
  green: '#4A6021',
  greenMid: '#6B832E',
  gold: '#C8901A',
  orange: '#D4612A',
  text: '#1C1F16',
  textSec: '#6B7155',
  border: '#DDD8C8',
  red: '#C0392B',
  escapedBg: '#FFF1EC',
  escapedBorder: '#D4612A',
  resolvedBg: '#EDFAF1',
  resolvedBorder: '#2E7D32',
};

const FILTERS = ['All', 'Escaped', 'Community'];

function PostCard({ post, currentUserId, onLike, onAddComment }) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const isLiked = post.likes.includes(currentUserId ?? 'guest');
  const speciesInfo = SPECIES_LIST.find(s => s.value === post.species);

  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    onAddComment(post.id, text);
    setCommentText('');
  };

  const statusLabel = post.isSighting
    ? post.sightingStatus === 'resolved'
      ? '✅ Reunited'
      : '🚨 Escaped'
    : null;

  const statusStyle = post.isSighting
    ? post.sightingStatus === 'resolved'
      ? { bg: C.resolvedBg, border: C.resolvedBorder, color: '#1B5E20' }
      : { bg: C.escapedBg, border: C.escapedBorder, color: C.orange }
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.userName.charAt(0)}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardUserName}>{post.userName}</Text>
          <Text style={styles.cardTime}>{timeAgo(post.timestamp)}</Text>
        </View>
        {statusLabel && (
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        )}
      </View>

      {/* Photo */}
      {post.photo ? (
        <Image source={{ uri: post.photo }} style={styles.cardPhoto} />
      ) : (
        <View style={styles.cardPhotoPlaceholder}>
          <Text style={styles.cardPhotoEmoji}>{speciesInfo?.emoji ?? '🐾'}</Text>
        </View>
      )}

      {/* Meta row */}
      <View style={styles.cardMeta}>
        {speciesInfo && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{speciesInfo.emoji} {speciesInfo.label}</Text>
          </View>
        )}
        {post.locationLabel ? (
          <Text style={styles.locationText} numberOfLines={1}>📍 {post.locationLabel}</Text>
        ) : null}
      </View>

      {/* Caption */}
      <Text style={styles.caption}>{post.caption}</Text>

      {/* Sighting details */}
      {post.isSighting && post.markings ? (
        <View style={styles.markingsBox}>
          <Text style={styles.markingsLabel}>Markings: </Text>
          <Text style={styles.markingsText}>{post.markings}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)} activeOpacity={0.7}>
          <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{post.likes.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setCommentOpen(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.comments.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments */}
      {commentOpen && (
        <View style={styles.commentsSection}>
          {post.comments.map(c => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentUser}>{c.userName} </Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}
          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentField}
              placeholder="Add a comment…"
              placeholderTextColor={C.textSec}
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={submitComment}
            />
            <TouchableOpacity onPress={submitComment} activeOpacity={0.8}>
              <Text style={styles.commentSend}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { posts, currentUser, toggleLike, addComment, addCommunityPost } = useApp();
  const [filter, setFilter] = useState('All');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Share modal state
  const [sharePhoto, setSharePhoto] = useState(null);
  const [shareCaption, setShareCaption] = useState('');
  const [shareSpecies, setShareSpecies] = useState(null);
  const [shareLocation, setShareLocation] = useState('');

  const filteredPosts = posts.filter(p => {
    if (filter === 'Escaped') return p.isSighting && p.sightingStatus !== 'resolved';
    if (filter === 'Community') return !p.isSighting;
    return true;
  });

  const pickSharePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setSharePhoto(result.assets[0].uri);
  };

  const submitShare = () => {
    if (!shareCaption.trim()) {
      Alert.alert('Missing caption', 'Please write something about this animal!');
      return;
    }
    addCommunityPost({
      photo: sharePhoto,
      caption: shareCaption.trim(),
      species: shareSpecies,
      locationLabel: shareLocation.trim() || undefined,
    });
    setShareModalOpen(false);
    setSharePhoto(null);
    setShareCaption('');
    setShareSpecies(null);
    setShareLocation('');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => setShareModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.shareBtnText}>+ Share</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={currentUser?.id}
            onLike={toggleLike}
            onAddComment={addComment}
          />
        )}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyText}>Nothing here yet</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'Escaped'
                ? 'No open escaped animal reports right now.'
                : 'Be the first to share a photo!'}
            </Text>
          </View>
        }
      />

      {/* Share Modal */}
      <Modal
        visible={shareModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShareModalOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShareModalOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Share a Photo</Text>
              <TouchableOpacity onPress={submitShare}>
                <Text style={styles.modalPost}>Post</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity style={styles.sharePhotoBox} onPress={pickSharePhoto} activeOpacity={0.8}>
                {sharePhoto ? (
                  <Image source={{ uri: sharePhoto }} style={styles.sharePhotoPreview} />
                ) : (
                  <View style={styles.sharePhotoPlaceholder}>
                    <Text style={styles.sharePhotoIcon}>🖼️</Text>
                    <Text style={styles.sharePhotoLabel}>Tap to add a photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's happening with this animal? Share the moment…"
                placeholderTextColor={C.textSec}
                value={shareCaption}
                onChangeText={setShareCaption}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Animal type (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.speciesRow}
              >
                {SPECIES_LIST.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.speciesPill, shareSpecies === s.value && styles.speciesPillActive]}
                    onPress={() => setShareSpecies(v => v === s.value ? null : s.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.speciesEmoji}>{s.emoji}</Text>
                    <Text style={[styles.speciesLabel, shareSpecies === s.value && styles.speciesLabelActive]}>
                      {s.label}
                    </Text>
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

              <View style={{ height: 32 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
  },
  shareBtn: {
    backgroundColor: C.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  filterTabActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSec,
  },
  filterTextActive: {
    color: '#FFF',
  },
  feed: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.greenMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardUserName: {
    fontWeight: '700',
    fontSize: 15,
    color: C.text,
  },
  cardTime: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardPhoto: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  cardPhotoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0EDE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPhotoEmoji: {
    fontSize: 72,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#EEF2E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    color: C.green,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 13,
    color: C.textSec,
    flex: 1,
  },
  caption: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  markingsBox: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  markingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSec,
  },
  markingsText: {
    fontSize: 13,
    color: C.textSec,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 20,
  },
  likedIcon: {
    fontSize: 20,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSec,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  comment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  commentText: {
    fontSize: 14,
    color: C.text,
    flex: 1,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  commentField: {
    flex: 1,
    backgroundColor: '#F4F1E8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: C.text,
  },
  commentSend: {
    color: C.green,
    fontWeight: '700',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 52,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  modal: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  modalCancel: {
    fontSize: 16,
    color: C.textSec,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  modalPost: {
    fontSize: 16,
    fontWeight: '700',
    color: C.green,
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  sharePhotoBox: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  sharePhotoPreview: {
    width: '100%',
    height: '100%',
  },
  sharePhotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sharePhotoIcon: {
    fontSize: 40,
  },
  sharePhotoLabel: {
    fontSize: 15,
    color: C.textSec,
    fontWeight: '600',
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginTop: 8,
    marginBottom: 6,
  },
  speciesRow: {
    gap: 8,
    paddingBottom: 4,
  },
  speciesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 6,
  },
  speciesPillActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  speciesEmoji: {
    fontSize: 18,
  },
  speciesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  speciesLabelActive: {
    color: '#FFF',
  },
});
