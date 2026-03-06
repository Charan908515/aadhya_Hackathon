import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { radius, spacing, typography, ThemeColors } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  level: "SAFE" | "SUSPICIOUS" | "HIGH RISK";
};

export function RiskBadge({ level }: Props) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const tone =
    level === "SAFE" ? styles.safe : level === "SUSPICIOUS" ? styles.warn : styles.danger;

  return (
    <View style={[styles.base, tone]}>
      <Text style={styles.text}>{level}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  base: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  safe: {
    backgroundColor: isDark ? `${colors.safe}38` : "rgba(38, 194, 129, 0.2)",
  },
  warn: {
    backgroundColor: isDark ? `${colors.warning}38` : "rgba(245, 165, 36, 0.2)",
  },
  danger: {
    backgroundColor: isDark ? `${colors.danger}38` : "rgba(255, 77, 79, 0.22)",
  },
  text: {
    color: colors.textPrimary,
    fontSize: typography.small,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
