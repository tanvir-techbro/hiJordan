import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoider } from "../components/Keyboard";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "../lib/validation";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { status, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "signedIn") {
    return <Redirect href="/" />;
  }

  async function submit() {
    if (busy) return;
    Keyboard.dismiss();

    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    if (mode === "signup") {
      const emailProblem = validateEmail(cleanEmail);
      if (emailProblem) {
        setError(emailProblem);
        return;
      }

      const passwordProblem = validatePassword(password);
      if (passwordProblem) {
        setError(passwordProblem);
        return;
      }

      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    } else if (!password) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (mode === "signin") {
        await signIn(cleanEmail, password);
      } else {
        await signUp(cleanEmail, password);
      }
      router.replace("/");
    } catch (caught) {
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
          <View style={styles.hero}>
            <Text style={styles.logo}>HiJordan</Text>
            <Text style={styles.tagline}>
              Private messages, one conversation at a time.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <Pressable
                onPress={() => {
                  setMode("signin");
                  setError(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "signin" }}
              >
                <Text
                  style={[
                    styles.tab,
                    mode === "signin" && styles.tabActive,
                  ]}
                >
                  Sign in
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode("signup");
                  setError(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "signup" }}
              >
                <Text
                  style={[
                    styles.tab,
                    mode === "signup" && styles.tabActive,
                  ]}
                >
                  Create account
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              style={styles.input}
            />

            <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={
                mode === "signup" ? "At least 8 characters" : "Your password"
              }
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === "signup" ? "new-password" : "password"}
              secureTextEntry
              textContentType={
                mode === "signup" ? "newPassword" : "password"
              }
              returnKeyType={mode === "signup" ? "next" : "go"}
              onSubmitEditing={() => {
                if (mode === "signin") void submit();
              }}
              style={styles.input}
            />

            {mode === "signup" ? (
              <>
                <Text style={[styles.label, styles.labelSpaced]}>
                  Confirm password
                </Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Type it again"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  secureTextEntry
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  style={styles.input}
                />
              </>
            ) : null}

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
                <Text style={styles.buttonText}>
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Text>
              )}
            </Pressable>

            <Text style={styles.hint}>
              Use the same email and password as the HiJordan website.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  hero: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -2,
    color: colors.text,
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    marginBottom: 22,
  },
  tab: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    paddingBottom: 8,
  },
  tabActive: {
    color: colors.text,
    fontWeight: "700",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.text,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 6,
  },
  labelSpaced: {
    marginTop: 14,
  },
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
  error: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  button: {
    marginTop: 20,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBusy: {
    backgroundColor: colors.bluePressed,
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  hint: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: "center",
  },
});
