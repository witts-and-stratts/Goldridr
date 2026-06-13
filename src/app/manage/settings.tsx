import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FieldLabel } from "@/components/field-label";
import { NativeButton, NativeSwitch, NativeTextField } from "@/components/native-controls";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import type {
  AdminSettings,
  NotificationCategory,
  NotificationPreference,
} from "@/lib/types";

type SettingsForm = Record<keyof AdminSettings, string>;

function toForm( settings: AdminSettings ): SettingsForm {
  return {
    bookingBufferMinutes: String( settings.bookingBufferMinutes ),
    notificationTimezone: settings.notificationTimezone,
    appUrl: settings.appUrl,
    emailFromName: settings.emailFromName,
    emailFromAddress: settings.emailFromAddress,
    emailReplyTo: settings.emailReplyTo,
    priceByMileAirport: String( settings.priceByMileAirport ),
    priceByMileCity: String( settings.priceByMileCity ),
    priceByMileHourly: String( settings.priceByMileHourly ),
    twilioFromNumber: settings.twilioFromNumber,
  };
}

function fromForm( form: SettingsForm ): AdminSettings | string {
  const bookingBufferMinutes = Number.parseInt( form.bookingBufferMinutes, 10 );
  if ( Number.isNaN( bookingBufferMinutes ) || bookingBufferMinutes < 0 || bookingBufferMinutes > 240 ) {
    return "Booking buffer must be between 0 and 240 minutes";
  }
  const priceByMileAirport = Number.parseFloat( form.priceByMileAirport );
  const priceByMileCity = Number.parseFloat( form.priceByMileCity );
  const priceByMileHourly = Number.parseFloat( form.priceByMileHourly );
  if ( [ priceByMileAirport, priceByMileCity, priceByMileHourly ].some( ( v ) => Number.isNaN( v ) || v < 0 ) ) {
    return "Per-mile prices must be valid non-negative numbers";
  }
  return {
    bookingBufferMinutes,
    notificationTimezone: form.notificationTimezone.trim(),
    appUrl: form.appUrl.trim(),
    emailFromName: form.emailFromName.trim(),
    emailFromAddress: form.emailFromAddress.trim(),
    emailReplyTo: form.emailReplyTo.trim(),
    priceByMileAirport,
    priceByMileCity,
    priceByMileHourly,
    twilioFromNumber: form.twilioFromNumber.trim(),
  };
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [ form, setForm ] = useState<SettingsForm | null>( null );
  const [ error, setError ] = useState<string | null>( null );
  const [ savedAt, setSavedAt ] = useState<number | null>( null );
  const [ isSaving, setIsSaving ] = useState( false );
  const [ preferences, setPreferences ] = useState<NotificationPreference[]>( [] );

  useFocusEffect(
    useCallback( () => {
      if ( !token ) return;
      Promise.all( [
        api.getAdminSettings( token ),
        api.getNotificationPreferences( token ),
      ] )
        .then( ( [ settingsResult, preferencesResult ] ) => {
          setForm( toForm( settingsResult.settings ) );
          setPreferences( preferencesResult.preferences );
        } )
        .catch( ( err ) =>
          setError( err instanceof Error ? err.message : "Failed to load settings" ) );
    }, [ token ] )
  );

  const setField = ( key: keyof AdminSettings ) => ( value: string ) => {
    setForm( ( current ) => ( current ? { ...current, [ key ]: value } : current ) );
    setSavedAt( null );
  };

  const handleSave = async () => {
    if ( !token || !form ) return;
    const parsed = fromForm( form );
    if ( typeof parsed === "string" ) {
      setError( parsed );
      return;
    }
    setIsSaving( true );
    setError( null );
    try {
      const result = await api.saveAdminSettings( token, parsed );
      setForm( toForm( result.settings ) );
      setSavedAt( Date.now() );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to save settings" );
    } finally {
      setIsSaving( false );
    }
  };

  const preferenceFor = ( category: NotificationCategory ) => {
    const preference = preferences.find( item => item.category === category );
    return {
      inApp: preference ? Boolean( preference.inApp ) : true,
      email: preference ? Boolean( preference.email ) : true,
      sms: preference ? Boolean( preference.sms ) : false,
    };
  };

  const updatePreference = async (
    category: NotificationCategory,
    channel: "inApp" | "email" | "sms",
    value: boolean
  ) => {
    if ( !token ) return;
    const next = { ...preferenceFor( category ), [ channel ]: value };
    setPreferences( current => [
      ...current.filter( item => item.category !== category ),
      { category, ...next },
    ] );
    try {
      await api.saveNotificationPreference( token, category, next );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to save notification preference" );
    }
  };

  const feedUrl = token ? api.calendarFeedUrl( token ) : "";
  const openAppleCalendar = async () => {
    await Linking.openURL( feedUrl.replace( /^https?:\/\//, "webcal://" ) );
  };
  const openGoogleCalendar = async () => {
    await Linking.openURL(
      `https://calendar.google.com/calendar/render?cid=${ encodeURIComponent( feedUrl ) }`
    );
  };
  const shareCalendarFeed = async () => {
    await Share.share( { title: "Goldridr calendar feed", message: feedUrl, url: feedUrl } );
  };

  if ( !form ) {
    return (
      <View style={ [ styles.container, styles.centered ] }>
        { error
          ? <Text style={ styles.error }>{ error }</Text>
          : <ActivityIndicator color={ colors.gold } /> }
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={ styles.container }
      behavior={ Platform.OS === "ios" ? "padding" : undefined }
    >
      <ScrollView
        contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
      >
        <Text style={ [ plate, styles.sectionTitle ] }>Pricing per mile</Text>
        <View style={ styles.card }>
          <FieldLabel
            label="Airport transfers"
            icon={ { ios: "airplane", android: "flight", web: "flight" } }
          />
          <NativeTextField
            value={ form.priceByMileAirport }
            onChangeText={ setField( "priceByMileAirport" ) }
            placeholder="3.50"
            keyboardType="decimal-pad"
          />

          <FieldLabel
            label="City rides"
            icon={ { ios: "building.2", android: "location_city", web: "location_city" } }
          />
          <NativeTextField
            value={ form.priceByMileCity }
            onChangeText={ setField( "priceByMileCity" ) }
            placeholder="3.00"
            keyboardType="decimal-pad"
          />

          <FieldLabel
            label="Hourly charters"
            icon={ { ios: "clock", android: "schedule", web: "schedule" } }
          />
          <NativeTextField
            value={ form.priceByMileHourly }
            onChangeText={ setField( "priceByMileHourly" ) }
            placeholder="2.75"
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={ [ plate, styles.sectionTitle ] }>Bookings</Text>
        <View style={ styles.card }>
          <FieldLabel
            label="Booking buffer (minutes)"
            icon={ { ios: "hourglass", android: "hourglass_empty", web: "hourglass_empty" } }
          />
          <NativeTextField
            value={ form.bookingBufferMinutes }
            onChangeText={ setField( "bookingBufferMinutes" ) }
            placeholder="60"
            keyboardType="number-pad"
          />

          <FieldLabel
            label="Notification timezone"
            icon={ { ios: "globe", android: "public", web: "public" } }
          />
          <NativeTextField
            value={ form.notificationTimezone }
            onChangeText={ setField( "notificationTimezone" ) }
            placeholder="America/New_York"
            autoCapitalize="none"
            autoCorrect={ false }
          />

          <FieldLabel
            label="App URL"
            icon={ { ios: "link", android: "link", web: "link" } }
          />
          <NativeTextField
            value={ form.appUrl }
            onChangeText={ setField( "appUrl" ) }
            placeholder="https://goldridr.com"
            autoCapitalize="none"
            autoCorrect={ false }
            keyboardType="url"
          />
        </View>

        <Text style={ [ plate, styles.sectionTitle ] }>Messaging identity</Text>
        <View style={ styles.card }>
          <FieldLabel
            label="Email from name"
            icon={ { ios: "person.text.rectangle", android: "badge", web: "badge" } }
          />
          <NativeTextField
            value={ form.emailFromName }
            onChangeText={ setField( "emailFromName" ) }
            placeholder="Goldridr"
          />

          <FieldLabel
            label="Email from address"
            icon={ { ios: "envelope", android: "mail", web: "mail" } }
          />
          <NativeTextField
            value={ form.emailFromAddress }
            onChangeText={ setField( "emailFromAddress" ) }
            placeholder="rides@goldridr.com"
            autoCapitalize="none"
            autoCorrect={ false }
            keyboardType="email-address"
          />

          <FieldLabel
            label="Reply-to (optional)"
            icon={ { ios: "arrowshape.turn.up.left", android: "reply", web: "reply" } }
          />
          <NativeTextField
            value={ form.emailReplyTo }
            onChangeText={ setField( "emailReplyTo" ) }
            placeholder="concierge@goldridr.com"
            autoCapitalize="none"
            autoCorrect={ false }
            keyboardType="email-address"
          />

          <FieldLabel
            label="SMS from number"
            icon={ { ios: "message", android: "sms", web: "sms" } }
          />
          <NativeTextField
            value={ form.twilioFromNumber }
            onChangeText={ setField( "twilioFromNumber" ) }
            placeholder="+15550000000"
            keyboardType="phone-pad"
          />
        </View>

        <Text style={ [ plate, styles.sectionTitle ] }>Notification channels</Text>
        <View style={ styles.card }>
          { ( [
            { value: "bookings", label: "Booking updates" },
            { value: "reminders", label: "Trip reminders" },
            { value: "messages", label: "Dispatch messages" },
            { value: "system", label: "System alerts" },
          ] as const ).map( category => {
            const preference = preferenceFor( category.value );
            return (
              <View key={ category.value } style={ styles.preferenceGroup }>
                <Text style={ styles.preferenceTitle }>{ category.label }</Text>
                <View style={ styles.preferenceChannels }>
                  <PreferenceSwitch
                    label="In-app"
                    value={ preference.inApp }
                    onChange={ value => updatePreference( category.value, "inApp", value ) }
                  />
                  <PreferenceSwitch
                    label="Email"
                    value={ preference.email }
                    onChange={ value => updatePreference( category.value, "email", value ) }
                  />
                  <PreferenceSwitch
                    label="SMS"
                    value={ preference.sms }
                    onChange={ value => updatePreference( category.value, "sms", value ) }
                  />
                </View>
              </View>
            );
          } ) }
        </View>

        <Text style={ [ plate, styles.sectionTitle ] }>Calendar sync</Text>
        <View style={ styles.card }>
          <Text style={ styles.helperText }>
            Subscribe to the operations feed so booking changes appear in your calendar.
          </Text>
          <NativeButton
            label="Open in Apple Calendar"
            variant="outlined"
            icon={ { ios: "calendar.badge.plus", android: "event", web: "event" } }
            onPress={ openAppleCalendar }
          />
          <NativeButton
            label="Add to Google Calendar"
            variant="outlined"
            icon={ { ios: "globe", android: "public", web: "public" } }
            onPress={ openGoogleCalendar }
          />
          <NativeButton
            label="Share calendar feed"
            variant="outlined"
            icon={ { ios: "square.and.arrow.up", android: "share", web: "share" } }
            onPress={ shareCalendarFeed }
          />
        </View>

        { error && <Text style={ styles.error }>{ error }</Text> }
        { savedAt && <Text style={ styles.saved }>Settings saved</Text> }

        <View style={ styles.saveButton }>
          <NativeButton
            label={ isSaving ? "Saving" : "Save settings" }
            disabled={ isSaving }
            icon={ { ios: "checkmark", android: "check", web: "check" } }
            onPress={ handleSave }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PreferenceSwitch( {
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: ( value: boolean ) => void;
} ) {
  return (
    <View style={ styles.preferenceSwitch }>
      <Text style={ styles.preferenceLabel }>{ label }</Text>
      <NativeSwitch value={ value } onValueChange={ onChange } />
    </View>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    color: colors.gold,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    marginBottom: 24,
  },
  saved: {
    color: colors.gold,
    fontSize: 14,
    marginTop: 8,
  },
  error: {
    color: colors.red,
    fontSize: 14,
    marginTop: 8,
  },
  saveButton: {
    marginTop: 16,
  },
  preferenceGroup: {
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  preferenceTitle: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
  },
  preferenceChannels: {
    flexDirection: "row",
    gap: 18,
  },
  preferenceSwitch: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  preferenceLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
} );
