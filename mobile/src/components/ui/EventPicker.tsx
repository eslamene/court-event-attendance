import { ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { sharedStyles } from "../../theme/styles";
import { spacing } from "../../theme/tokens";
import type { EventItem } from "../../api";

type Props = {
  events: EventItem[];
  eventId: string;
  onSelect: (id: string) => void;
  textAlign?: "left" | "right" | "center";
  rowDirection?: "row" | "row-reverse";
};

export function EventPicker({
  events,
  eventId,
  onSelect,
  textAlign = "left",
  rowDirection = "row",
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { flexDirection: rowDirection }]}
    >
      {events.map((event) => {
        const active = eventId === event.id;
        return (
          <Pressable
            key={event.id}
            onPress={() => onSelect(event.id)}
            style={[sharedStyles.chip, active && sharedStyles.chipActive]}
          >
            <Text
              style={[
                sharedStyles.chipText,
                { textAlign },
                active && sharedStyles.chipTextActive,
              ]}
              numberOfLines={2}
            >
              {event.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
