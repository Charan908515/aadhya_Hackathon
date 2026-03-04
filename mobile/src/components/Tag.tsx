import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

type Props = {
  label: string;
  tone?: "info" | "warn" | "danger";
};

export function Tag({ label, tone = "info" }: Props) {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  info: {
    backgroundColor: "rgba(90, 169, 255, 0.18)",
  },
  warn: {
    backgroundColor: "rgba(255, 176, 32, 0.18)",
  },
  danger: {
    backgroundColor: "rgba(255, 77, 79, 0.2)",
  },
  text: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: "600",
  },
});
