// @ts-nocheck
import React, {useState} from 'react';
import {Text, Button, Image, StyleSheet, Alert} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

export default function Page(){
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number} | null>(null);

  const takePhoto = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if(status !== "granted"){
      Alert.alert("Permission to use camera denied");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
    });
    
    if(!result.canceled){
      setPhoto(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    const {status} = await Location.requestForegroundPermissionsAsync();
    if(status !== "granted"){
      Alert.alert("Permission to get location was denied");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Report a sheep</Text>

      <Button title="Take a Photo" onPress={takePhoto} />
      {photo && <Image source={{uri: photo}} style={styles.image} />}

      <Button title="Get Location" onPress={getLocation} />
      {location && (
        <Text style={styles.coords}>
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#636B2F",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginVertical: 15,
  },
  coords: {
    marginTop: 10,
    fontSize: 16,
  },
});
