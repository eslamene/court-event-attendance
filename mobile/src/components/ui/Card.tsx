import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { sharedStyles } from "../../theme/styles";
import { colors, radius, spacing, typography } from "../../theme/tokens";

export function Card({
  children,
  title,
  textAlign = "left",
}: {
  children: ReactNode;
  title?: string;
  textAlign?: "left" | "right" | "center";
}) {
  return (
    <View style={sharedStyles.section}>
      {title ? (
        <Text style={[sharedStyles.sectionTitle, { textAlign }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function StatRow({
  items,
  rowDirection = "row",
}: {
  items: { value: string | number; label: string; tone?: "success" | "default" }[];
  rowDirection?: "row" | "row-reverse";
}) {
  return (
    <View style={[styles.stats, { flexDirection: rowDirection }]}>
      {items.map((item) => (
        <View key={item.label} style={styles.statBox}>
          <Text
            style={[
              styles.statValue,
              item.tone === "success" && styles.statSuccess,
            ]}
          >
            {item.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    minWidth: 0,
  },
  statValue: { ...typography.stat, color: colors.gold },
  statSuccess: { color: colors.success },
  statLabel: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
