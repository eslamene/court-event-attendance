import { StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../../theme/tokens";

export function ErrorBanner({
  message,
  textAlign = "center",
}: {
  message: string;
  textAlign?: "left" | "right" | "center";
}) {
  if (!message) return null;

  return (
    <Text style={[styles.error, { textAlign }]} accessibilityRole="alert">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.caption,
    color: colors.danger,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
});
