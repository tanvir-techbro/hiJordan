import { Ionicons } from "@expo/vector-icons";
import {
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import EmojiPicker from "../../components/EmojiPicker";
import { KeyboardAvoider } from "../../components/Keyboard";
import {
  ApiError,
  getMessages,
  markRead,
  sendMessage,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { dayLabel, relativeTime } from "../../lib/format";
import { colors } from "../../lib/theme";
import type { ChatMessage, PublicUser } from "../../lib/types";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { status, token, user, signOut } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<PublicUser | null>(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [peerLastSeenAt, setPeerLastSeenAt] = useState<string | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const inFlight = useRef(false);
  const lastMarkedId = useRef<string | null>(null);
  const stickToBottom = useRef(true);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(
    async (mode: "initial" | "poll") => {
      if (!token || !conversationId || inFlight.current) return;
      inFlight.current = true;

      try {
        const data = await getMessages(token, conversationId);
        setMessages(data.messages);
        setPeer(data.peer);
        setPeerLastReadAt(data.peerLastReadAt);
        setPeerLastSeenAt(data.peerLastSeenAt);
        setPeerOnline(data.peerOnline);
        setError(null);

        const newest = data.messages[data.messages.length - 1];
        if (
          user &&
          newest &&
          newest.senderId !== user.id &&
          newest.id !== lastMarkedId.current
        ) {
          lastMarkedId.current = newest.id;
          void markRead(token, conversationId).catch(() => {
            // A failed read receipt is not fatal.
          });
        }
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          await signOut();
          return;
        }
        if (mode === "initial") {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load this conversation.",
          );
        }
      } finally {
        inFlight.current = false;
        if (mode === "initial") setLoading(false);
      }
    },
    [token, conversationId, user, signOut],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token || !conversationId) return;
      void load("initial");
      const interval = setInterval(() => void load("poll"), 4000);
      return () => clearInterval(interval);
    }, [token, conversationId, load]),
  );

  // Keep the newest message visible when the keyboard opens.
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      stickToBottom.current = true;
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => subscription.remove();
  }, []);

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

  if (!conversationId) {
    return <Redirect href="/inbox" />;
  }

  async function send() {
    const text = draft.trim();
    if (!text || !token || !conversationId || sending) return;

    Keyboard.dismiss();
    setEmojiOpen(false);
    setError(null);
    setSending(true);

    const temporary: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user!.id,
      body: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, temporary]);
    setDraft("");
    stickToBottom.current = true;

    try {
      const result = await sendMessage(token, conversationId, text);
      setMessages((current) =>
        current.map((message) =>
          message.id === temporary.id ? result.message : message,
        ),
      );
    } catch (caught) {
      setMessages((current) =>
        current.filter((message) => message.id !== temporary.id),
      );
      setDraft(text);
      setError(
        caught instanceof Error ? caught.message : "Could not send that.",
      );
    } finally {
      setSending(false);
    }
  }

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    stickToBottom.current =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) < 90;
  };

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to messages"
        hitSlop={8}
        style={({ pressed }) => [
          styles.back,
          pressed && styles.iconPressed,
        ]}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>

      {peer ? (
        <>
          <Avatar
            seed={peer.username}
            label={peer.nickname}
            size={38}
            online={peerOnline}
          />
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={styles.headerName}>
              {peer.nickname}
            </Text>
            <Text numberOfLines={1} style={styles.headerSub}>
              @{peer.username}
              {" · "}
              {peerOnline ? (
                <Text style={styles.activeNow}>Active now</Text>
              ) : peerLastSeenAt ? (
                `Active ${relativeTime(peerLastSeenAt)} ago`
              ) : (
                "Offline"
              )}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.headerText}>
          <Text style={styles.headerName}>Conversation</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (!peer) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {header}
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {error ?? "Conversation not found."}
          </Text>
          <Pressable
            onPress={() => router.replace("/inbox")}
            accessibilityRole="button"
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonText}>Back to messages</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoider style={styles.flex}>
        {header}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={60}
          onContentSizeChange={() => {
            if (stickToBottom.current) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.chatEmpty}>
              <Text style={styles.chatEmptyTitle}>
                Say hi to {peer.nickname}
              </Text>
              <Text style={styles.chatEmptyText}>
                This is the start of your conversation.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const previous = messages[index - 1];
            const showDay =
              index === 0 ||
              dayLabel(previous.createdAt) !== dayLabel(item.createdAt);
            const mine = item.senderId === user.id;
            const isLast = index === messages.length - 1;
            const seen =
              isLast &&
              mine &&
              peerLastReadAt !== null &&
              new Date(peerLastReadAt).getTime() >=
                new Date(item.createdAt).getTime();

            return (
              <View>
                {showDay ? (
                  <View style={styles.dayDivider}>
                    <Text style={styles.dayText}>
                      {dayLabel(item.createdAt)}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.messageRow,
                    mine ? styles.messageRowMine : styles.messageRowTheirs,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                      mine
                        ? styles.bubbleMineCorner
                        : styles.bubbleTheirsCorner,
                    ]}
                  >
                    <Text
                      selectable
                      style={[
                        styles.bubbleText,
                        mine && styles.bubbleTextMine,
                      ]}
                    >
                      {item.body}
                    </Text>
                  </View>
                </View>

                {isLast && mine ? (
                  <Text style={styles.delivery}>
                    {item.id.startsWith("temp-")
                      ? "Sending…"
                      : seen
                        ? "Seen"
                        : "Sent"}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.composer}>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setEmojiOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Insert emoji"
            hitSlop={8}
            style={({ pressed }) => [
              styles.emojiButton,
              pressed && styles.iconPressed,
            ]}
          >
            <Ionicons
              name="happy-outline"
              size={25}
              color={colors.text}
            />
          </Pressable>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            style={styles.input}
            accessibilityLabel={`Message ${peer.nickname}`}
          />

          {draft.trim() ? (
            <Pressable
              onPress={() => void send()}
              disabled={sending}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoider>

      <EmojiPicker
        visible={emojiOpen}
        onPick={(emoji) => {
          setDraft((current) => `${current}${emoji}`);
          setEmojiOpen(false);
        }}
        onClose={() => setEmojiOpen(false)}
      />
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
    padding: 24,
    backgroundColor: colors.background,
  },
  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    marginLeft: -2,
  },
  iconPressed: { backgroundColor: colors.border },
  headerText: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  activeNow: { color: colors.online, fontWeight: "600" },
  messages: { paddingVertical: 14, paddingHorizontal: 10 },
  messageRow: {
    flexDirection: "row",
    marginVertical: 1,
  },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: { backgroundColor: colors.bubbleMine },
  bubbleTheirs: { backgroundColor: colors.bubbleTheirs },
  bubbleMineCorner: { borderBottomRightRadius: 5 },
  bubbleTheirsCorner: { borderBottomLeftRadius: 5 },
  bubbleText: { fontSize: 15, lineHeight: 20, color: colors.text },
  bubbleTextMine: { color: colors.white },
  dayDivider: { alignItems: "center", marginVertical: 12 },
  dayText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.textMuted,
  },
  delivery: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginRight: 6,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  chatEmpty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 30 },
  chatEmptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  chatEmptyText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#fff1f2",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: { fontSize: 12.5, color: colors.danger },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  emojiButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.blue,
    paddingBottom: 9,
    paddingHorizontal: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 16,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
