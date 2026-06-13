import {
  Button,
  Host,
  Picker,
  RNHostView,
  Switch,
  TextInput,
  useNativeState,
  type ButtonProps,
  type TextInputProps,
} from "@expo/ui";
import {
  background,
  clipShape,
  disabled as swiftDisabled,
  frame,
  foregroundStyle,
  padding as swiftPadding,
  textFieldStyle,
  tint,
  type ModifierConfig,
} from "@expo/ui/swift-ui/modifiers";
import { Platform, StyleSheet, Text as NativeText, View } from "react-native";

import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import { colors } from "@/lib/colors";

// Loaded lazily so the Compose-only native module is never evaluated on iOS
// or web bundles.
const compose = Platform.OS === "android"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? ( require( "@expo/ui/jetpack-compose" ) as typeof import("@expo/ui/jetpack-compose") )
  : null;
const composeModifiers = Platform.OS === "android"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? ( require( "@expo/ui/jetpack-compose/modifiers" ) as typeof import("@expo/ui/jetpack-compose/modifiers") )
  : null;
const swift = Platform.OS === "ios"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? ( require( "@expo/ui/swift-ui" ) as typeof import("@expo/ui/swift-ui") )
  : null;

interface NativeButtonProps extends Pick<ButtonProps, "disabled" | "onPress" | "variant"> {
  label: string;
  compact?: boolean;
  icon?: NativeSymbolName;
  tone?: "accent" | "danger";
}

export function NativeButton( {
  label,
  disabled,
  onPress,
  variant = "filled",
  compact = false,
  icon,
  tone = "accent",
}: NativeButtonProps ) {
  const actionColor = tone === "danger" ? colors.red : colors.gold;
  const labelColor = variant === "filled" ? colors.onGold : actionColor;

  // The label is rendered as React Native content hosted inside the native
  // button, so brand colors apply on every platform and variant.
  const content = (
    <RNHostView matchContents>
      <View style={ styles.iconLabel }>
        { icon && <NativeIcon name={ icon } color={ labelColor } size={ compact ? 16 : 18 } /> }
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
  );

  if ( compose && composeModifiers ) {
    // Material buttons take brand colors directly; painting a background
    // behind them would show through around the Material container. They also
    // hug their content by default, so fill the row explicitly.
    const ComposeButton = variant === "filled"
      ? compose.Button
      : variant === "outlined" ? compose.OutlinedButton : compose.TextButton;
    return (
      <View style={ compact ? styles.compactButtonHost : styles.buttonHost }>
        <Host style={ styles.fill }>
          <ComposeButton
            onClick={ disabled ? undefined : onPress }
            enabled={ !disabled }
            colors={
              variant === "filled"
                ? { containerColor: actionColor, contentColor: colors.onGold }
                : { contentColor: actionColor }
            }
            modifiers={ [
              composeModifiers.fillMaxWidth(),
              composeModifiers.height( compact ? 40 : 52 ),
            ] }
          >
            { content }
          </ComposeButton>
        </Host>
      </View>
    );
  }

  // iOS draws the brand chrome with explicit SwiftUI modifiers. Order matters
  // (each wraps the previous): size the button first, then paint and clip, so
  // the gold fills the full bar instead of hugging the label. `height` and
  // `maxWidth` need separate frame() calls — the native modifier ignores
  // min/max bounds once an exact dimension is set. The system `filled` style
  // is avoided entirely: it draws its own content-hugging capsule that can't
  // be recolored from here (it rendered as a blue pill on a gold slab).
  const iosModifiers: ModifierConfig[] = [];
  if ( compact ) iosModifiers.push( swiftPadding( { horizontal: 14 } ) );
  iosModifiers.push( frame( { height: compact ? 40 : 52 } ) );
  if ( !compact ) iosModifiers.push( frame( { maxWidth: 9999 } ) );
  if ( variant === "filled" ) {
    iosModifiers.push(
      background( actionColor ),
      clipShape( "roundedRectangle", compact ? 12 : 14 )
    );
  }

  return (
    <View style={ compact ? styles.compactButtonHost : styles.buttonHost }>
      <Host style={ styles.fill }>
        <Button
          disabled={ disabled }
          onPress={ onPress }
          // Filled becomes the chrome-free plain style (we paint it above);
          // outlined keeps the native bordered glass pill for secondary actions.
          variant={ variant === "filled" ? "text" : variant }
          style={ Platform.OS === "web"
            ? StyleSheet.flatten( [
              compact ? styles.compactButton : styles.button,
              variant === "filled"
                ? { backgroundColor: actionColor }
                : undefined,
              variant === "outlined"
                ? { borderWidth: 1, borderColor: actionColor }
                : undefined,
            ] )
            : undefined }
          modifiers={ Platform.OS === "ios" ? iosModifiers : undefined }
        >
          { content }
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
          // Native platforms must not receive `width: "100%"` — the native
          // frame/size modifiers only decode numbers, and the string makes
          // them drop the height too, collapsing the field.
          style={ Platform.OS === "web" ? styles.fieldWeb : styles.field }
          textStyle={ styles.fieldText }
          // Strip the iOS 26 default glass-capsule chrome so the brand panel
          // background and hairline border are the only decoration. Android's
          // Compose field wraps its content, so make it fill the row.
          modifiers={ Platform.select( {
            ios: [ textFieldStyle( "plain" ) ],
            android: composeModifiers ? [
              composeModifiers.fillMaxWidth(),
              composeModifiers.height( 54 ),
            ] : undefined,
            default: undefined,
          } ) }
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

export interface NativeMenuAction {
  label: string;
  onPress: () => void;
  icon?: NativeSymbolName;
  tone?: "default" | "danger";
}

interface NativeMenuProps {
  children: React.ReactElement;
  actions: NativeMenuAction[];
}

export function NativeMenu( { children, actions }: NativeMenuProps ) {
  if ( swift ) {
    return (
      <swift.Host matchContents>
        <swift.Menu
          label={ <RNHostView matchContents>{ children }</RNHostView> }
          modifiers={ [ tint( colors.gold ) ] }
        >
          { actions.map( ( action, i ) => {
            const systemImage = typeof action.icon === "string"
              ? action.icon
              : action.icon?.ios;

            return (
              <swift.Button
                key={ i }
                label={ action.label }
                systemImage={ systemImage }
                onPress={ action.onPress }
                role={ action.tone === "danger" ? "destructive" : undefined }
              />
            );
          } ) }
        </swift.Menu>
      </swift.Host>
    );
  }

  // Fallback for other platforms: the caller is expected to handle the
  // trigger and visibility if they want a custom flyout UI.
  return <>{ children }</>;
}

interface NativePickerOption<T extends string | number> {
  label: string;
  value: T;
}

interface NativePickerProps<T extends string | number> {
  options: NativePickerOption<T>[];
  selectedValue: T;
  onValueChange: ( value: T ) => void;
  disabled?: boolean;
  compact?: boolean;
  bare?: boolean;
}

export function NativePicker<T extends string | number>( {
  options,
  selectedValue,
  onValueChange,
  disabled,
  compact = false,
  bare = false,
}: NativePickerProps<T> ) {
  if ( swift ) {
    const selectedLabel = options.find( ( option ) => option.value === selectedValue )?.label
      ?? String( selectedValue );

    return (
      <View style={ [
        styles.pickerHost,
        styles.pickerHostIos,
        compact && styles.pickerHostCompact,
        bare && styles.pickerHostBare,
      ] }>
        <swift.Host style={ styles.fill }>
          <swift.Menu
            label={
              <swift.HStack spacing={ 10 }>
                <swift.Text modifiers={ [ foregroundStyle( colors.gold ) ] }>
                  { selectedLabel }
                </swift.Text>
                <swift.Spacer />
                <swift.Image
                  systemName="chevron.up.chevron.down"
                  color={ colors.gold }
                  size={ 13 }
                />
              </swift.HStack>
            }
            modifiers={ [
              tint( colors.gold ),
              foregroundStyle( colors.gold ),
              swiftPadding( { horizontal: compact ? 10 : 14 } ),
              frame( {
                maxWidth: 9999,
                height: compact ? 40 : 50,
                alignment: "leading",
              } ),
              swiftDisabled( disabled ),
            ] }
          >
            { options.map( ( option ) => (
              <swift.Button
                key={ String( option.value ) }
                label={ option.label }
                systemImage={ option.value === selectedValue ? "checkmark" : undefined }
                onPress={ () => onValueChange( option.value ) }
              />
            ) ) }
          </swift.Menu>
        </swift.Host>
      </View>
    );
  }

  return (
    <View style={ [
      styles.pickerHost,
      compact && styles.pickerHostCompact,
      bare && styles.pickerHostBare,
    ] }>
      <Host style={ styles.fill } matchContents={ { vertical: true } }>
        <Picker
          appearance="menu"
          enabled={ !disabled }
          selectedValue={ selectedValue }
          onValueChange={ onValueChange }
        >
          { options.map( ( option ) => (
            <Picker.Item
              key={ String( option.value ) }
              label={ option.label }
              value={ option.value }
            />
          ) ) }
        </Picker>
      </Host>
    </View>
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
    height: 54,
  },
  pickerHost: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    backgroundColor: colors.panel,
  },
  pickerHostIos: {
    height: 50,
    paddingHorizontal: 0,
  },
  pickerHostCompact: {
    minHeight: 40,
    height: 40,
  },
  pickerHostBare: {
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  field: {
    height: 54,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    backgroundColor: colors.panel,
  },
  fieldWeb: {
    width: "100%",
    height: 54,
    paddingHorizontal: 14,
    paddingVertical: 0,
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
