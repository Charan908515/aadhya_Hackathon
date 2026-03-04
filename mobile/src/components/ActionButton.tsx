import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
};

export function ActionButton({ label, onPress, variant = "primary", style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === "ghost" && styles.textGhost]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.accentTeal,
  },
  secondary: {
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    color: colors.bgDeep,
    fontSize: typography.body,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  textGhost: {
    color: colors.textPrimary,
  },
});
