import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme/tokens";

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    minHeight: 120,
  },
  text: {
    ...typography.body,
    color: colors.goldLight,
    textAlign: "center",
  },
});
