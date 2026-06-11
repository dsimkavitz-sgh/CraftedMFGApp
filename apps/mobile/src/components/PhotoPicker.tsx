import { uploadProductPhoto } from "@crafted/shared";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { radius, spacing, useTheme } from "@/theme/tokens";
import { errorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

interface PhotoPickerProps {
  /** Storage folder for the upload. */
  folder: "styles" | "variants";
  /** Current remote photo URL, if any. */
  value?: string | null;
  /** Called with the public URL after a successful upload. */
  onUploaded: (url: string) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

export function PhotoPicker({
  folder,
  value,
  onUploaded,
  label = "Photo",
  disabled = false,
  style,
}: PhotoPickerProps) {
  const theme = useTheme();
  // Local preview shown immediately while the upload is in flight.
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (asset: ImagePicker.ImagePickerAsset) => {
    setLocalUri(asset.uri);
    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const buffer = decode(base64);
      const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
      const url = await uploadProductPhoto(supabase, buffer, {
        folder,
        fileName,
        contentType: "image/jpeg",
      });
      onUploaded(url);
    } catch (e) {
      setLocalUri(null);
      Alert.alert("Upload failed", errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera unavailable", "Allow camera access in Settings to take product photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    const asset = result.assets?.[0];
    if (!result.canceled && asset) await upload(asset);
  };

  const chooseFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Photos unavailable",
        "Allow photo library access in Settings to attach product photos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.assets?.[0];
    if (!result.canceled && asset) await upload(asset);
  };

  const openSheet = () => {
    Alert.alert(label, "Add a product photo", [
      { text: "Take photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void chooseFromLibrary() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const previewUri = localUri ?? value ?? null;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previewUri ? "Replace photo" : "Add photo"}
        disabled={disabled || uploading}
        onPress={openSheet}
        style={[
          styles.box,
          { borderColor: theme.border, backgroundColor: theme.card, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={28} color={theme.muted} />
            <Text style={[styles.placeholderText, { color: theme.muted }]}>Add photo</Text>
          </View>
        )}
        {uploading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.overlayText}>Uploading…</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing(3),
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  box: {
    width: 120,
    height: 120,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: "500",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
  },
  overlayText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
