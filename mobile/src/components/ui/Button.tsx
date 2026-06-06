import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, layout, radius, spacing, typography } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

const variantStyles: Record<
  Variant,
  { bg: string; border: string; text: string }
> = {
  primary: { bg: colors.gold, border: colors.gold, text: colors.textOnGold },
  secondary: {
    bg: colors.creamDark,
    border: colors.border,
    text: colors.gold,
  },
  ghost: { bg: "transparent", border: colors.gold, text: colors.gold },
  danger: { bg: colors.dangerBg, border: colors.danger, text: colors.danger },
  accent: {
    bg: "rgba(212, 168, 75, 0.2)",
    border: colors.goldAccent,
    text: colors.goldAccent,
  },
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon,
  style,
  fullWidth = true,
}: Props) {
  const v = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: pressed || disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon}
          <Text
            style={[styles.label, { color: v.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  fullWidth: { alignSelf: "stretch" },
  label: {
    ...typography.bodyBold,
    fontSize: 16,
    flexShrink: 1,
  },
});
