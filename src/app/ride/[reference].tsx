import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheet, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeButton, NativeSwitch, NativeTextField } from "@/components/native-controls";
import { NativeIcon } from "@/components/native-icon";
import { RideDetails, RideSummary } from "@/components/ride-info";
import { StatusText } from "@/components/status-text";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import type { AdminChauffeur, DriverRide } from "@/lib/types";

const ADMIN_STATUS_OPTIONS = [
  { label: "Awaiting confirmation", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
];

function initials( name?: string ) {
  const parts = name?.trim().split( /\s+/ ).filter( Boolean ) ?? [];
  if ( parts.length === 0 ) return "?";
  if ( parts.length === 1 ) return parts[ 0 ]!.slice( 0, 2 ).toUpperCase();
  return `${ parts[ 0 ]![ 0 ] ?? "" }${ parts[ parts.length - 1 ]![ 0 ] ?? "" }`.toUpperCase();
}

export default function RideDetailScreen() {
  const insets = useSafeAreaInsets();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { token, isAdmin } = useAuth();
  const [ ride, setRide ] = useState<DriverRide | null>( null );
  const [ chauffeurs, setChauffeurs ] = useState<AdminChauffeur[]>( [] );
  const [ error, setError ] = useState<string | null>( null );
  const [ isUpdating, setIsUpdating ] = useState( false );
  const [ statusSheetOpen, setStatusSheetOpen ] = useState( false );
  const [ pendingStatus, setPendingStatus ] = useState<string>( "" );
  const [ chauffeurSheetOpen, setChauffeurSheetOpen ] = useState( false );
  const [ pendingChauffeurId, setPendingChauffeurId ] = useState<number>( 0 );
  const [ messageSubject, setMessageSubject ] = useState( "" );
  const [ messageBody, setMessageBody ] = useState( "" );
  const [ messageEmail, setMessageEmail ] = useState( true );
  const [ messageSms, setMessageSms ] = useState( false );

  useFocusEffect(
    useCallback( () => {
      if ( !token || !reference ) return;
      api.getRide( token, reference )
        .then( ( result ) => setRide( result.ride ) )
        .catch( ( err ) => setError( err instanceof Error ? err.message : "Failed to load ride" ) );
      if ( isAdmin ) {
        api.getAdminChauffeurs( token )
          .then( ( result ) => setChauffeurs( result.chauffeurs ) )
          .catch( () => {} );
      }
    }, [ token, reference, isAdmin ] )
  );

  const changeStatus = ( status: "confirmed" | "completed", confirmText: string ) => {
    Alert.alert( "Update ride", confirmText, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          if ( !token || !ride ) return;
          setIsUpdating( true );
          try {
            const result = await api.updateRideStatus( token, ride.reference, status );
            setRide( result.ride );
          } catch ( err ) {
            setError( err instanceof Error ? err.message : "Failed to update ride" );
          } finally {
            setIsUpdating( false );
          }
        },
      },
    ] );
  };

  const handleDelete = () => {
    if ( !token || !ride ) return;
    Alert.alert(
      "Delete booking",
      `Permanently delete booking ${ ride.reference }? The rider is not notified automatically.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsUpdating( true );
            setError( null );
            try {
              await api.deleteAdminBooking( token, ride.reference );
              router.back();
            } catch ( err ) {
              setError( err instanceof Error ? err.message : "Failed to delete booking" );
              setIsUpdating( false );
            }
          },
        },
      ]
    );
  };

  if ( error && !ride ) {
    return (
      <View style={ [ styles.container, styles.centered ] }>
        <NativeIcon
          name={ { ios: "exclamationmark.triangle", android: "error", web: "error" } }
          color={ colors.red }
          size={ 30 }
        />
        <Text style={ styles.error }>{ error }</Text>
      </View>
    );
  }

  if ( !ride ) {
    return (
      <View style={ [ styles.container, styles.centered ] }>
        <ActivityIndicator color={ colors.gold } />
      </View>
    );
  }

  const canConfirm = ride.status === "pending";
  const canComplete = ride.status === "confirmed" || ride.status === "accepted";
  const assignedChauffeur = chauffeurs.find( ( c ) => c.id === ride.chauffeurId );

  const openStatusSheet = () => {
    setPendingStatus( ride.status );
    setStatusSheetOpen( true );
  };

  const confirmStatusChange = async () => {
    if ( !token || pendingStatus === ride.status ) {
      setStatusSheetOpen( false );
      return;
    }
    setIsUpdating( true );
    setStatusSheetOpen( false );
    try {
      await api.updateAdminBooking( token, ride.reference, { status: pendingStatus } );
      setRide( { ...ride, status: pendingStatus } );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to update status" );
    } finally {
      setIsUpdating( false );
    }
  };

  const openChauffeurSheet = () => {
    setPendingChauffeurId( ride.chauffeurId ?? 0 );
    setChauffeurSheetOpen( true );
  };

  const confirmChauffeurChange = async () => {
    const chauffeurId = pendingChauffeurId === 0 ? null : pendingChauffeurId;
    if ( chauffeurId === ( ride.chauffeurId ?? null ) ) {
      setChauffeurSheetOpen( false );
      return;
    }
    setIsUpdating( true );
    setChauffeurSheetOpen( false );
    try {
      await api.updateAdminBooking( token!, ride.reference, { chauffeurId } );
      setRide( { ...ride, chauffeurId } );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to assign chauffeur" );
    } finally {
      setIsUpdating( false );
    }
  };

  const sendPassengerMessage = async () => {
    if ( !token || !ride || !messageSubject.trim() || !messageBody.trim() ) return;
    const channels = [
      ...( messageEmail ? [ "email" ] : [] ),
      ...( messageSms ? [ "sms" ] : [] ),
    ];
    if ( channels.length === 0 ) {
      setError( "Select at least one message channel" );
      return;
    }
    setIsUpdating( true );
    try {
      await api.sendMessage( token, {
        kind: "booking",
        reference: ride.reference,
        subject: messageSubject.trim(),
        message: messageBody.trim(),
        channels,
      } );
      setMessageSubject( "" );
      setMessageBody( "" );
      setError( null );
      Alert.alert( "Message queued", "The passenger update was queued for delivery." );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to message passenger" );
    } finally {
      setIsUpdating( false );
    }
  };

  return (
    <View style={ styles.container }>
      <ScrollView contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 24 } ] }>
        <RideSummary ride={ ride } />

        <View style={ styles.hairline } />

        <RideDetails ride={ ride } />

        { isAdmin && (
          <>
            <View style={ styles.hairline } />

            { /* Booking status */ }
            <Pressable
              onPress={ openStatusSheet }
              style={ ( { pressed } ) => [ styles.compactRow, pressed && styles.compactRowPressed ] }
              accessibilityRole="button"
              accessibilityLabel="Change booking status"
            >
              <Text style={ styles.compactLabel }>Booking status</Text>
              <View style={ styles.compactValue }>
                <StatusText status={ ride.status } />
                <NativeIcon
                  name={ { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } }
                  color={ colors.faint }
                  size={ 15 }
                />
              </View>
            </Pressable>

            <View style={ styles.hairline } />

            { /* Chauffeur */ }
            <Pressable
              onPress={ openChauffeurSheet }
              style={ ( { pressed } ) => [ styles.compactRow, pressed && styles.compactRowPressed ] }
              accessibilityRole="button"
              accessibilityLabel="Change chauffeur"
            >
              <Text style={ styles.compactLabel }>Chauffeur</Text>
              <View style={ styles.compactValue }>
                <View style={ [ styles.chauffeurAvatar, !assignedChauffeur && styles.chauffeurAvatarEmpty ] }>
                  <Text style={ styles.chauffeurInitials }>
                    { initials( assignedChauffeur?.name ) }
                  </Text>
                </View>
                <Text style={ styles.compactValueText } numberOfLines={ 1 }>
                  { assignedChauffeur?.name ?? "Unassigned" }
                </Text>
                <NativeIcon
                  name={ { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } }
                  color={ colors.faint }
                  size={ 15 }
                />
              </View>
            </Pressable>

            <View style={ styles.hairline } />

            <View style={ styles.messageSection }>
              <Text style={ styles.messageTitle }>Message passenger</Text>
              <NativeTextField
                value={ messageSubject }
                onChangeText={ setMessageSubject }
                placeholder="Subject"
              />
              <NativeTextField
                value={ messageBody }
                onChangeText={ setMessageBody }
                placeholder="Write a concise passenger update"
                multiline
              />
              <View style={ styles.messageChannels }>
                <View style={ styles.messageChannel }>
                  <Text style={ styles.messageChannelLabel }>Email</Text>
                  <NativeSwitch value={ messageEmail } onValueChange={ setMessageEmail } />
                </View>
                <View style={ styles.messageChannel }>
                  <Text style={ styles.messageChannelLabel }>SMS</Text>
                  <NativeSwitch value={ messageSms } onValueChange={ setMessageSms } />
                </View>
              </View>
              <NativeButton
                label={ isUpdating ? "Queueing" : "Send passenger message" }
                compact
                disabled={ isUpdating || !messageSubject.trim() || !messageBody.trim() }
                icon={ { ios: "paperplane", android: "send", web: "send" } }
                onPress={ sendPassengerMessage }
              />
            </View>

            <View style={ styles.hairline } />

            <View style={ styles.adminActions }>
              <NativeButton
                label={ isUpdating ? "Deleting" : "Delete booking" }
                variant="text"
                compact
                tone="danger"
                disabled={ isUpdating }
                icon={ { ios: "trash", android: "delete", web: "delete" } }
                onPress={ handleDelete }
              />
            </View>
          </>
        ) }

        { error && <Text style={ styles.error }>{ error }</Text> }
      </ScrollView>

      { !isAdmin && ( canConfirm || canComplete ) && (
        <View style={ [ styles.footer, { paddingBottom: insets.bottom + 16 } ] }>
          <NativeButton
            label={ isUpdating ? "Updating" : canConfirm ? "Confirm ride" : "Complete ride" }
            disabled={ isUpdating }
            onPress={ () =>
              canConfirm
                ? changeStatus( "confirmed", "Confirm this ride?" )
                : changeStatus( "completed", "Mark this ride as completed?" )
            }
          />
        </View>
      ) }

      { /* Chauffeur bottom sheet */ }
      <BottomSheet
        index={ chauffeurSheetOpen ? 0 : -1 }
        onDismiss={ () => setChauffeurSheetOpen( false ) }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetView
          style={ [ styles.sheetContent, { paddingBottom: Math.max( insets.bottom, 12 ) } ] }
        >

          <Text style={ styles.sheetTitle }>Assign chauffeur</Text>
          <View style={ styles.sheetOptions }>
            { [ { label: "Unassigned", value: 0 }, ...chauffeurs.map( ( c ) => ( { label: c.name, value: c.id } ) ) ].map( ( option ) => {
              const isSelected = pendingChauffeurId === option.value;
              return (
                <Pressable
                  key={ option.value }
                  onPress={ () => setPendingChauffeurId( option.value ) }
                  style={ ( { pressed } ) => [
                    styles.sheetOption,
                    isSelected && styles.sheetOptionSelected,
                    pressed && styles.sheetOptionPressed,
                  ] }
                  accessibilityRole="radio"
                  accessibilityState={ { selected: isSelected } }
                >
                  <View style={ styles.chauffeurRowInner }>
                    <View style={ [ styles.chauffeurAvatar, !isSelected && styles.chauffeurAvatarEmpty ] }>
                      <Text style={ styles.chauffeurInitials }>
                        { initials( option.value === 0 ? undefined : option.label ) }
                      </Text>
                    </View>
                    <Text style={ [ styles.chauffeurRowName, isSelected && { color: colors.ivory } ] } numberOfLines={ 1 }>
                      { option.label }
                    </Text>
                  </View>
                  { isSelected && (
                    <NativeIcon
                      name={ { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" } }
                      color={ colors.gold }
                      size={ 20 }
                    />
                  ) }
                </Pressable>
              );
            } ) }
          </View>
          <View style={ styles.sheetActions }>
            <NativeButton
              label="Confirm"
              disabled={ isUpdating || pendingChauffeurId === ( ride.chauffeurId ?? 0 ) }
              onPress={ confirmChauffeurChange }
            />
          </View>
        </BottomSheetView>
      </BottomSheet>

      { /* Status bottom sheet */ }
      <BottomSheet
        index={ statusSheetOpen ? 0 : -1 }
        onDismiss={ () => setStatusSheetOpen( false ) }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetView
          style={ [ styles.sheetContent, { paddingBottom: Math.max( insets.bottom, 12 ) } ] }
        >


          <Text style={ styles.sheetTitle }>Change status</Text>

          <View style={ styles.sheetOptions }>
            { ADMIN_STATUS_OPTIONS.map( ( option ) => {
              const isSelected = pendingStatus === option.value;
              return (
                <Pressable
                  key={ option.value }
                  onPress={ () => setPendingStatus( option.value ) }
                  style={ ( { pressed } ) => [
                    styles.sheetOption,
                    isSelected && styles.sheetOptionSelected,
                    pressed && styles.sheetOptionPressed,
                  ] }
                  accessibilityRole="radio"
                  accessibilityState={ { selected: isSelected } }
                >
                  <StatusText status={ option.value } />
                  { isSelected && (
                    <NativeIcon
                      name={ { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" } }
                      color={ colors.gold }
                      size={ 20 }
                    />
                  ) }
                </Pressable>
              );
            } ) }
          </View>

          <View style={ styles.sheetActions }>
            <NativeButton
              label="Confirm"
              disabled={ isUpdating || pendingStatus === ride.status }
              onPress={ confirmStatusChange }
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
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
    paddingHorizontal: 20,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },
  compactRowPressed: {
    opacity: 0.7,
  },
  compactLabel: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "500",
  },
  compactValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  compactValueText: {
    color: colors.muted,
    fontSize: 14,
    maxWidth: 160,
  },
  adminActions: {
    alignItems: "flex-start",
    paddingTop: 12,
  },
  messageSection: {
    gap: 10,
    paddingVertical: 16,
  },
  messageTitle: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
  },
  messageInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    backgroundColor: colors.panel,
    color: colors.ivory,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  messageBody: {
    minHeight: 96,
    paddingTop: 12,
  },
  messageChannels: {
    flexDirection: "row",
    gap: 20,
  },
  messageChannel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  messageChannelLabel: {
    color: colors.muted,
    fontSize: 13,
  },

  chauffeurRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  chauffeurRowName: {
    color: colors.muted,
    fontSize: 15,
    flexShrink: 1,
  },
  chauffeurAvatar: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(194, 158, 102, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(194, 158, 102, 0.28)",
    borderRadius: 11,
  },
  chauffeurAvatarEmpty: {
    backgroundColor: colors.raised,
    borderColor: colors.hairlineStrong,
  },
  chauffeurInitials: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },

  // Bottom sheet
  sheetBackground: {
    backgroundColor: Platform.OS === "android" ? colors.panel : "transparent",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },
  sheetTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sheetOptions: {
    gap: 8,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
  },
  sheetOptionSelected: {
    borderColor: colors.gold,
    backgroundColor: "rgba(194, 158, 102, 0.08)",
  },
  sheetOptionPressed: {
    opacity: 0.8,
  },
  sheetActions: {
    paddingTop: 4,
  },

  error: {
    color: colors.red,
    fontSize: 15,
    marginTop: 12,
  },
} );
