import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { colors } from "@/lib/colors";

export type NativeSymbolName = SymbolViewProps["name"];

interface NativeIconProps {
  name: NativeSymbolName;
  color?: string;
  size?: number;
}

export function NativeIcon( {
  name,
  color = colors.muted,
  size = 20,
}: NativeIconProps ) {
  return (
    <SymbolView
      name={ name }
      tintColor={ color }
      size={ size }
      style={ { width: size, height: size } }
    />
  );
}

interface NativeIconButtonProps extends NativeIconProps {
  accessibilityLabel: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function NativeIconButton( {
  accessibilityLabel,
  onPress,
  style,
  ...iconProps
}: NativeIconButtonProps ) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ accessibilityLabel }
      hitSlop={ 10 }
      onPress={ onPress }
      style={ ( { pressed } ) => [
        styles.button,
        style,
        pressed && styles.pressed,
      ] }
    >
      <View pointerEvents="none">
        <NativeIcon { ...iconProps } />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create( {
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.55,
  },
} );
