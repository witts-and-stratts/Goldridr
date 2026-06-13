import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheet, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { Redirect, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeButton, NativeSwitch, NativeTextField } from "@/components/native-controls";
import { NativeIcon } from "@/components/native-icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import type {
  AdminChauffeur,
  FailedDelivery,
  MessageRecipient,
  ReminderBooking,
  ReminderDelivery,
} from "@/lib/types";

type Tab = "messages" | "reminders" | "deliveries";
type Audience = "riders" | "chauffeurs";

export default function CommunicationsScreen() {
  const insets = useSafeAreaInsets();
  const { token, isAdmin } = useAuth();
  const [ tab, setTab ] = useState<Tab>( "messages" );
  const [ riders, setRiders ] = useState<MessageRecipient[]>( [] );
  const [ chauffeurs, setChauffeurs ] = useState<AdminChauffeur[]>( [] );
  const [ reminderBookings, setReminderBookings ] = useState<ReminderBooking[]>( [] );
  const [ reminders, setReminders ] = useState<ReminderDelivery[]>( [] );
  const [ failures, setFailures ] = useState<FailedDelivery[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ isSending, setIsSending ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );

  const [ audience, setAudience ] = useState<Audience>( "riders" );
  const [ search, setSearch ] = useState( "" );
  const [ selectedRiders, setSelectedRiders ] = useState<string[]>( [] );
  const [ selectedChauffeurs, setSelectedChauffeurs ] = useState<number[]>( [] );
  const [ subject, setSubject ] = useState( "" );
  const [ message, setMessage ] = useState( "" );
  const [ messageEmail, setMessageEmail ] = useState( true );
  const [ messageSms, setMessageSms ] = useState( false );
  const [ messageInApp, setMessageInApp ] = useState( false );
  const [ messageSheetOpen, setMessageSheetOpen ] = useState( false );

  const [ reminderSearch, setReminderSearch ] = useState( "" );
  const [ reminderReference, setReminderReference ] = useState<string | null>( null );
  const [ reminderEmail, setReminderEmail ] = useState( true );
  const [ reminderSms, setReminderSms ] = useState( false );
  const [ reminderSheetOpen, setReminderSheetOpen ] = useState( false );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const [ recipientsResult, chauffeurResult, reminderResult, notificationResult ] = await Promise.all( [
        api.getMessageRecipients( token ),
        api.getAdminChauffeurs( token ),
        api.getReminderOperations( token ),
        api.getAdminNotificationOperations( token ),
      ] );
      setRiders( recipientsResult.riders );
      setChauffeurs( chauffeurResult.chauffeurs );
      setReminderBookings( reminderResult.bookings );
      setReminders( reminderResult.reminders );
      setFailures( notificationResult.failedDeliveries );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to load communications" );
    } finally {
      setIsLoading( false );
    }
  }, [ token ] );

  useFocusEffect( useCallback( () => { void load(); }, [ load ] ) );

  const filteredRiders = useMemo( () => {
    const query = search.trim().toLowerCase();
    return riders.filter( rider => !query
      || rider.name.toLowerCase().includes( query )
      || rider.email.toLowerCase().includes( query )
      || rider.reference.toLowerCase().includes( query )
    );
  }, [ riders, search ] );

  const filteredChauffeurs = useMemo( () => {
    const query = search.trim().toLowerCase();
    return chauffeurs.filter( chauffeur => !query
      || chauffeur.name.toLowerCase().includes( query )
      || chauffeur.email.toLowerCase().includes( query )
    );
  }, [ chauffeurs, search ] );

  const filteredReminderBookings = useMemo( () => {
    const query = reminderSearch.trim().toLowerCase();
    return reminderBookings
      .filter( booking => ![ "cancelled", "rejected" ].includes( booking.status ) )
      .filter( booking => !query
        || booking.name.toLowerCase().includes( query )
        || booking.email.toLowerCase().includes( query )
        || booking.reference.toLowerCase().includes( query )
      );
  }, [ reminderBookings, reminderSearch ] );

  if ( !isAdmin ) return <Redirect href="/" />;

  const refresh = async () => {
    setIsRefreshing( true );
    await load();
    setIsRefreshing( false );
  };

  const toggleRider = ( reference: string ) => {
    setSelectedRiders( current =>
      current.includes( reference ) ? current.filter( item => item !== reference ) : [ ...current, reference ]
    );
  };

  const toggleChauffeur = ( id: number ) => {
    setSelectedChauffeurs( current =>
      current.includes( id ) ? current.filter( item => item !== id ) : [ ...current, id ]
    );
  };

  const sendMessage = async () => {
    if ( !token ) return;
    const channels = [
      ...( messageEmail ? [ "email" ] : [] ),
      ...( messageSms ? [ "sms" ] : [] ),
      ...( messageInApp ? [ "in_app" ] : [] ),
    ];
    if ( !subject.trim() || !message.trim() || channels.length === 0 ) {
      setError( "Subject, message, and at least one channel are required" );
      return;
    }
    if ( selectedRiders.length === 0 && selectedChauffeurs.length === 0 ) {
      setError( "Select at least one recipient" );
      return;
    }
    setIsSending( true );
    setError( null );
    try {
      const result = await api.sendMessage( token, {
        kind: "recipients",
        riderReferences: selectedRiders,
        chauffeurIds: selectedChauffeurs,
        subject: subject.trim(),
        message: message.trim(),
        channels,
      } );
      setSubject( "" );
      setMessage( "" );
      setSelectedRiders( [] );
      setSelectedChauffeurs( [] );
      const skipped = result.skippedSms?.length
        ? ` SMS skipped for ${ result.skippedSms.join( ", " ) }.`
        : "";
      Alert.alert( "Message queued", `The message was queued successfully.${ skipped }` );
      await load();
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to send message" );
    } finally {
      setIsSending( false );
    }
  };

  const sendReminder = async () => {
    if ( !token || !reminderReference ) return;
    const channels = [
      ...( reminderEmail ? [ "email" ] : [] ),
      ...( reminderSms ? [ "sms" ] : [] ),
    ];
    if ( channels.length === 0 ) {
      setError( "Select at least one reminder channel" );
      return;
    }
    setIsSending( true );
    setError( null );
    try {
      await api.sendReminder( token, reminderReference, channels );
      setReminderReference( null );
      Alert.alert( "Reminder queued", "Pickup details were queued for delivery." );
      await load();
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to send reminder" );
    } finally {
      setIsSending( false );
    }
  };

  const retry = async ( delivery: FailedDelivery ) => {
    if ( !token ) return;
    try {
      await api.retryNotificationDelivery( token, delivery.id );
      setFailures( current => current.filter( item => item.id !== delivery.id ) );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to retry delivery" );
    }
  };

  const selectedReminder = reminderBookings.find( booking => booking.reference === reminderReference );

  return (
    <View style={ styles.container }>
      <View style={ styles.tabBar }>
        <SegmentedControl
          values={ [ "Messages", "Reminders", "Deliveries" ] }
          selectedIndex={ [ "messages", "reminders", "deliveries" ].indexOf( tab ) }
          onValueChange={ value => setTab( value.toLowerCase() as Tab ) }
          appearance="dark"
          tintColor={ colors.gold }
        />
      </View>

      <ScrollView
        contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
        refreshControl={
          <RefreshControl refreshing={ isRefreshing } onRefresh={ refresh } tintColor={ colors.gold } />
        }
      >
        { isLoading ? <ActivityIndicator color={ colors.gold } style={ styles.loader } /> : null }
        { error ? <Text style={ styles.error }>{ error }</Text> : null }

        { !isLoading && tab === "messages" ? (
          <>
            <Text style={ [ plate, styles.sectionTitle ] }>Recipients</Text>
            <SegmentedControl
              values={ [ "Riders", "Chauffeurs" ] }
              selectedIndex={ audience === "riders" ? 0 : 1 }
              onValueChange={ value => setAudience( value === "Riders" ? "riders" : "chauffeurs" ) }
              appearance="dark"
              tintColor={ colors.gold }
            />
            <NativeTextField
              value={ search }
              onChangeText={ setSearch }
              placeholder={ `Search ${ audience }` }
            />
            <View style={ styles.listCard }>
              { audience === "riders"
                ? filteredRiders.map( rider => (
                  <RecipientRow
                    key={ rider.reference }
                    selected={ selectedRiders.includes( rider.reference ) }
                    title={ rider.name }
                    detail={ `${ rider.reference } · ${ rider.email }${ rider.smsConsented ? "" : " · No SMS consent" }` }
                    onPress={ () => toggleRider( rider.reference ) }
                  />
                ) )
                : filteredChauffeurs.map( chauffeur => (
                  <RecipientRow
                    key={ chauffeur.id }
                    selected={ selectedChauffeurs.includes( chauffeur.id ) }
                    title={ chauffeur.name }
                    detail={ chauffeur.email }
                    onPress={ () => toggleChauffeur( chauffeur.id ) }
                  />
                ) ) }
            </View>

            <NativeButton
              label="Compose message"
              icon={ { ios: "paperplane.fill", android: "send", web: "send" } }
              onPress={ () => setMessageSheetOpen( true ) }
            />
          </>
        ) : null }

        { !isLoading && tab === "reminders" ? (
          <>
            <NativeButton
              label="Queue reminder"
              icon={ { ios: "bell.badge.fill", android: "notification_add", web: "notification_add" } }
              onPress={ () => setReminderSheetOpen( true ) }
            />

            <Text style={ [ plate, styles.sectionTitle ] }>Recent reminder activity</Text>
            { reminders.length === 0
              ? <Text style={ styles.empty }>No reminder deliveries yet.</Text>
              : reminders.map( reminder => (
                <DeliveryRow
                  key={ reminder.id }
                  title={ reminder.passengerName || reminder.recipient }
                  detail={ `${ reminder.bookingReference || "No booking" } · ${ reminder.channel.toUpperCase() } · ${ reminder.status }` }
                  error={ reminder.lastError }
                />
              ) ) }
          </>
        ) : null }

        { !isLoading && tab === "deliveries" ? (
          <>
            <Text style={ [ plate, styles.sectionTitle ] }>Delivery failures</Text>
            { failures.length === 0 ? (
              <View style={ styles.emptyState }>
                <NativeIcon
                  name={ { ios: "checkmark.circle", android: "check_circle", web: "check_circle" } }
                  color={ colors.gold }
                  size={ 30 }
                />
                <Text style={ styles.empty }>No failed deliveries.</Text>
              </View>
            ) : failures.map( delivery => (
              <View key={ delivery.id } style={ styles.failureCard }>
                <DeliveryRow
                  title={ delivery.title }
                  detail={ `${ delivery.channel.toUpperCase() } · ${ delivery.recipient }` }
                  error={ delivery.lastError }
                />
                <NativeButton
                  label="Retry delivery"
                  compact
                  variant="outlined"
                  icon={ { ios: "arrow.clockwise", android: "refresh", web: "refresh" } }
                  onPress={ () => retry( delivery ) }
                />
              </View>
            ) ) }
          </>
        ) : null }
      </ScrollView>

      <BottomSheet
        index={ messageSheetOpen ? 0 : -1 }
        onDismiss={ () => setMessageSheetOpen( false ) }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetScrollView contentContainerStyle={ [ styles.sheetContent, { paddingBottom: 24 } ] }>
          <Text style={ [ plate, styles.sectionTitle ] }>Message</Text>
          <Text style={ styles.sheetHint }>
            { selectedRiders.length + selectedChauffeurs.length } recipient{ selectedRiders.length + selectedChauffeurs.length === 1 ? "" : "s" } selected
          </Text>
          <NativeTextField
            value={ subject }
            onChangeText={ setSubject }
            placeholder="Subject"
          />
          <NativeTextField
            value={ message }
            onChangeText={ setMessage }
            placeholder="Write a concise operational message"
            multiline
          />
          <View style={ styles.channelCard }>
            <ChannelSwitch label="Email" value={ messageEmail } onChange={ setMessageEmail } />
            <ChannelSwitch label="SMS" value={ messageSms } onChange={ setMessageSms } />
            <ChannelSwitch
              label="In-app"
              value={ messageInApp }
              onChange={ setMessageInApp }
              disabled={ selectedChauffeurs.length === 0 }
            />
          </View>
          <View style={ styles.sheetActions }>
            <NativeButton label="Cancel" variant="outlined" compact onPress={ () => setMessageSheetOpen( false ) } />
            <NativeButton
              label={ isSending ? "Queueing message" : `Send to ${ selectedRiders.length + selectedChauffeurs.length } recipients` }
              disabled={ isSending }
              icon={ { ios: "paperplane.fill", android: "send", web: "send" } }
              onPress={ async () => {
                await sendMessage();
                setMessageSheetOpen( false );
              } }
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet
        index={ reminderSheetOpen ? 0 : -1 }
        onDismiss={ () => setReminderSheetOpen( false ) }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetScrollView contentContainerStyle={ [ styles.sheetContent, { paddingBottom: 24 } ] }>
          <Text style={ [ plate, styles.sectionTitle ] }>Choose booking</Text>
          <NativeTextField
            value={ reminderSearch }
            onChangeText={ setReminderSearch }
            placeholder="Search rider or booking reference"
          />
          <View style={ styles.listCard }>
            { filteredReminderBookings.map( booking => (
              <RecipientRow
                key={ booking.reference }
                selected={ reminderReference === booking.reference }
                title={ booking.name }
                detail={ `${ booking.reference } · ${ booking.date } ${ booking.time }` }
                onPress={ () => {
                  setReminderReference( booking.reference );
                  if ( !booking.smsConsented ) setReminderSms( false );
                } }
              />
            ) ) }
          </View>
          <View style={ styles.channelCard }>
            <ChannelSwitch label="Email" value={ reminderEmail } onChange={ setReminderEmail } />
            <ChannelSwitch
              label={ selectedReminder?.smsConsented === false ? "SMS (no consent)" : "SMS" }
              value={ reminderSms }
              onChange={ setReminderSms }
              disabled={ !selectedReminder?.smsConsented }
            />
          </View>
          <View style={ styles.sheetActions }>
            <NativeButton label="Cancel" variant="outlined" compact onPress={ () => setReminderSheetOpen( false ) } />
            <NativeButton
              label={ isSending ? "Queueing reminder" : "Send booking reminder" }
              disabled={ isSending || !reminderReference }
              icon={ { ios: "bell.badge.fill", android: "notification_add", web: "notification_add" } }
              onPress={ async () => {
                await sendReminder();
                setReminderSheetOpen( false );
              } }
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

function RecipientRow( {
  selected,
  title,
  detail,
  onPress,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onPress: () => void;
} ) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={ { checked: selected } }
      onPress={ onPress }
      style={ ( { pressed } ) => [ styles.row, selected && styles.rowSelected, pressed && styles.rowPressed ] }
    >
      <NativeIcon
        name={ selected
          ? { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }
          : { ios: "circle", android: "radio_button_unchecked", web: "radio_button_unchecked" } }
        color={ selected ? colors.gold : colors.faint }
        size={ 20 }
      />
      <View style={ styles.rowText }>
        <Text style={ styles.rowTitle } numberOfLines={ 1 }>{ title }</Text>
        <Text style={ styles.rowDetail } numberOfLines={ 2 }>{ detail }</Text>
      </View>
    </Pressable>
  );
}

function ChannelSwitch( {
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: ( value: boolean ) => void;
  disabled?: boolean;
} ) {
  return (
    <View style={ styles.channelRow }>
      <Text style={ [ styles.channelLabel, disabled && styles.disabled ] }>{ label }</Text>
      <NativeSwitch value={ value } onValueChange={ onChange } disabled={ disabled } />
    </View>
  );
}

function DeliveryRow( {
  title,
  detail,
  error,
}: {
  title: string;
  detail: string;
  error?: string | null;
} ) {
  return (
    <View style={ styles.deliveryRow }>
      <Text style={ styles.rowTitle }>{ title }</Text>
      <Text style={ styles.rowDetail }>{ detail }</Text>
      { error ? <Text style={ styles.deliveryError }>{ error }</Text> : null }
    </View>
  );
}

const styles = StyleSheet.create( {
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  content: { padding: 20, gap: 14 },
  loader: { marginTop: 40 },
  sectionTitle: { color: colors.gold, marginTop: 10 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    backgroundColor: colors.panel,
    color: colors.ivory,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  messageInput: { minHeight: 130, paddingTop: 14 },
  listCard: {
    maxHeight: 310,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    backgroundColor: colors.panel,
  },
  rowSelected: { backgroundColor: colors.raised },
  rowPressed: { opacity: 0.8 },
  rowText: { flex: 1 },
  rowTitle: { color: colors.ivory, fontSize: 14, fontWeight: "600" },
  rowDetail: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  channelCard: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
  },
  sheetBackground: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  sheetHint: {
    color: colors.muted,
    fontSize: 12,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  channelRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  channelLabel: { color: colors.ivory, fontSize: 14 },
  disabled: { color: colors.faint },
  deliveryRow: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    backgroundColor: colors.panel,
    padding: 14,
  },
  deliveryError: { color: colors.red, fontSize: 12, lineHeight: 18, marginTop: 8 },
  failureCard: { gap: 8, marginBottom: 4 },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 44 },
  empty: { color: colors.muted, fontSize: 14 },
  error: { color: colors.red, fontSize: 14, lineHeight: 20 },
} );
