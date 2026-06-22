// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp, SPECIES_LIST, SEED_USERS, timeAgo } from '@/store/app-store';

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
  amberLight: '#FFFBEB',
  amberBorder: '#FDE68A',
  orange: '#E8531F',
};

// ─── Following list ──────────────────────────────────────────────────────────
function stringToColor(str) {
  const colors = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function FollowingList({ currentUser, posts, isFollowing, toggleFollow, getUserById, onViewProfile }) {
  // Derive unique userIds from posts (community of known users)
  const allUserIds = [...new Set(posts.map(p => p.userId))].filter(id => id !== currentUser?.id);
  const knownUsers = allUserIds.map(id => getUserById(id) ?? { id, name: id, isFarmer: false }).filter(Boolean);

  if (knownUsers.length === 0) return null;

  return (
    <View style={styles.followingSection}>
      <Text style={styles.followingTitle}>People you might know</Text>
      {knownUsers.map(user => {
        const following = isFollowing(user.id);
        return (
          <View key={user.id} style={styles.followRow}>
            <TouchableOpacity
              style={styles.followRowLeft}
              onPress={() => onViewProfile(user.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.followAvatar, { backgroundColor: stringToColor(user.name) }]}>
                <Text style={styles.followAvatarText}>{user.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.followName}>{user.name}</Text>
                {user.isFarmer && <Text style={styles.followFarmer}>🌾 {user.farmName ?? 'Farmer'}</Text>}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={() => toggleFollow(user.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ─── Animal row in farmer signup ─────────────────────────────────────────────
function AnimalSignupCard({ animal, onRemove }) {
  const s = SPECIES_LIST.find(x => x.value === animal.species);
  return (
    <View style={styles.animalCard}>
      <Text style={styles.animalEmoji}>{s?.emoji ?? '🐾'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.animalName}>{animal.name}</Text>
        <Text style={styles.animalMeta}>{s?.label} · {animal.primaryColor}</Text>
        {animal.markings ? <Text style={styles.animalMarkings}>{animal.markings}</Text> : null}
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={{ fontSize: 18, color: C.textSec }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Inline add-animal form ───────────────────────────────────────────────────
function AddAnimalInline({ onAdd }) {
  const [species, setSpecies] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [markings, setMarkings] = useState('');
  const [tagNumber, setTagNumber] = useState('');

  const submit = () => {
    if (!species) { Alert.alert('Select an animal type'); return; }
    if (!name.trim()) { Alert.alert("Enter the animal's name"); return; }
    if (!color.trim()) { Alert.alert('Describe the primary colour'); return; }
    onAdd({ species, name: name.trim(), primaryColor: color.trim(), markings: markings.trim(), tagNumber: tagNumber.trim() || undefined });
    setSpecies(null); setName(''); setColor(''); setMarkings(''); setTagNumber('');
  };

  return (
    <View style={styles.addAnimalBox}>
      <Text style={styles.addAnimalTitle}>Add an animal</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {SPECIES_LIST.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.pill, species === s.value && styles.pillActive]}
            onPress={() => setSpecies(s.value)}
            activeOpacity={0.75}
          >
            <Text style={styles.pillEmoji}>{s.emoji}</Text>
            <Text style={[styles.pillLabel, species === s.value && styles.pillLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Name (e.g. Dotty)" placeholderTextColor={C.textSec} value={name} onChangeText={setName} />
      <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Primary colour (e.g. white, brown)" placeholderTextColor={C.textSec} value={color} onChangeText={setColor} />
      <TextInput
        style={[styles.input, styles.inputMulti, { marginTop: 8 }]}
        placeholder="Markings (e.g. blue ear tag #42, black spot on left ear)"
        placeholderTextColor={C.textSec}
        value={markings}
        onChangeText={setMarkings}
        multiline
      />
      <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Tag/ear number (optional)" placeholderTextColor={C.textSec} value={tagNumber} onChangeText={setTagNumber} />

      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 12 }]} onPress={submit} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>+ Add to list</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Auth screen (login / 2-step signup) ─────────────────────────────────────
function AuthScreen({ onLogin, onSignup, authLoading, authError, clearAuthError }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup-1' | 'signup-2'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFarmer, setIsFarmer] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [animals, setAnimals] = useState([]);

  const switchMode = (m) => { clearAuthError(); setMode(m); };

  const goToStep2 = () => {
    if (!name.trim()) { Alert.alert('Enter your full name'); return; }
    if (!email.trim()) { Alert.alert('Enter your email'); return; }
    if (!password || password.length < 6) { Alert.alert('Password must be at least 6 characters'); return; }
    if (isFarmer && !farmName.trim()) { Alert.alert('Enter your farm name'); return; }
    if (isFarmer) {
      setMode('signup-2');
    } else {
      onSignup(name.trim(), email.trim(), password, false, undefined, []);
    }
  };

  const finishSignup = () => {
    onSignup(name.trim(), email.trim(), password, true, farmName.trim(), animals);
  };

  const handleLogin = () => {
    if (!email.trim()) { Alert.alert('Enter your email'); return; }
    if (!password) { Alert.alert('Enter your password'); return; }
    onLogin(email.trim(), password);
  };

  if (mode === 'signup-2') {
    return (
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setMode('signup-1')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.step2Title}>Register your animals</Text>
        <Text style={styles.step2Sub}>
          We'll instantly alert you when someone reports a sighting matching your animal's description — with their exact location.
        </Text>

        {animals.map((a, i) => (
          <AnimalSignupCard key={i} animal={a} onRemove={() => setAnimals(prev => prev.filter((_, j) => j !== i))} />
        ))}

        <AddAnimalInline onAdd={a => setAnimals(prev => [...prev, a])} />

        {authError ? <Text style={styles.authError}>{authError}</Text> : null}

        <TouchableOpacity
          style={[styles.btnPrimary, { marginTop: 24 }, authLoading && { opacity: 0.6 }]}
          onPress={finishSignup}
          disabled={authLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>
            {authLoading ? 'Creating account…' : animals.length === 0 ? 'Skip & Create Account' : `Create Account with ${animals.length} animal${animals.length > 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.authHero}>
        <View style={styles.authLogoWrap}>
          <Text style={styles.authLogoEmoji}>🐑</Text>
        </View>
        <Text style={styles.authLogoTitle}>SheepFinder</Text>
        <Text style={styles.authLogoSub}>Reuniting animals with their owners</Text>
      </View>

      <View style={styles.authTabs}>
        <TouchableOpacity
          style={[styles.authTab, mode === 'login' && styles.authTabActive]}
          onPress={() => switchMode('login')}
          activeOpacity={0.8}
        >
          <Text style={[styles.authTabText, mode === 'login' && styles.authTabTextActive]}>Log in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.authTab, mode === 'signup-1' && styles.authTabActive]}
          onPress={() => switchMode('signup-1')}
          activeOpacity={0.8}
        >
          <Text style={[styles.authTabText, mode === 'signup-1' && styles.authTabTextActive]}>Sign up</Text>
        </TouchableOpacity>
      </View>

      {mode === 'signup-1' && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={C.textSec}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={[styles.input, { marginTop: mode === 'signup-1' ? 10 : 0 }]}
        placeholder="Email address"
        placeholderTextColor={C.textSec}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        placeholder="Password"
        placeholderTextColor={C.textSec}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {mode === 'signup-1' && (
        <View style={styles.farmerToggleCard}>
          <View style={styles.farmerToggleLeft}>
            <Text style={styles.farmerToggleTitle}>I'm a farmer</Text>
            <Text style={styles.farmerToggleSub}>Register your animals to receive instant sighting alerts</Text>
          </View>
          <Switch
            value={isFarmer}
            onValueChange={setIsFarmer}
            trackColor={{ false: C.border, true: C.greenMid }}
            thumbColor="#FFF"
          />
        </View>
      )}

      {mode === 'signup-1' && isFarmer && (
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Farm name (e.g. Highland Farm)"
          placeholderTextColor={C.textSec}
          value={farmName}
          onChangeText={setFarmName}
        />
      )}

      {authError ? <Text style={styles.authError}>{authError}</Text> : null}

      <TouchableOpacity
        style={[styles.btnPrimary, { marginTop: 16 }, authLoading && { opacity: 0.6 }]}
        onPress={mode === 'login' ? handleLogin : goToStep2}
        disabled={authLoading}
        activeOpacity={0.85}
      >
        <Text style={styles.btnPrimaryText}>
          {authLoading
            ? (mode === 'login' ? 'Logging in…' : 'Please wait…')
            : mode === 'login' ? 'Log in' : isFarmer ? 'Continue →' : 'Create Account'
          }
        </Text>
      </TouchableOpacity>

      {mode === 'signup-1' && isFarmer && (
        <Text style={styles.stepHint}>Step 1 of 2 — next: register your animals</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, login, signup, logout, registeredAnimals, registerAnimal, posts, notifications, unreadCount, markNotificationsRead, getFollowerCount, getFollowingCount, toggleFollow, isFollowing, getUserById, authLoading, authError, clearAuthError } = useApp();
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const myAnimals = registeredAnimals.filter(a => a.ownerId === currentUser?.id);
  const myPosts = posts.filter(p => p.userId === currentUser?.id);
  const followerCount = currentUser ? getFollowerCount(currentUser.id) : 0;
  const followingCount = currentUser ? getFollowingCount(currentUser.id) : 0;

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <AuthScreen
          onLogin={login}
          onSignup={signup}
          authLoading={authLoading}
          authError={authError}
          clearAuthError={clearAuthError}
        />
      </SafeAreaView>
    );
  }

  const openNotifications = () => {
    setNotifOpen(true);
    markNotificationsRead();
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={[styles.profileAvatar, { backgroundColor: C.green }]}>
            <Text style={styles.profileAvatarText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{currentUser.name}</Text>
            {currentUser.isFarmer && currentUser.farmName && (
              <View style={styles.farmerBadge}>
                <Text style={styles.farmerBadgeText}>🌾 {currentUser.farmName}</Text>
              </View>
            )}
          </View>
          {currentUser.isFarmer && (
            <TouchableOpacity style={styles.bellBtn} onPress={openNotifications} activeOpacity={0.8}>
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{myPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <TouchableOpacity style={[styles.statBox, styles.statMid]} onPress={() => setFollowingOpen(v => !v)} activeOpacity={0.75}>
            <Text style={styles.statNum}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBox} onPress={() => setFollowingOpen(v => !v)} activeOpacity={0.75}>
            <Text style={styles.statNum}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Following list */}
        {followingOpen && (
          <FollowingList
            currentUser={currentUser}
            posts={posts}
            isFollowing={isFollowing}
            toggleFollow={toggleFollow}
            getUserById={getUserById}
            onViewProfile={uid => router.push(`/profile/${uid}`)}
          />
        )}

        {/* Farmer alerts */}
        {currentUser.isFarmer && notifications.length > 0 && !notifOpen && (
          <TouchableOpacity style={styles.alertBanner} onPress={openNotifications} activeOpacity={0.85}>
            <Text style={styles.alertBannerIcon}>🔔</Text>
            <Text style={styles.alertBannerText}>
              {unreadCount > 0 ? `${unreadCount} new sighting alert${unreadCount > 1 ? 's' : ''}` : 'View sighting alerts'}
            </Text>
            <Text style={styles.alertBannerChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Notifications expanded */}
        {notifOpen && notifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sighting Alerts</Text>
              <TouchableOpacity onPress={() => setNotifOpen(false)}>
                <Text style={styles.collapseBtn}>Hide</Text>
              </TouchableOpacity>
            </View>
            {notifications.map(n => {
              const s = SPECIES_LIST.find(x => x.value === n.species);
              return (
                <View key={n.id} style={styles.notifCard}>
                  <View style={styles.notifCardHeader}>
                    <Text style={styles.notifEmoji}>{s?.emoji ?? '🐾'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>{n.animalName} has been spotted!</Text>
                      <Text style={styles.notifTime}>{timeAgo(n.timestamp)}</Text>
                    </View>
                  </View>
                  <Text style={styles.notifReporter}>Reported by {n.reporterName}</Text>
                  {n.locationLabel && (
                    <View style={styles.notifLocationRow}>
                      <Text style={styles.notifLocationIcon}>📍</Text>
                      <Text style={styles.notifLocation}>{n.locationLabel}</Text>
                    </View>
                  )}
                  {n.latitude && n.longitude && (
                    <Text style={styles.notifCoords}>
                      GPS: {n.latitude.toFixed(5)}, {n.longitude.toFixed(5)}
                    </Text>
                  )}
                  <View style={styles.notifMsgBox}>
                    <Text style={styles.notifMsg}>"{n.reporterCaption}"</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* My animals (farmer) */}
        {currentUser.isFarmer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Animals</Text>
              {!showAddAnimal && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAnimal(true)} activeOpacity={0.8}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sectionSub}>
              We alert you instantly when a sighting matches your animal.
            </Text>

            {showAddAnimal && (
              <AddAnimalInline
                onAdd={data => {
                  registerAnimal(data);
                  setShowAddAnimal(false);
                }}
              />
            )}
            {showAddAnimal && (
              <TouchableOpacity onPress={() => setShowAddAnimal(false)} style={{ marginTop: 8 }}>
                <Text style={{ color: C.textSec, fontSize: 14, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            )}

            {myAnimals.length === 0 && !showAddAnimal ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>🐑</Text>
                <Text style={styles.emptyTitle}>No animals registered</Text>
                <Text style={styles.emptySub}>Add your animals to receive alerts</Text>
              </View>
            ) : (
              myAnimals.map(a => {
                const s = SPECIES_LIST.find(x => x.value === a.species);
                return (
                  <View key={a.id} style={styles.animalCard}>
                    <Text style={styles.animalEmoji}>{s?.emoji ?? '🐾'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.animalName}>{a.name}</Text>
                      <Text style={styles.animalMeta}>{s?.label} · {a.primaryColor}</Text>
                      {a.markings ? <Text style={styles.animalMarkings}>{a.markings}</Text> : null}
                      {a.tagNumber ? <Text style={styles.animalTag}>Tag #{a.tagNumber}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* My activity */}
        {myPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Activity</Text>
            {myPosts.map(p => (
              <View key={p.id} style={styles.activityRow}>
                <Text style={{ fontSize: 22, marginTop: 2 }}>{p.isSighting ? '🚨' : '📸'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityCaption} numberOfLines={2}>{p.caption}</Text>
                  <Text style={styles.activityMeta}>
                    {p.isSighting ? 'Sighting' : 'Community'} · {p.likes.length} ❤️ · {p.comments.length} 💬
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20 },
  authScroll: { padding: 24, flexGrow: 1 },

  authHero: { alignItems: 'center', paddingTop: 16, paddingBottom: 28, gap: 6 },
  authLogoWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: C.green,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  authLogoEmoji: { fontSize: 40 },
  authLogoTitle: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  authLogoSub: { fontSize: 15, color: C.textSec },

  authTabs: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 14,
    padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border,
  },
  authTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  authTabActive: { backgroundColor: C.green },
  authTabText: { fontSize: 15, fontWeight: '700', color: C.textSec },
  authTabTextActive: { color: '#FFF' },

  farmerToggleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 14, padding: 16, marginTop: 14,
    borderWidth: 1.5, borderColor: C.border, gap: 12,
  },
  farmerToggleLeft: { flex: 1, gap: 2 },
  farmerToggleTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  farmerToggleSub: { fontSize: 13, color: C.textSec, lineHeight: 18 },

  stepHint: { fontSize: 13, color: C.textSec, textAlign: 'center', marginTop: 14 },
  authError: {
    fontSize: 14, color: C.red, textAlign: 'center', marginTop: 12,
    backgroundColor: '#FFF0EE', borderRadius: 10, padding: 12, lineHeight: 20,
  },

  backBtn: { marginBottom: 20 },
  backBtnText: { fontSize: 16, color: C.green, fontWeight: '700' },
  step2Title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 8 },
  step2Sub: { fontSize: 14, color: C.textSec, lineHeight: 21, marginBottom: 22 },

  addAnimalBox: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: C.border, marginBottom: 12,
  },
  addAnimalTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 12 },

  pillRow: { gap: 8, paddingBottom: 4, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 100,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    flexShrink: 0,
  },
  pillActive: { backgroundColor: C.green, borderColor: C.green },
  pillEmoji: { fontSize: 17 },
  pillLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  pillLabelActive: { color: '#FFF' },

  input: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.text,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  btnPrimary: {
    backgroundColor: C.green, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  profileAvatarText: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  profileName: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  farmerBadge: {
    backgroundColor: C.greenLight, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 100, alignSelf: 'flex-start', marginTop: 4,
  },
  farmerBadgeText: { fontSize: 13, color: C.green, fontWeight: '700' },

  bellBtn: { padding: 8, position: 'relative' },
  bellIcon: { fontSize: 26 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: C.red, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, color: '#FFF', fontWeight: '800' },

  statsRow: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 20, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  statNum: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: C.textSec, marginTop: 2, fontWeight: '600' },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.amberLight, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.amberBorder,
    padding: 16, marginBottom: 20,
  },
  alertBannerIcon: { fontSize: 22 },
  alertBannerText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#92400E' },
  alertBannerChevron: { fontSize: 22, color: '#B45309' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  sectionSub: { fontSize: 13, color: C.textSec, lineHeight: 19, marginBottom: 14 },
  addBtn: { backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  collapseBtn: { fontSize: 14, color: C.textSec, fontWeight: '600' },

  notifCard: {
    backgroundColor: C.amberLight, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: C.amberBorder, marginBottom: 12, gap: 8,
  },
  notifCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifEmoji: { fontSize: 26 },
  notifTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  notifTime: { fontSize: 12, color: C.textSec, marginTop: 1 },
  notifReporter: { fontSize: 14, color: C.textSec },
  notifLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifLocationIcon: { fontSize: 14 },
  notifLocation: { fontSize: 15, fontWeight: '700', color: C.text },
  notifCoords: { fontSize: 12, color: C.textSec, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  notifMsgBox: {
    backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  notifMsg: { fontSize: 14, color: C.textSec, fontStyle: 'italic', lineHeight: 20 },

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

  emptyBox: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 28, alignItems: 'center', gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  emptySub: { fontSize: 13, color: C.textSec },

  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  activityCaption: { fontSize: 14, color: C.text, lineHeight: 20 },
  activityMeta: { fontSize: 12, color: C.textSec, marginTop: 3 },

  signOutBtn: {
    backgroundColor: C.card, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#F0D0D0', marginTop: 4,
  },
  signOutText: { color: C.red, fontSize: 16, fontWeight: '700' },

  followingSection: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, marginBottom: 20, overflow: 'hidden',
  },
  followingTitle: {
    fontSize: 13, fontWeight: '700', color: C.textSec, letterSpacing: 0.4,
    textTransform: 'uppercase', padding: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  followRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  followRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  followAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  followAvatarText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  followName: { fontSize: 15, fontWeight: '700', color: C.text },
  followFarmer: { fontSize: 12, color: C.green, fontWeight: '600' },
  followBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100,
    backgroundColor: C.green,
  },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
  followBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  followBtnTextActive: { color: C.textSec },
});

// need Platform import for monospace font
import { Platform } from 'react-native';
