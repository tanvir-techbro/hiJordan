import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../lib/theme";

const EMOJIS = [
  "😀",
  "😄",
  "😁",
  "😂",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤔",
  "😅",
  "😭",
  "😤",
  "🙃",
  "😴",
  "🤗",
  "🫶",
  "👋",
  "👍",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "💯",
  "🎉",
  "❤️",
  "💙",
  "💜",
  "🖤",
  "☀️",
  "🌙",
  "⭐",
  "🍕",
  "☕",
  "🎧",
  "🐶",
  "🐱",
  "🦊",
  "🐼",
  "🌈",
  "⚡",
];

export default function EmojiPicker({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close emoji picker"
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Emoji</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => onPick(emoji)}
                accessibilityRole="button"
                accessibilityLabel={`Insert ${emoji}`}
                style={({ pressed }) => [
                  styles.cell,
                  pressed && styles.cellPressed,
                ]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    maxHeight: 380,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  close: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.blue,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 4,
  },
  cell: {
    width: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  cellPressed: {
    backgroundColor: colors.border,
  },
  emoji: {
    fontSize: 25,
  },
});
