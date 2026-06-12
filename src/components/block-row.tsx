import { StyleSheet, Text, View } from "react-native";

import { NativeIcon, NativeIconButton } from "@/components/native-icon";
import { colors } from "@/lib/colors";
import { blockTimeLabel, recurringLabel } from "@/lib/schedule";
import type { BlockedSlot } from "@/lib/types";

interface BlockRowProps {
  block: BlockedSlot;
  onRemove?: ( block: BlockedSlot ) => void;
}

export function BlockRow( { block, onRemove }: BlockRowProps ) {
  return (
    <View style={ styles.row }>
      <NativeIcon
        name={ { ios: "calendar.badge.minus", android: "event_busy", web: "event_busy" } }
        color={ colors.faint }
        size={ 20 }
      />
      <View style={ styles.text }>
        <Text style={ styles.title }>{ block.title }</Text>
        <Text style={ styles.meta }>
          { blockTimeLabel( block ) }
          { recurringLabel( block.recurring ) ? ` · ${ recurringLabel( block.recurring ) }` : "" }
          { block.chauffeurId == null ? " · Company-wide" : "" }
        </Text>
      </View>
      { onRemove && (
        <NativeIconButton
          name={ { ios: "trash", android: "delete", web: "delete" } }
          color={ colors.red }
          accessibilityLabel={ `Remove ${ block.title }` }
          onPress={ () => onRemove( block ) }
        />
      ) }
    </View>
  );
}

const styles = StyleSheet.create( {
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  text: {
    gap: 3,
    flexShrink: 1,
  },
  title: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
} );
