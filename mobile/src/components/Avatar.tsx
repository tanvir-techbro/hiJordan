import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { avatarFor } from "../lib/avatar";
import { colors } from "../lib/theme";

export default function Avatar({
  seed,
  size = 44,
  online = false,
  label,
}: {
  seed: string;
  size?: number;
  online?: boolean;
  label?: string;
}) {
  const { emoji, from, to } = avatarFor(seed);
  const dot = Math.max(10, Math.round(size * 0.26));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ? `${label}'s avatar` : "Avatar"}
      style={{ width: size, height: size }}
    >
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text
          allowFontScaling={false}
          style={{ fontSize: Math.round(size * 0.5), lineHeight: size }}
        >
          {emoji}
        </Text>
      </LinearGradient>

      {online ? (
        <View
          accessibilityLabel="Online"
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderWidth: Math.max(2, Math.round(size * 0.05)),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    backgroundColor: colors.online,
    borderColor: colors.white,
  },
});
