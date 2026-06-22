// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useApp, SPECIES_LIST } from '@/store/app-store';

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
};

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { submitSighting } = useApp();

  const [photo, setPhoto] = useState(null);
  const [species, setSpecies] = useState(null);
  const [color, setColor] = useState('');
  const [markings, setMarkings] = useState('');
  const [caption, setCaption] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [matchedAnimals, setMatchedAnimals] = useState([]);

  const onPhotoPress = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: launchCamera },
      { text: 'Photo Library', onPress: launchLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera access required'); return; }
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo library access required'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const detectLocation = async () => {
    setLoadingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location access required');
      setLoadingLocation(false);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords(loc.coords);
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      if (geo) {
        const parts = [geo.street, geo.district || geo.subregion, geo.city].filter(Boolean);
        setLocationLabel(parts.join(', '));
      }
    } catch {
      Alert.alert('Could not get location', 'Please type it manually.');
    }
    setLoadingLocation(false);
  };

  const handleSubmit = () => {
    if (!species) { Alert.alert('Select an animal type'); return; }
    if (!color.trim()) { Alert.alert('Describe the animal\'s colour'); return; }
    const matches = submitSighting({
      photo,
      species,
      primaryColor: color.trim(),
      markings: markings.trim(),
      caption: caption.trim(),
      locationLabel: locationLabel.trim() || undefined,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    });
    setMatchedAnimals(matches);
    setSubmitted(true);
  };

  const reset = () => {
    setPhoto(null); setSpecies(null); setColor(''); setMarkings('');
    setCaption(''); setLocationLabel(''); setCoords(null);
    setSubmitted(false); setMatchedAnimals([]);
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.successSub}>
            Your sighting has been posted to the community feed.
          </Text>

          {matchedAnimals.length > 0 && (
            <View style={styles.matchCard}>
              <View style={styles.matchCardHeader}>
                <Text style={styles.matchBell}>🔔</Text>
                <Text style={styles.matchCardTitle}>Farmer notified!</Text>
              </View>
              {matchedAnimals.map(animal => (
                <View key={animal.id} style={styles.matchRow}>
                  <Text style={styles.matchAnimalName}>{animal.name}</Text>
                  <Text style={styles.matchAnimalDetail}>
                    {animal.ownerName}{animal.farmName ? ` · ${animal.farmName}` : ''} has been sent your report
                    {locationLabel ? ` and your location (${locationLabel})` : ''}.
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={reset} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Report Another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Report an Escaped Animal</Text>
          <Text style={styles.pageSub}>
            Farmers are automatically alerted when your description matches one of their registered animals.
          </Text>

          {/* Photo */}
          <TouchableOpacity style={styles.photoBox} onPress={onPhotoPress} activeOpacity={0.85}>
            {photo ? (
              <>
                <Image source={{ uri: photo }} style={styles.photoImg} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoOverlayText}>Change photo</Text>
                </View>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                <Text style={styles.photoEmptyIcon}>📷</Text>
                <Text style={styles.photoEmptyLabel}>Add a photo</Text>
                <Text style={styles.photoEmptyHint}>Camera or photo library</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Species */}
          <Text style={styles.label}>Animal type <Text style={styles.req}>*</Text></Text>
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

          {/* Colour */}
          <Text style={styles.label}>Primary colour <Text style={styles.req}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. white, brown, black and white"
            placeholderTextColor={C.textSec}
            value={color}
            onChangeText={setColor}
          />

          {/* Markings */}
          <Text style={styles.label}>Distinguishing markings</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="e.g. blue paint on back, yellow ear tag #7, red collar"
            placeholderTextColor={C.textSec}
            value={markings}
            onChangeText={setMarkings}
            multiline
          />

          {/* Notes */}
          <Text style={styles.label}>Additional notes</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Condition, behaviour, nearby landmarks…"
            placeholderTextColor={C.textSec}
            value={caption}
            onChangeText={setCaption}
            multiline
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity
            style={[styles.locationBtn, coords && styles.locationBtnActive]}
            onPress={detectLocation}
            disabled={loadingLocation}
            activeOpacity={0.8}
          >
            {loadingLocation
              ? <ActivityIndicator color={coords ? '#FFF' : C.green} size="small" />
              : <Text style={[styles.locationBtnText, coords && styles.locationBtnTextActive]}>
                  {coords ? '📍 Location detected' : '📍 Detect my location'}
                </Text>
            }
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Or type a road, village, or landmark"
            placeholderTextColor={C.textSec}
            value={locationLabel}
            onChangeText={setLocationLabel}
          />

          <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.btnSubmitText}>Submit Report</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 6 },
  pageSub: { fontSize: 14, color: C.textSec, lineHeight: 21, marginBottom: 24 },

  photoBox: {
    width: '100%', height: 210, borderRadius: 16, overflow: 'hidden',
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, flexShrink: 0,
    borderStyle: 'dashed', marginBottom: 24,
  },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoOverlayText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  photoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoEmptyIcon: { fontSize: 38, marginBottom: 4 },
  photoEmptyLabel: { fontSize: 16, fontWeight: '700', color: C.text },
  photoEmptyHint: { fontSize: 13, color: C.textSec },

  label: { fontSize: 13, fontWeight: '700', color: C.textSec, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10, marginTop: 18 },
  req: { color: C.red },

  pillRow: { gap: 8, paddingBottom: 4, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 100,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, flexShrink: 0,
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
  inputMulti: { height: 90, textAlignVertical: 'top' },

  locationBtn: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.green, paddingVertical: 13, alignItems: 'center', marginBottom: 10,
  },
  locationBtnActive: { backgroundColor: C.green },
  locationBtnText: { fontSize: 15, fontWeight: '700', color: C.green },
  locationBtnTextActive: { color: '#FFF' },

  btnSubmit: {
    backgroundColor: C.green, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginTop: 28,
  },
  btnSubmitText: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },

  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.greenLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successEmoji: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  successSub: { fontSize: 15, color: C.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  matchCard: {
    backgroundColor: '#FFFBEB', borderRadius: 16, borderWidth: 1.5,
    borderColor: C.amber, padding: 18, width: '100%', marginBottom: 32, gap: 10,
  },
  matchCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchBell: { fontSize: 22 },
  matchCardTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  matchRow: { gap: 3 },
  matchAnimalName: { fontSize: 15, fontWeight: '700', color: C.text },
  matchAnimalDetail: { fontSize: 14, color: C.textSec, lineHeight: 20 },

  btnPrimary: {
    backgroundColor: C.green, borderRadius: 14, paddingVertical: 15,
    paddingHorizontal: 36, alignItems: 'center',
  },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
