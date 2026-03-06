import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { radius, spacing, typography, ThemeColors } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  label: string;
  tone?: "info" | "warn" | "danger";
};

export function Tag({ label, tone = "info" }: Props) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  base: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  info: {
    backgroundColor: isDark ? `${colors.accentBlue}38` : "rgba(90, 169, 255, 0.18)",
  },
  warn: {
    backgroundColor: isDark ? `${colors.warning}38` : "rgba(255, 176, 32, 0.18)",
  },
  danger: {
    backgroundColor: isDark ? `${colors.danger}38` : "rgba(255, 77, 79, 0.2)",
  },
  text: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: "600",
  },
});
