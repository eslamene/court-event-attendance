import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { SeatingMap, SectionBound, SeatGuideTarget } from "../api";
import { useI18n } from "../context/I18nContext";
import { shouldRenderMobileDotMap } from "../lib/seating-capacity";
import { colors, radius, spacing, typography } from "../theme/tokens";

const SEAT_COLORS = {
  free: { bg: colors.creamDark, text: colors.gold },
  approved: { bg: colors.warningBg, text: colors.warning },
  attended: { bg: colors.attendedBg, text: colors.attended },
  highlight: { bg: colors.goldAccent, text: colors.textOnGold },
} as const;

type Props = {
  map: SeatingMap;
  canvasWidth: number;
  canvasHeight: number;
  target?: SeatGuideTarget | null;
  highlightTierId?: string | null;
  onSelectSection?: (tierId: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function SeatingVenueView({
  map,
  canvasWidth,
  canvasHeight,
  target,
  highlightTierId,
  onSelectSection,
  style,
}: Props) {
  const { t, textAlign } = useI18n();
  const renderMode = map.venue.renderMode ?? "full";
  const isSectionView =
    renderMode === "sections" &&
    Boolean(map.venue.sectionBounds?.length) &&
    !map.venue.focusedTierId;

  if (isSectionView) {
    return (
      <View style={style}>
        <Text style={[styles.hint, { textAlign }]}>
          {t("seating.sectionOverviewHint")}
        </Text>
        <SectionOverviewCanvas
          map={map}
          sections={map.venue.sectionBounds!}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          highlightTierId={highlightTierId ?? target?.seatTierId}
          onSelectSection={onSelectSection}
        />
      </View>
    );
  }

  const seatCount = map.venue.seats.length;
  if (!shouldRenderMobileDotMap(seatCount)) {
    return (
      <View style={[styles.compactWrap, style]}>
        <Text style={[styles.compactHint, { textAlign }]}>
          {t("seatGuide.largeSectionHint", {
            count: String(seatCount),
          })}
        </Text>
        {target ? (
          <View
            style={[
              styles.targetCard,
              { alignItems: textAlign === "right" ? "flex-end" : "flex-start" },
            ]}
          >
            <Text style={[styles.targetTitle, { textAlign }]}>
              {t("common.seat", { label: target.seatLabel })}
            </Text>
            <Text style={[styles.targetMeta, { textAlign }]}>
              {t("seatGuide.directions", {
                tier:
                  map.tiers?.find((tier) => tier.id === target.seatTierId)
                    ?.name ?? target.seatLabel,
                number: target.seatNumber,
              })}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SeatDotCanvas
      map={map}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      target={target}
      style={style}
    />
  );
}

function SectionOverviewCanvas({
  map,
  sections,
  canvasWidth,
  canvasHeight,
  highlightTierId,
  onSelectSection,
}: {
  map: SeatingMap;
  sections: SectionBound[];
  canvasWidth: number;
  canvasHeight: number;
  highlightTierId?: string | null;
  onSelectSection?: (tierId: string) => void;
}) {
  const { t, textAlign } = useI18n();
  const stage = map.venue.stage;
  const isCircle =
    map.venue.type === "arena" ||
    map.venue.type === "banquet" ||
    map.venue.config?.stagePosition === "center";

  return (
    <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
      <View
        style={[
          styles.stage,
          isCircle && styles.stageCircle,
          {
            left: `${stage.x}%`,
            top: `${stage.y}%`,
            width: `${stage.width}%`,
            height: `${stage.height}%`,
          },
        ]}
      >
        <Text style={styles.stageLabel} numberOfLines={2}>
          {stage.label || t("seatGuide.stage")}
        </Text>
      </View>

      {sections.map((section) => {
        const active = section.tierId === highlightTierId;
        const pct =
          section.seatCount > 0
            ? Math.round((section.assigned / section.seatCount) * 100)
            : 0;

        const content = (
          <>
            <Text style={[styles.sectionName, { textAlign }]} numberOfLines={2}>
              {section.tierName}
            </Text>
            <Text style={[styles.sectionStats, { textAlign }]}>
              {t("seating.tierStats", {
                assigned: section.assigned,
                total: section.seatCount,
              })}
            </Text>
            <Text style={[styles.sectionPct, { textAlign }]}>{pct}%</Text>
          </>
        );

        const boxStyle: ViewStyle = {
          ...styles.sectionBox,
          ...(active ? styles.sectionBoxActive : {}),
          left: `${section.x}%`,
          top: `${section.y}%`,
          width: `${section.width}%`,
          height: `${section.height}%`,
        };

        if (onSelectSection) {
          return (
            <Pressable
              key={section.tierId}
              style={boxStyle}
              onPress={() => onSelectSection(section.tierId)}
            >
              {content}
            </Pressable>
          );
        }

        return (
          <View key={section.tierId} style={boxStyle}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

function SeatDotCanvas({
  map,
  canvasWidth,
  canvasHeight,
  target,
  style,
}: {
  map: SeatingMap;
  canvasWidth: number;
  canvasHeight: number;
  target?: SeatGuideTarget | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const stage = map.venue.stage;
  const dotSize = map.venue.seats.length > 200 ? 20 : 26;

  return (
    <View
      style={[styles.canvas, { width: canvasWidth, height: canvasHeight }, style]}
    >
      <View
        style={[
          styles.stage,
          {
            left: `${stage.x}%`,
            top: `${stage.y}%`,
            width: `${stage.width}%`,
            height: `${stage.height}%`,
          },
        ]}
      >
        <Text style={styles.stageLabel} numberOfLines={2}>
          {stage.label || t("seatGuide.stage")}
        </Text>
      </View>

      {map.venue.seats.map((pos) => {
        const isTarget =
          target &&
          pos.tierId === target.seatTierId &&
          pos.number === target.seatNumber;
        const seatColors = isTarget
          ? SEAT_COLORS.highlight
          : SEAT_COLORS[pos.seat.status];

        return (
          <View
            key={`${pos.tierId}-${pos.number}`}
            style={[
              styles.seatDot,
              isTarget && styles.seatHighlight,
              {
                width: dotSize,
                height: dotSize,
                marginLeft: -dotSize / 2,
                marginTop: -dotSize / 2,
                borderRadius: dotSize / 2,
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                backgroundColor: seatColors.bg,
              },
            ]}
          >
            <Text
              style={[
                styles.seatNumber,
                { color: seatColors.text, fontSize: dotSize > 22 ? 9 : 8 },
              ]}
            >
              {pos.number}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  canvas: {
    backgroundColor: colors.creamDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  stage: {
    position: "absolute",
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
    zIndex: 5,
  },
  stageCircle: { borderRadius: radius.full },
  stageLabel: {
    color: colors.textOnGold,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionBox: {
    position: "absolute",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.88)",
    padding: spacing.xs,
    justifyContent: "center",
    zIndex: 8,
  },
  sectionBoxActive: {
    borderColor: colors.goldAccent,
    borderWidth: 2,
    backgroundColor: colors.warningBg,
  },
  sectionName: {
    ...typography.micro,
    fontWeight: "700",
    color: colors.gold,
  },
  sectionStats: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionPct: {
    fontSize: 9,
    color: colors.goldAccent,
    fontWeight: "700",
    marginTop: 2,
  },
  seatDot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(92, 61, 30, 0.2)",
    zIndex: 10,
  },
  seatHighlight: {
    borderWidth: 3,
    borderColor: colors.gold,
    zIndex: 20,
    elevation: 4,
  },
  seatNumber: { fontWeight: "700" },
  compactWrap: { gap: spacing.md },
  compactHint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 20,
  },
  targetCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  targetTitle: {
    ...typography.bodyBold,
    color: colors.gold,
  },
  targetMeta: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
