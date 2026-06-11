import { can, createStyle, listSuppliers, styleSchema } from "@crafted/shared";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SelectSheet } from "@/components/ui/SelectSheet";
import { TextField } from "@/components/ui/TextField";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { spacing } from "@/theme/tokens";

export default function NewStyleScreen() {
  const router = useRouter();
  const { role } = useSession();

  const suppliers = useAsync(() => listSuppliers(supabase), []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!can.editCatalog(role)) {
    return <Redirect href="/(tabs)/catalog" />;
  }

  const submit = async () => {
    const parsed = styleSchema.safeParse({
      name,
      description: description.trim() ? description.trim() : null,
      supplier_id: supplierId,
      hero_photo_url: heroUrl,
      active: true,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const style = await createStyle(supabase, parsed.data);
      router.replace(`/style/${style.id}`);
    } catch (e) {
      Alert.alert("Could not create style", errorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboard>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        error={fieldErrors["name"]}
        placeholder="Classic Trucker"
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        error={fieldErrors["description"]}
        placeholder="Mid-profile trucker with mesh back"
        multiline
      />
      <SelectSheet
        label="Supplier (optional)"
        placeholder="Pick a supplier"
        value={supplierId}
        allowClear
        options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
        onChange={setSupplierId}
        error={fieldErrors["supplier_id"]}
        style={styles.field}
      />
      <PhotoPicker
        folder="styles"
        label="Hero photo (optional)"
        value={heroUrl}
        onUploaded={setHeroUrl}
      />
      <Button
        title="Create style"
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing(3),
  },
  submit: {
    marginTop: spacing(2),
    marginBottom: spacing(8),
  },
});
