import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import {
  ApiError,
  searchUsers,
  startConversation,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import type { PublicUser } from "../lib/types";

export default function NewMessageScreen() {
  const { status, token, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const result = await searchUsers(token, query);
          if (!cancelled) {
            setUsers(result.users);
            setError(null);
          }
        } catch (caught) {
          if (cancelled) return;
          if (caught instanceof ApiError && caught.status === 401) {
            await signOut();
            return;
          }
          setError(
            caught instanceof Error ? caught.message : "Could not search.",
          );
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      query ? 300 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, query, signOut]);

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (status === "signedOut" || !token) {
    return <Redirect href="/login" />;
  }

  async function open(person: PublicUser) {
    if (!token || creatingId) return;
    setCreatingId(person.id);
    setError(null);

    try {
      const result = await startConversation(token, person.id);
      router.replace({
        pathname: "/chat/[id]",
        params: { id: result.conversationId },
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await signOut();
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start that conversation.",
      );
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New message</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={16}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={styles.searchInput}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={17} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>
            {query ? "Results" : "People on HiJordan"}
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : (
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyTitle}>No one found</Text>
              <Text style={styles.listEmptyText}>
                Try a different name or username.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void open(item)}
            disabled={creatingId !== null}
            accessibilityRole="button"
            accessibilityLabel={`Message ${item.nickname}`}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}
          >
            <Avatar
              seed={item.username}
              label={item.nickname}
              size={46}
            />
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={styles.name}>
                {item.nickname}
              </Text>
              <Text numberOfLines={1} style={styles.handle}>
                @{item.username}
              </Text>
            </View>
            {creatingId === item.id ? (
              <ActivityIndicator color={colors.textMuted} />
            ) : (
              <Text style={styles.messageLabel}>Message</Text>
            )}
          </Pressable>
        )}
      />
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
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cancel: { width: 64 },
  cancelText: { fontSize: 14, color: colors.text },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  headerSpacer: { width: 64 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 9,
    backgroundColor: colors.border,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  error: {
    color: colors.danger,
    fontSize: 12.5,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  list: { paddingBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  rowPressed: { backgroundColor: colors.backgroundSubtle },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14.5, fontWeight: "600", color: colors.text },
  handle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  messageLabel: { fontSize: 12, fontWeight: "600", color: colors.blue },
  listLoading: { paddingTop: 32 },
  listEmpty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
  listEmptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  listEmptyText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
