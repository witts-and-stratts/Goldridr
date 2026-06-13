import { StyleSheet, Text, View } from "react-native";

import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import { colors, plate } from "@/lib/colors";

interface FieldLabelProps {
  label: string;
  icon?: NativeSymbolName;
}

export function FieldLabel( { label, icon }: FieldLabelProps ) {
  return (
    <View style={ styles.row }>
      { icon && <NativeIcon name={ icon } size={ 16 } /> }
      <Text style={ [ plate, styles.label ] }>{ label }</Text>
    </View>
  );
}

const styles = StyleSheet.create( {
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  label: {
    color: colors.faint,
  },
} );
