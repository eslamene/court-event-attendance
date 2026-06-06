import { StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "./tokens";

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textOnGold,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textOnGoldMuted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.goldLight,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 280,
    minHeight: 36,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.gold,
  },
  chipTextActive: {
    color: colors.textOnGold,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
});
