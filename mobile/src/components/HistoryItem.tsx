import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { radius, spacing, typography, ThemeColors } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  title: string;
  time: string;
  risk: string;
  score: number;
};

export function HistoryItem({ title, time, risk, score }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.risk}>{risk}</Text>
        <Text style={styles.score}>{score}%</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    color: colors.textDim,
    fontSize: typography.small,
  },
  risk: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  score: {
    color: colors.accentCoral,
    fontSize: typography.small,
    fontWeight: "700",
  },
});
