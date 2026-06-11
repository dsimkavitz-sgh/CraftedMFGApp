import { signInSchema } from "@crafted/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { radius, spacing, tint, useTheme } from "@/theme/tokens";

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setBanner(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      // The root layout guard redirects to /(tabs) once the session lands.
    } catch (e) {
      setBanner(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]} keyboard>
      <View style={styles.container}>
        <View style={styles.brand}>
          {/* Circle-C + MFG mark, matching the craftedmfg.com wordmark. */}
          <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
            <Text style={[styles.brandGlyph, { color: theme.accentInk }]}>C</Text>
          </View>
          <Text style={[styles.wordmark, { color: theme.text }]}>CRAFTED MFG</Text>
          <Text style={[styles.tagline, { color: theme.muted }]}>
            Inventory · Orders · Catalog
          </Text>
        </View>

        {banner ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: tint(theme.danger), borderColor: theme.danger },
            ]}
          >
            <Text style={[styles.bannerText, { color: theme.danger }]}>{banner}</Text>
          </View>
        ) : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors["email"]}
          placeholder="you@craftedmfg.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors["password"]}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />

        <Button
          title="Sign in"
          loading={submitting}
          onPress={() => void submit()}
          style={styles.submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: spacing(12),
  },
  brand: {
    alignItems: "center",
    marginBottom: spacing(10),
  },
  brandMark: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(4),
  },
  brandGlyph: {
    fontSize: 44,
    fontWeight: "900",
  },
  wordmark: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 5,
  },
  tagline: {
    fontSize: 14,
    marginTop: spacing(1),
  },
  banner: {
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submit: {
    marginTop: spacing(2),
    minHeight: 56,
  },
});
