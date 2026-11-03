import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import { KeyboardAvoider } from "../components/Keyboard";
import { ApiError, updateMe } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import {
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "../lib/validation";

export default function OnboardingScreen() {
  const { status, token, user, updateUser, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (status === "signedOut" || !token || !user) {
    return <Redirect href="/login" />;
  }

  if (user.username && user.nickname) {
    return <Redirect href="/" />;
  }

  const cleanUsername = normalizeUsername(username);
  const cleanNickname = normalizeNickname(nickname);

  async function submit() {
    if (busy || !token) return;

    const usernameProblem = validateUsername(cleanUsername);
    if (usernameProblem) {
      setError(usernameProblem);
      return;
    }

    const nicknameProblem = validateNickname(cleanNickname);
    if (nicknameProblem) {
      setError(nicknameProblem);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await updateMe(token, {
        username: cleanUsername,
        nickname: cleanNickname,
      });
      updateUser(result.user);
      router.replace("/inbox");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await signOut();
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoider style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Choose your name</Text>
          <Text style={styles.subtitle}>
            This is how people will find and recognise you on HiJordan.
          </Text>

          <View style={styles.preview}>
            <Avatar
              seed={cleanUsername || "hijordan"}
              label={cleanNickname || "Your avatar"}
              size={64}
            />
            <View style={styles.previewText}>
              <Text style={styles.previewName} numberOfLines={1}>
                {cleanNickname || "Your nickname"}
              </Text>
              <Text style={styles.previewUsername} numberOfLines={1}>
                @{cleanUsername || "username"}
              </Text>
              <Text style={styles.previewNote}>
                Your avatar is generated automatically.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="yourname"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            returnKeyType="next"
            maxLength={20}
            style={styles.input}
          />
          <Text style={styles.help}>
            3–20 characters. Lowercase letters, numbers, dots, and underscores.
          </Text>

          <Text style={[styles.label, styles.labelSpaced]}>Nickname</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Your display name"
            placeholderTextColor={colors.textFaint}
            returnKeyType="go"
            maxLength={30}
            onSubmitEditing={() => void submit()}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={() => void submit()}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              (pressed || busy) && styles.buttonBusy,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Start messaging</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void signOut()}
            accessibilityRole="button"
            style={styles.signOut}
          >
            <Text style={styles.signOutText}>Use a different account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 14,
    padding: 14,
    marginTop: 22,
    marginBottom: 24,
  },
  previewText: { flex: 1, minWidth: 0 },
  previewName: { fontSize: 16, fontWeight: "600", color: colors.text },
  previewUsername: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  previewNote: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 6,
  },
  labelSpaced: { marginTop: 16 },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  help: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  error: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  button: {
    marginTop: 22,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBusy: { backgroundColor: colors.bluePressed, opacity: 0.85 },
  buttonText: { fontSize: 15, fontWeight: "700", color: colors.white },
  signOut: { marginTop: 18, alignItems: "center" },
  signOutText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
});
