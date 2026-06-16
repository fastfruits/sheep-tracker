// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, SPECIES_LIST } from '@/store/app-store';

const C = {
  bg: '#F4F1E8',
  card: '#FFFFFF',
  green: '#4A6021',
  greenMid: '#6B832E',
  gold: '#C8901A',
  text: '#1C1F16',
  textSec: '#6B7155',
  border: '#DDD8C8',
  red: '#C0392B',
};

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFarmer, setIsFarmer] = useState(false);
  const [farmName, setFarmName] = useState('');

  const handleSubmit = () => {
    if (tab === 'signup' && !name.trim()) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing info', 'Please enter your email.');
      return;
    }
    if (tab === 'signup' && isFarmer && !farmName.trim()) {
      Alert.alert('Missing info', 'Please enter your farm name.');
      return;
    }
    onLogin(
      tab === 'login' ? (email.split('@')[0] || 'User') : name.trim(),
      email.trim(),
      isFarmer,
      isFarmer ? farmName.trim() : undefined,
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.authScroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.authHero}>
        <Text style={styles.authHeroEmoji}>🐑</Text>
        <Text style={styles.authHeroTitle}>SheepFinder</Text>
        <Text style={styles.authHeroSub}>Reuniting animals with their owners</Text>
      </View>

      <View style={styles.authTabs}>
        <TouchableOpacity
          style={[styles.authTab, tab === 'login' && styles.authTabActive]}
          onPress={() => setTab('login')}
        >
          <Text style={[styles.authTabText, tab === 'login' && styles.authTabTextActive]}>Log in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.authTab, tab === 'signup' && styles.authTabActive]}
          onPress={() => setTab('signup')}
        >
          <Text style={[styles.authTabText, tab === 'signup' && styles.authTabTextActive]}>Sign up</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.authForm}>
        {tab === 'signup' && (
          <>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={C.textSec}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={C.textSec}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={C.textSec}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {tab === 'signup' && (
          <>
            <View style={styles.farmerRow}>
              <View style={styles.farmerRowText}>
                <Text style={styles.farmerRowTitle}>I'm a farmer</Text>
                <Text style={styles.farmerRowSub}>Register your animals to receive sighting alerts</Text>
              </View>
              <Switch
                value={isFarmer}
                onValueChange={setIsFarmer}
                trackColor={{ true: C.green }}
                thumbColor="#FFF"
              />
            </View>

            {isFarmer && (
              <>
                <Text style={styles.label}>Farm name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Hillside Farm"
                  placeholderTextColor={C.textSec}
                  value={farmName}
                  onChangeText={setFarmName}
                />
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{tab === 'login' ? 'Log in' : 'Create account'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AddAnimalForm({ onAdd, onCancel }) {
  const [species, setSpecies] = useState(null);
  const [animalName, setAnimalName] = useState('');
  const [color, setColor] = useState('');
  const [markings, setMarkings] = useState('');
  const [tagNumber, setTagNumber] = useState('');

  const handleSubmit = () => {
    if (!species) { Alert.alert('Missing info', 'Please select the animal type.'); return; }
    if (!animalName.trim()) { Alert.alert('Missing info', 'Please enter the animal\'s name.'); return; }
    if (!color.trim()) { Alert.alert('Missing info', 'Please describe the primary colour.'); return; }
    onAdd({ species, name: animalName.trim(), primaryColor: color.trim(), markings: markings.trim(), tagNumber: tagNumber.trim() || undefined });
  };

  return (
    <View style={styles.addAnimalForm}>
      <Text style={styles.sectionTitle}>Register an Animal</Text>

      <Text style={styles.label}>Animal type <Text style={{ color: C.red }}>*</Text></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesRow}>
        {SPECIES_LIST.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.speciesPill, species === s.value && styles.speciesPillActive]}
            onPress={() => setSpecies(s.value)}
            activeOpacity={0.75}
          >
            <Text style={styles.speciesEmoji}>{s.emoji}</Text>
            <Text style={[styles.speciesLabel, species === s.value && styles.speciesLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Name <Text style={{ color: C.red }}>*</Text></Text>
      <TextInput style={styles.input} placeholder="e.g. Dotty" placeholderTextColor={C.textSec} value={animalName} onChangeText={setAnimalName} />

      <Text style={styles.label}>Primary colour <Text style={{ color: C.red }}>*</Text></Text>
      <TextInput style={styles.input} placeholder="e.g. white, brown, black and white" placeholderTextColor={C.textSec} value={color} onChangeText={setColor} />

      <Text style={styles.label}>Distinguishing markings</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="e.g. blue ear tag #42, black spot on left ear, red collar"
        placeholderTextColor={C.textSec}
        value={markings}
        onChangeText={setMarkings}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Tag / ear number (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. 42" placeholderTextColor={C.textSec} value={tagNumber} onChangeText={setTagNumber} />

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Register Animal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, login, logout, registeredAnimals, registerAnimal, posts } = useApp();
  const [showAddAnimal, setShowAddAnimal] = useState(false);

  const myAnimals = registeredAnimals.filter(a => a.ownerId === currentUser?.id);
  const myPosts = posts.filter(p => p.userId === currentUser?.id);

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <AuthScreen onLogin={login} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser.name}</Text>
            <Text style={styles.profileEmail}>{currentUser.email}</Text>
            {currentUser.isFarmer && (
              <View style={styles.farmerBadge}>
                <Text style={styles.farmerBadgeText}>🌾 {currentUser.farmName ?? 'Farmer'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{myPosts.filter(p => p.isSighting).length}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={styles.statNumber}>{myPosts.filter(p => !p.isSighting).length}</Text>
            <Text style={styles.statLabel}>Shared</Text>
          </View>
          {currentUser.isFarmer && (
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{myAnimals.length}</Text>
              <Text style={styles.statLabel}>Animals</Text>
            </View>
          )}
        </View>

        {/* Farmer section */}
        {currentUser.isFarmer && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Registered Animals</Text>
              {!showAddAnimal && (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setShowAddAnimal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sectionSub}>
              When someone reports an animal matching your description, we'll alert you immediately.
            </Text>

            {showAddAnimal && (
              <AddAnimalForm
                onAdd={(data) => {
                  registerAnimal(data);
                  setShowAddAnimal(false);
                }}
                onCancel={() => setShowAddAnimal(false)}
              />
            )}

            {myAnimals.length === 0 && !showAddAnimal ? (
              <View style={styles.emptyAnimals}>
                <Text style={styles.emptyAnimalsIcon}>🐑</Text>
                <Text style={styles.emptyAnimalsText}>No animals registered yet</Text>
                <Text style={styles.emptyAnimalsSub}>Add your animals to receive sighting alerts</Text>
              </View>
            ) : (
              myAnimals.map(animal => {
                const speciesInfo = SPECIES_LIST.find(s => s.value === animal.species);
                return (
                  <View key={animal.id} style={styles.animalCard}>
                    <Text style={styles.animalEmoji}>{speciesInfo?.emoji ?? '🐾'}</Text>
                    <View style={styles.animalInfo}>
                      <Text style={styles.animalName}>{animal.name}</Text>
                      <Text style={styles.animalDetail}>{speciesInfo?.label} · {animal.primaryColor}</Text>
                      {animal.markings ? <Text style={styles.animalMarkings}>{animal.markings}</Text> : null}
                      {animal.tagNumber ? <Text style={styles.animalTag}>Tag #{animal.tagNumber}</Text> : null}
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
            {myPosts.map(post => (
              <View key={post.id} style={styles.activityRow}>
                <Text style={styles.activityIcon}>
                  {post.isSighting ? '🚨' : '📸'}
                </Text>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityCaption} numberOfLines={2}>{post.caption}</Text>
                  <Text style={styles.activityMeta}>
                    {post.isSighting ? 'Sighting report' : 'Community post'} ·{' '}
                    {post.likes.length} ❤️ · {post.comments.length} 💬
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 20,
  },
  authScroll: {
    padding: 24,
    flexGrow: 1,
  },
  authHero: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  authHeroEmoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  authHeroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
  },
  authHeroSub: {
    fontSize: 15,
    color: C.textSec,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  authTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  authTabActive: {
    backgroundColor: C.green,
  },
  authTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSec,
  },
  authTabTextActive: {
    color: '#FFF',
  },
  authForm: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
    marginTop: 12,
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
    height: 88,
    textAlignVertical: 'top',
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 12,
  },
  farmerRowText: {
    flex: 1,
  },
  farmerRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  farmerRowSub: {
    fontSize: 13,
    color: C.textSec,
    lineHeight: 18,
  },
  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  btnSecondaryText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  profileEmail: {
    fontSize: 13,
    color: C.textSec,
  },
  farmerBadge: {
    backgroundColor: '#EEF2E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  farmerBadgeText: {
    fontSize: 13,
    color: C.green,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  statLabel: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  sectionSub: {
    fontSize: 13,
    color: C.textSec,
    lineHeight: 19,
    marginBottom: 14,
  },
  addBtn: {
    backgroundColor: C.green,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  addAnimalForm: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
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
    backgroundColor: C.bg,
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
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  emptyAnimals: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyAnimalsIcon: {
    fontSize: 40,
  },
  emptyAnimalsText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  emptyAnimalsSub: {
    fontSize: 13,
    color: C.textSec,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  animalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    gap: 12,
  },
  animalEmoji: {
    fontSize: 32,
  },
  animalInfo: {
    flex: 1,
    gap: 2,
  },
  animalName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  animalDetail: {
    fontSize: 13,
    color: C.textSec,
  },
  animalMarkings: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
  },
  animalTag: {
    fontSize: 12,
    color: C.green,
    fontWeight: '600',
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    gap: 12,
  },
  activityIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  activityInfo: {
    flex: 1,
    gap: 4,
  },
  activityCaption: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  activityMeta: {
    fontSize: 12,
    color: C.textSec,
  },
  signOutBtn: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8D0D0',
    marginTop: 8,
  },
  signOutText: {
    color: C.red,
    fontSize: 16,
    fontWeight: '600',
  },
});
