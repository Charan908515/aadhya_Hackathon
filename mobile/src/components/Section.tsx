import React, { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

type Props = {
  title: string;
  children: ReactNode;
};

export function Section({ title, children }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
