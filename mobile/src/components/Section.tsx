import React, { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, typography, ThemeColors } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  title: string;
  children: ReactNode;
};

export function Section({ title, children }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
