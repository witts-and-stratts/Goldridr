import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { NativeButton, NativeTextField } from "@/components/native-controls";
import { NativeIcon } from "@/components/native-icon";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [ email, setEmail ] = useState( "" );
  const [ password, setPassword ] = useState( "" );
  const [ error, setError ] = useState<string | null>( null );
  const [ isSubmitting, setIsSubmitting ] = useState( false );

  const handleSubmit = async () => {
    if ( !email.trim() || !password ) {
      setError( "Enter your email and password" );
      return;
    }
    setError( null );
    setIsSubmitting( true );
    try {
      await signIn( email, password );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Login failed" );
    } finally {
      setIsSubmitting( false );
    }
  };

  return (
    <SafeAreaView style={ styles.safeArea }>
      <KeyboardAvoidingView
        style={ styles.container }
        behavior={ Platform.OS === "ios" ? "padding" : undefined }
      >
        <View style={ styles.brand }>
          <Image
            // React Native image assets are resolved by Metro through require().
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={ require( "../../assets/images/goldridr-logo.png" ) }
            style={ styles.logo }
            contentFit="contain"
            alt="Goldridr"
            accessibilityLabel="Goldridr"
          />
          <Text style={ [ plate, styles.tagline ] }>Chauffeur console</Text>
        </View>

        <View style={ styles.form }>
          <View style={ styles.fieldLabel }>
            <NativeIcon
              name={ { ios: "envelope", android: "mail", web: "mail" } }
              size={ 16 }
            />
            <Text style={ [ plate, styles.label ] }>Email</Text>
          </View>
          <NativeTextField
            value={ email }
            onChangeText={ setEmail }
            placeholder="you@goldridr.com"
            autoCapitalize="none"
            autoCorrect={ false }
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <View style={ styles.fieldLabel }>
            <NativeIcon
              name={ { ios: "lock", android: "lock", web: "lock" } }
              size={ 16 }
            />
            <Text style={ [ plate, styles.label ] }>Password</Text>
          </View>
          <NativeTextField
            value={ password }
            onChangeText={ setPassword }
            placeholder="Password"
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={ handleSubmit }
          />

          { error && <Text style={ styles.error }>{ error }</Text> }

          <View style={ styles.button }>
            <NativeButton
              label={ isSubmitting ? "Signing in" : "Sign in" }
              onPress={ handleSubmit }
              disabled={ isSubmitting }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create( {
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  brand: {
    alignItems: "center",
    marginBottom: 56,
    gap: 14,
  },
  logo: {
    width: 250,
    height: 52,
  },
  tagline: {
    color: colors.muted,
  },
  form: {
    gap: 12,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  label: {
    color: colors.faint,
  },
  error: {
    color: colors.red,
    marginTop: 10,
  },
  button: {
    marginTop: 20,
  },
} );
