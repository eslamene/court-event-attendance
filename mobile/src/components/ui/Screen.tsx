import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from "react-native-safe-area-context";
import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useI18n } from "../../context/I18nContext";
import { colors, layout, spacing, typography } from "../../theme/tokens";

export function Screen({
  children,
  style,
  edges = ["left", "right"],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Flex container for scrollable or list body below a fixed header. */
export function ScreenBody({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.body, style]}>{children}</View>;
}

export function AppHeader({
  title,
  subtitle,
  right,
  textAlign = "left",
  style,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  textAlign?: "left" | "right" | "center";
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + layout.headerPaddingTop },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { textAlign }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { textAlign }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

export function BackHeader({
  title,
  onBack,
  textAlign = "left",
  right,
}: {
  title: string;
  onBack: () => void;
  textAlign?: "left" | "right" | "center";
  right?: ReactNode;
}) {
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const BackIcon = isRTL ? CaretRight : CaretLeft;

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + layout.headerPaddingTop },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
        >
          <BackIcon size={20} color={colors.goldAccent} weight="bold" />
        </Pressable>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { textAlign }]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  backBtn: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    marginStart: -8,
  },
  textBlock: { flex: 1, minWidth: 0 },
  title: {
    ...typography.heading,
    color: colors.textOnGold,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textOnGoldMuted,
    marginTop: spacing.xs,
  },
  right: { flexShrink: 0, alignItems: "flex-end", maxWidth: "46%" },
});
