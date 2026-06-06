import { useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  getPlatformLogoUri,
  PLATFORM_LOGO_LOCAL,
  resolveImageUri,
} from "../../lib/branding";
import { colors, radius } from "../../theme/tokens";

type Props = {
  uri?: string | null;
  size?: number;
  /** Event logos use a circle; platform logo uses rounded square. */
  variant?: "platform" | "event";
  fallback?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function AppLogo({
  uri,
  size = 96,
  variant = "platform",
  fallback = PLATFORM_LOGO_LOCAL,
  style,
  accessibilityLabel,
}: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const resolved = resolveImageUri(uri) ?? getPlatformLogoUri();
  const isEvent = variant === "event" && Boolean(uri?.trim());
  const borderRadius = isEvent ? size / 2 : radius.md;
  const source: ImageSourcePropType =
    useFallback || !resolved ? fallback : { uri: resolved };

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={[styles.image, { borderRadius }]}
        resizeMode={isEvent ? "cover" : "contain"}
        accessibilityLabel={accessibilityLabel}
        onError={() => setUseFallback(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: colors.creamDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
