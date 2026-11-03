import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import { ApiError, listConversations } from "../lib/api";
import { useAuth } from "../lib/auth";
import { messagePreview, relativeTime } from "../lib/format";
import { colors } from "../lib/theme";
import type { ConversationSummary } from "../lib/types";

export default function InboxScreen() {
  const { status, token, user, signOut } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "poll") => {
      if (!token || inFlight.current) return;
      inFlight.current = true;

      try {
        const result = await listConversations(token);
        setConversations(result.conversations);
        setError(null);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          await signOut();
          return;
        }
        if (mode !== "poll") {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load your messages.",
          );
        }
      } finally {
        inFlight.current = false;
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [token, signOut],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void load("initial");

      const interval = setInterval(() => {
        if (AppState.currentState === "active") void load("poll");
      }, 4000);

      const subscription = AppState.addEventListener("change", (next) => {
        if (next === "active") void load("poll");
      });

      return () => {
        clearInterval(interval);
        subscription.remove();
      };
    }, [token, load]),
  );

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={6}
        >
          <Avatar seed={user.username} label={user.nickname} size={34} />
        </Pressable>

        <Text style={styles.logo}>HiJordan</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/new-message")}
            accessibilityRole="button"
            accessibilityLabel="New message"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
          >
            <Ionicons
              name="create-outline"
              size={24}
              color={colors.text}
              style={{ marginTop: -1 }}
            />
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
          >
            <Ionicons name="settings-outline" size={23} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load("refresh");
              }}
              tintColor={colors.textMuted}
            />
          }
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyContent : styles.list
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={34}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Find someone on HiJordan and start a conversation.
              </Text>
              <Pressable
                onPress={() => router.push("/new-message")}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.emptyButtonPressed,
                ]}
              >
                <Text style={styles.emptyButtonText}>New message</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/chat/[id]", params: { id: item.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${item.peer.nickname}`}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Avatar
                seed={item.peer.username}
                label={item.peer.nickname}
                size={54}
                online={item.peerOnline}
              />

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.name,
                      item.unreadCount > 0 && styles.nameUnread,
                    ]}
                  >
                    {item.peer.nickname}
                  </Text>
                  {item.lastMessage ? (
                    <Text style={styles.time}>
                      {relativeTime(item.lastMessage.createdAt)}
                    </Text>
                  ) : null}
                </View>

                <Text numberOfLines={1} style={styles.handle}>
                  @{item.peer.username}
                </Text>

                <View style={styles.rowBottom}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.preview,
                      item.unreadCount > 0 && styles.previewUnread,
                    ]}
                  >
                    {messagePreview(item.lastMessage, user.id)}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.text,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  iconButtonPressed: { backgroundColor: colors.border },
  errorBanner: {
    backgroundColor: "#fff1f2",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { fontSize: 12.5, color: colors.danger },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  rowPressed: { backgroundColor: colors.backgroundSubtle },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    color: colors.text,
  },
  nameUnread: { fontWeight: "700" },
  time: { fontSize: 11.5, color: colors.textMuted },
  handle: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  preview: { flex: 1, fontSize: 13, color: colors.textMuted },
  previewUnread: { color: colors.text, fontWeight: "500" },
  badge: {
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    paddingHorizontal: 5,
    backgroundColor: colors.bubbleMine,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.white,
    lineHeight: 13,
  },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  empty: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 18,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonPressed: { backgroundColor: colors.bluePressed },
  emptyButtonText: { fontSize: 14, fontWeight: "700", color: colors.white },
});
