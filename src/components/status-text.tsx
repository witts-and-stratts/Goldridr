import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import { plate, statusStyle } from "@/lib/colors";

const statusIcons: Record<string, NativeSymbolName> = {
  pending: { ios: "clock", android: "schedule", web: "schedule" },
  confirmed: { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" },
  accepted: { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" },
  completed: { ios: "checkmark", android: "done", web: "done" },
  cancelled: { ios: "xmark.circle", android: "cancel", web: "cancel" },
  rejected: { ios: "xmark.circle", android: "cancel", web: "cancel" },
};

export function StatusText( { status, style }: { status: string; style?: ViewStyle } ) {
  const { label, color, backgroundColor, borderColor } = statusStyle( status );
  return (
    <View style={ [ styles.row, { backgroundColor, borderColor }, style ] }>
      <NativeIcon
        name={ statusIcons[ status ] ?? { ios: "circle", android: "circle", web: "circle" } }
        color={ color }
        size={ 12 }
      />
      <Text style={ [ plate, styles.label, { color } ] }>{ label }</Text>
    </View>
  );
}

const styles = StyleSheet.create( {
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 999,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.1,
  },
} );
