import { StyleSheet, TextInput, View, Text, type TextInputProps } from "react-native";
import { colors, radius, spacing, typography } from "../../theme/tokens";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  textAlign?: "left" | "right" | "center";
};

export function Input({ label, error, textAlign = "left", style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { textAlign }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.goldLight}
        style={[styles.input, { textAlign }, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { textAlign }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    ...typography.captionBold,
    color: colors.gold,
    marginBottom: spacing.xs,
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
  inputError: { borderColor: colors.danger },
  error: {
    ...typography.micro,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
