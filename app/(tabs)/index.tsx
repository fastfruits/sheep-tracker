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
  success: '#2E7D32',
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
  const [matchedFarmers, setMatchedFarmers] = useState([]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const onPhotoPress = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const detectLocation = async () => {
    setLoadingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow location access.');
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
      Alert.alert('Could not get location', 'Please type your location manually.');
    }
    setLoadingLocation(false);
  };

  const handleSubmit = () => {
    if (!species) {
      Alert.alert('Missing info', 'Please select the type of animal.');
      return;
    }
    if (!color.trim()) {
      Alert.alert('Missing info', 'Please describe the animal\'s colour.');
      return;
    }

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

    setMatchedFarmers(matches);
    setSubmitted(true);
  };

  const resetForm = () => {
    setPhoto(null);
    setSpecies(null);
    setColor('');
    setMarkings('');
    setCaption('');
    setLocationLabel('');
    setCoords(null);
    setSubmitted(false);
    setMatchedFarmers([]);
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Report submitted!</Text>
          <Text style={styles.successSub}>
            Your sighting has been posted to the community feed.
          </Text>

          {matchedFarmers.length > 0 && (
            <View style={styles.matchCard}>
              <Text style={styles.matchIcon}>🔔</Text>
              <Text style={styles.matchTitle}>Possible owner found!</Text>
              {matchedFarmers.map(animal => (
                <Text key={animal.id} style={styles.matchDetail}>
                  <Text style={{ fontWeight: '700' }}>{animal.ownerName}</Text>
                  {animal.farmName ? ` (${animal.farmName})` : ''} has been notified — they own a {animal.species} named {animal.name} that matches your description.
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={resetForm}>
            <Text style={styles.btnPrimaryText}>Report Another Animal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Report an Escaped Animal</Text>
          <Text style={styles.pageSubtitle}>
            Help get lost animals home. Farmers are notified if your description matches one of theirs.
          </Text>

          {/* Photo */}
          <TouchableOpacity style={styles.photoBox} onPress={onPhotoPress} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoLabel}>Tap to add a photo</Text>
                <Text style={styles.photoSub}>Camera or photo library</Text>
              </View>
            )}
          </TouchableOpacity>
          {photo && (
            <TouchableOpacity onPress={onPhotoPress}>
              <Text style={styles.changePhoto}>Change photo</Text>
            </TouchableOpacity>
          )}

          {/* Species */}
          <Text style={styles.label}>Animal type <Text style={styles.required}>*</Text></Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.speciesRow}
          >
            {SPECIES_LIST.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.speciesPill, species === s.value && styles.speciesPillActive]}
                onPress={() => setSpecies(s.value)}
                activeOpacity={0.75}
              >
                <Text style={styles.speciesEmoji}>{s.emoji}</Text>
                <Text style={[styles.speciesLabel, species === s.value && styles.speciesLabelActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color */}
          <Text style={styles.label}>Primary colour <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. white, black and white, brown"
            placeholderTextColor={C.textSec}
            value={color}
            onChangeText={setColor}
          />

          {/* Markings */}
          <Text style={styles.label}>Distinguishing markings</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. blue paint on back, yellow ear tag #7, red collar"
            placeholderTextColor={C.textSec}
            value={markings}
            onChangeText={setMarkings}
            multiline
            numberOfLines={3}
          />

          {/* Caption */}
          <Text style={styles.label}>Additional notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Anything else people should know — behaviour, condition, nearby landmarks…"
            placeholderTextColor={C.textSec}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={detectLocation}
            disabled={loadingLocation}
            activeOpacity={0.8}
          >
            {loadingLocation ? (
              <ActivityIndicator color={C.green} size="small" />
            ) : (
              <Text style={styles.locationBtnText}>
                {coords ? '📍 Location detected' : '📍 Detect my location'}
              </Text>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Or type a location (road name, village, landmark…)"
            placeholderTextColor={C.textSec}
            value={locationLabel}
            onChangeText={setLocationLabel}
          />

          <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.btnSubmitText}>Submit Report</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: C.textSec,
    lineHeight: 20,
    marginBottom: 24,
  },
  photoBox: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 4,
  },
  photoSub: {
    fontSize: 13,
    color: C.textSec,
  },
  changePhoto: {
    fontSize: 14,
    color: C.green,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: C.red,
  },
  speciesRow: {
    paddingBottom: 4,
    gap: 8,
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
    color: '#FFFFFF',
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
  locationBtn: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.green,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  locationBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.green,
  },
  btnSubmit: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  btnSubmitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 15,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  matchCard: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
  },
  matchIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  matchTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  matchDetail: {
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
