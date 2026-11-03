import { Ionicons } from "@expo/vector-icons";
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
import { ApiError, updateMe } from "../lib/api";
import { useAuth } from "../lib/auth";
import { memberSince } from "../lib/format";
import { colors } from "../lib/theme";
import {
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "../lib/validation";

export default function SettingsScreen() {
  const { status, token, user, updateUser, signOut } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

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

  if (!user.username || !user.nickname) {
    return <Redirect href="/onboarding" />;
  }

  const cleanUsername = normalizeUsername(username);
  const cleanNickname = normalizeNickname(nickname);
  const changed =
    cleanUsername !== user.username || cleanNickname !== user.nickname;

  async function save() {
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
    setSaved(false);

    try {
      const result = await updateMe(token, {
        username: cleanUsername,
        nickname: cleanNickname,
      });
      updateUser(result.user);
      setSaved(true);
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

  function confirmSignOut() {
    setConfirmingSignOut(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => [
            styles.back,
            pressed && styles.iconPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <Avatar
            seed={cleanUsername || user.username}
            label={cleanNickname || user.nickname}
            size={72}
          />
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={styles.profileName}>
              {cleanNickname || user.nickname}
            </Text>
            <Text numberOfLines={1} style={styles.profileHandle}>
              @{cleanUsername || user.username}
            </Text>
            <Text numberOfLines={1} style={styles.profileEmail}>
              {user.email}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Profile</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            setSaved(false);
          }}
          placeholder="yourname"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={20}
          style={styles.input}
        />

        <Text style={[styles.label, styles.labelSpaced]}>Nickname</Text>
        <TextInput
          value={nickname}
          onChangeText={(value) => {
            setNickname(value);
            setSaved(false);
          }}
          placeholder="Your display name"
          placeholderTextColor={colors.textFaint}
          maxLength={30}
          style={styles.input}
        />

        <Text style={styles.help}>
          Your avatar is generated from your username. There are no photo
          uploads.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.saveRow}>
          <Pressable
            onPress={() => void save()}
            disabled={busy || !changed}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              (!changed || busy) && styles.saveButtonDisabled,
              pressed && changed && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </Pressable>
          {saved ? <Text style={styles.savedText}>Saved</Text> : null}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>
          Account
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sign-in</Text>
          <Text style={styles.infoValue}>{user.signInMethod}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member since</Text>
          <Text style={styles.infoValue}>{memberSince(user.createdAt)}</Text>
        </View>

        {confirmingSignOut ? (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Sign out?</Text>
            <Text style={styles.confirmText}>
              You can sign back in at any time.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setConfirmingSignOut(false)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirmingSignOut(false);
                  void signOut();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.confirmButtonText}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={confirmSignOut}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.signOut,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  iconPressed: { backgroundColor: colors.border },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 16,
    padding: 16,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 17, fontWeight: "700", color: colors.text },
  profileHandle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  profileEmail: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  sectionSpaced: { marginTop: 30 },
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
    marginTop: 10,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textMuted,
  },
  error: { marginTop: 12, fontSize: 13, color: colors.danger },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  saveButton: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { backgroundColor: "#b2dffc" },
  saveText: { fontSize: 14, fontWeight: "700", color: colors.white },
  savedText: { fontSize: 13, fontWeight: "600", color: colors.online },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13.5, color: colors.textMuted },
  infoValue: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: colors.text,
    textAlign: "right",
  },
  signOut: {
    marginTop: 32,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f3c6ca",
    backgroundColor: "#fff5f6",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { fontSize: 14, fontWeight: "700", color: colors.danger },
  confirmCard: {
    marginTop: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3c6ca",
    backgroundColor: "#fff5f6",
    padding: 16,
  },
  confirmTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  confirmText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 13.5, fontWeight: "600", color: colors.text },
  confirmButton: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.white,
  },
});
