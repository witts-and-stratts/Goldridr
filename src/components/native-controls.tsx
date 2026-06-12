import {
  Button,
  Host,
  RNHostView,
  Switch,
  Text,
  TextInput,
  useNativeState,
  type ButtonProps,
  type TextInputProps,
} from "@expo/ui";
import { StyleSheet, Text as NativeText, View } from "react-native";

import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import { colors } from "@/lib/colors";

interface NativeButtonProps extends Pick<ButtonProps, "disabled" | "onPress" | "variant"> {
  label: string;
  compact?: boolean;
  icon?: NativeSymbolName;
}

export function NativeButton( {
  label,
  disabled,
  onPress,
  variant = "filled",
  compact = false,
  icon,
}: NativeButtonProps ) {
  const labelColor = variant === "filled" ? colors.onGold : colors.gold;

  return (
    <View style={ compact ? styles.compactButtonHost : styles.buttonHost }>
      <Host style={ styles.fill }>
        <Button
          disabled={ disabled }
          onPress={ onPress }
          variant={ variant }
          style={ StyleSheet.flatten( [
            compact ? styles.compactButton : styles.button,
            variant === "filled" ? styles.buttonFilled : undefined,
            variant === "outlined" ? styles.buttonOutlined : undefined,
          ] ) }
        >
          { icon ? (
            <RNHostView matchContents>
              <View style={ styles.iconLabel }>
                <NativeIcon name={ icon } color={ labelColor } size={ compact ? 16 : 18 } />
                <NativeText
                  style={ [
                    styles.nativeButtonLabel,
                    { color: labelColor, fontSize: compact ? 13 : 15 },
                  ] }
                >
                  { label }
                </NativeText>
              </View>
            </RNHostView>
          ) : (
            <Text
              style={ styles.buttonLabel }
              textStyle={ {
                color: labelColor,
                fontSize: compact ? 13 : 15,
                fontWeight: "600",
                textAlign: "center",
              } }
            >
              { label }
            </Text>
          ) }
        </Button>
      </Host>
    </View>
  );
}

interface NativeTextFieldProps extends Omit<TextInputProps, "value" | "style" | "textStyle"> {
  value: string;
}

export function NativeTextField( {
  value,
  onChangeText,
  secureTextEntry,
  ...props
}: NativeTextFieldProps ) {
  const nativeValue = useNativeState( value );

  return (
    <View style={ styles.fieldHost }>
      <Host style={ styles.fill }>
        <TextInput
          { ...props }
          value={ nativeValue }
          onChangeText={ onChangeText }
          secureTextEntry={ secureTextEntry }
          cursorColor={ colors.gold }
          selectionColor={ colors.gold }
          placeholderTextColor={ colors.faint }
          style={ styles.field }
          textStyle={ styles.fieldText }
        />
      </Host>
    </View>
  );
}

interface NativeSwitchProps {
  value: boolean;
  onValueChange: ( value: boolean ) => void;
  label?: string;
  disabled?: boolean;
}

export function NativeSwitch( props: NativeSwitchProps ) {
  return (
    <Host matchContents>
      <Switch { ...props } />
    </Host>
  );
}

const styles = StyleSheet.create( {
  fill: {
    width: "100%",
    height: "100%",
  },
  buttonHost: {
    height: 52,
    width: "100%",
  },
  compactButtonHost: {
    height: 40,
    minWidth: 88,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 14,
  },
  compactButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  buttonFilled: {
    backgroundColor: colors.gold,
  },
  buttonOutlined: {
    borderColor: colors.gold,
  },
  buttonLabel: {
    width: "100%",
  },
  iconLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  nativeButtonLabel: {
    fontWeight: "600",
  },
  fieldHost: {
    width: "100%",
    height: 50,
  },
  field: {
    width: "100%",
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    backgroundColor: colors.panel,
  },
  fieldText: {
    color: colors.ivory,
    fontSize: 16,
  },
} );
