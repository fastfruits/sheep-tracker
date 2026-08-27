/**
 * Image picking, normalised across platforms.
 *
 * expo-image-picker already ships a web implementation (a hidden file input),
 * so this is a thin wrapper rather than a native/web split. Its job is to
 * request `base64: true` in one place — `uploadPhoto` in store/app-store.tsx
 * needs the bytes, and reading them back off disk afterwards is what broke
 * uploads on SDK 54.
 */
import * as ImagePicker from 'expo-image-picker';

export type PickSource = 'camera' | 'library';

export interface PickedImage {
  uri: string;
  base64: string | null;
}

export type PickResult =
  | { status: 'picked'; image: PickedImage }
  | { status: 'cancelled' }
  | { status: 'denied'; source: PickSource };

const OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.7,
  base64: true,
};

export async function pickImage(source: PickSource): Promise<PickResult> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return { status: 'denied', source };
    const r = await ImagePicker.launchCameraAsync(OPTIONS);
    return toResult(r);
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { status: 'denied', source };
  const r = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  return toResult(r);
}

function toResult(r: ImagePicker.ImagePickerResult): PickResult {
  if (r.canceled || !r.assets?.length) return { status: 'cancelled' };
  const asset = r.assets[0];
  return { status: 'picked', image: { uri: asset.uri, base64: asset.base64 ?? null } };
}
