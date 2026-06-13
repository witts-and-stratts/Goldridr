import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheet, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FieldLabel } from "@/components/field-label";
import { NativeButton, NativeTextField } from "@/components/native-controls";
import { NativeIcon, NativeIconButton } from "@/components/native-icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import type { AdminChauffeur, DriverRide } from "@/lib/types";

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

export default function ChauffeursScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [ chauffeurs, setChauffeurs ] = useState<AdminChauffeur[]>( [] );
  const [ rides, setRides ] = useState<DriverRide[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ formOpen, setFormOpen ] = useState( false );
  const [ form, setForm ] = useState( EMPTY_FORM );
  const [ isSubmitting, setIsSubmitting ] = useState( false );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const [ chauffeurResult, rideResult ] = await Promise.all( [
        api.getAdminChauffeurs( token ),
        api.getRides( token ),
      ] );
      setChauffeurs( chauffeurResult.chauffeurs );
      setRides( rideResult.rides );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to load chauffeurs" );
    } finally {
      setIsLoading( false );
    }
  }, [ token ] );

  useFocusEffect(
    useCallback( () => {
      load();
    }, [ load ] )
  );

  const handleRefresh = async () => {
    setIsRefreshing( true );
    await load();
    setIsRefreshing( false );
  };

  const handleCreate = async () => {
    if ( !token ) return;
    if ( !form.name.trim() || !form.email.trim() || !form.password ) {
      setError( "Name, email, and password are required" );
      return;
    }
    setIsSubmitting( true );
    try {
      await api.createAdminChauffeur( token, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      } );
      setForm( EMPTY_FORM );
      setFormOpen( false );
      setError( null );
      await load();
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to add chauffeur" );
    } finally {
      setIsSubmitting( false );
    }
  };

  const handleDelete = ( chauffeur: AdminChauffeur ) => {
    Alert.alert(
      "Remove chauffeur",
      `Remove ${ chauffeur.name } from the roster? Their assigned rides become unassigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if ( !token ) return;
            try {
              await api.deleteAdminChauffeur( token, chauffeur.id );
              setChauffeurs( ( current ) => current.filter( ( c ) => c.id !== chauffeur.id ) );
            } catch ( err ) {
              setError( err instanceof Error ? err.message : "Failed to remove chauffeur" );
            }
          },
        },
      ]
    );
  };

  const unassigned = rides.filter( ride =>
    !ride.chauffeurId && ![ "cancelled", "rejected" ].includes( ride.status )
  );

  const statsFor = ( id: number ) => {
    const assigned = rides.filter( ride => ride.chauffeurId === id );
    const confirmed = assigned.filter( ride => [ "confirmed", "accepted" ].includes( ride.status ) );
    const upcoming = confirmed.filter( ride => ride.date >= new Date().toISOString().slice( 0, 10 ) );
    const revenue = confirmed.reduce( ( total, ride ) => {
      const amount = Number.parseFloat( ( ride.estimatedPrice ?? "0" ).replace( /[^0-9.-]/g, "" ) );
      return total + ( Number.isFinite( amount ) ? amount : 0 );
    }, 0 );
    return { total: assigned.length, confirmed: confirmed.length, upcoming: upcoming.length, revenue };
  };

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
      refreshControl={
        <RefreshControl refreshing={ isRefreshing } onRefresh={ handleRefresh } tintColor={ colors.gold } />
      }
    >
      { error && <Text style={ styles.error }>{ error }</Text> }

      { !isLoading && unassigned.length > 0 ? (
        <View style={ styles.alertCard }>
          <NativeIcon
            name={ { ios: "exclamationmark.circle", android: "warning", web: "warning" } }
            color={ colors.amber }
            size={ 20 }
          />
          <View style={ styles.alertText }>
            <Text style={ styles.alertTitle }>
              { unassigned.length } unassigned { unassigned.length === 1 ? "booking" : "bookings" }
            </Text>
            <Text style={ styles.alertBody }>Assign these bookings from the Bookings tab.</Text>
          </View>
        </View>
      ) : null }

      { formOpen ? null : (
        <NativeButton
          label="Add chauffeur"
          icon={ { ios: "person.badge.plus", android: "person_add", web: "person_add" } }
          onPress={ () => setFormOpen( true ) }
        />
      ) }

      <View style={ styles.list }>
        { isLoading ? (
          <ActivityIndicator color={ colors.gold } style={ styles.loader } />
        ) : chauffeurs.length === 0 ? (
          <View style={ styles.empty }>
            <NativeIcon
              name={ { ios: "person.2", android: "group", web: "group" } }
              color={ colors.faint }
              size={ 34 }
            />
            <Text style={ styles.emptyTitle }>No chauffeurs yet</Text>
            <Text style={ styles.emptyBody }>
              Add your first chauffeur and they can sign in to this app with
              the email and password you set.
            </Text>
          </View>
        ) : (
          chauffeurs.map( ( chauffeur ) => {
            const stats = statsFor( chauffeur.id );
            return (
              <View key={ chauffeur.id } style={ styles.chauffeurCard }>
                <View style={ styles.row }>
                  <View style={ styles.rowIcon }>
                    <NativeIcon
                      name={ { ios: "person.fill", android: "person", web: "person" } }
                      color={ colors.ivory }
                      size={ 18 }
                    />
                  </View>
                  <View style={ styles.rowText }>
                    <Text style={ styles.rowTitle } numberOfLines={ 1 }>{ chauffeur.name }</Text>
                    <Text style={ styles.rowCaption } numberOfLines={ 1 }>
                      { chauffeur.email }
                      { chauffeur.phone ? ` · ${ chauffeur.phone }` : "" }
                    </Text>
                  </View>
                  <NativeIconButton
                    accessibilityLabel={ `Remove ${ chauffeur.name }` }
                    name={ { ios: "trash", android: "delete", web: "delete" } }
                    color={ colors.red }
                    size={ 18 }
                    onPress={ () => handleDelete( chauffeur ) }
                  />
                </View>
                <View style={ styles.stats }>
                  <Stat label="Total" value={ String( stats.total ) } />
                  <Stat label="Confirmed" value={ String( stats.confirmed ) } />
                  <Stat label="Upcoming" value={ String( stats.upcoming ) } />
                  <Stat
                    label="Revenue"
                    value={ new Intl.NumberFormat( "en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    } ).format( stats.revenue ) }
                  />
                </View>
                <View style={ styles.cardActions }>
                  <NativeButton
                    label="Bookings"
                    variant="text"
                    compact
                    onPress={ () => router.push( {
                      pathname: "/(tabs)/manage",
                      params: { chauffeur: String( chauffeur.id ) },
                    } ) }
                  />
                  <NativeButton
                    label="Calendar"
                    variant="text"
                    compact
                    onPress={ () => router.push( {
                      pathname: "/(tabs)/schedule",
                      params: { chauffeur: String( chauffeur.id ) },
                    } ) }
                  />
                </View>
              </View>
            );
          } )
        ) }
      </View>

      <BottomSheet
        index={ formOpen ? 0 : -1 }
        onDismiss={ () => {
          setFormOpen( false );
          setForm( EMPTY_FORM );
        } }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetScrollView
          contentContainerStyle={ [
            styles.sheetContent,
            { paddingBottom: 24 },
          ] }
        >
          <Text style={ [ plate, styles.sheetTitle ] }>New chauffeur</Text>

          <FieldLabel label="Name" icon={ { ios: "person", android: "person", web: "person" } } />
          <NativeTextField
            value={ form.name }
            onChangeText={ ( name ) => setForm( ( f ) => ( { ...f, name } ) ) }
            placeholder="Full name"
            autoCapitalize="words"
          />

          <FieldLabel label="Email" icon={ { ios: "envelope", android: "mail", web: "mail" } } />
          <NativeTextField
            value={ form.email }
            onChangeText={ ( email ) => setForm( ( f ) => ( { ...f, email } ) ) }
            placeholder="driver@goldridr.com"
            autoCapitalize="none"
            autoCorrect={ false }
            keyboardType="email-address"
          />

          <FieldLabel label="Phone" icon={ { ios: "phone", android: "call", web: "call" } } />
          <NativeTextField
            value={ form.phone }
            onChangeText={ ( phone ) => setForm( ( f ) => ( { ...f, phone } ) ) }
            placeholder="+1 555 000 0000"
            keyboardType="phone-pad"
          />

          <FieldLabel label="Password" icon={ { ios: "lock", android: "lock", web: "lock" } } />
          <NativeTextField
            value={ form.password }
            onChangeText={ ( password ) => setForm( ( f ) => ( { ...f, password } ) ) }
            placeholder="At least 8 characters"
            secureTextEntry
          />

          <View style={ styles.sheetActions }>
            <NativeButton
              label="Cancel"
              variant="outlined"
              compact
              onPress={ () => {
                setFormOpen( false );
                setForm( EMPTY_FORM );
              } }
            />
            <NativeButton
              label={ isSubmitting ? "Adding" : "Add chauffeur" }
              compact
              disabled={ isSubmitting }
              onPress={ handleCreate }
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </ScrollView>
  );
}

function Stat( { label, value }: { label: string; value: string } ) {
  return (
    <View style={ styles.stat }>
      <Text style={ styles.statValue }>{ value }</Text>
      <Text style={ styles.statLabel }>{ label }</Text>
    </View>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  list: {
    gap: 12,
  },
  alertCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214, 158, 46, 0.35)",
    backgroundColor: "rgba(214, 158, 46, 0.08)",
    borderRadius: 14,
    padding: 14,
  },
  alertText: { flex: 1 },
  alertTitle: { color: colors.ivory, fontSize: 14, fontWeight: "600" },
  alertBody: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chauffeurCard: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    backgroundColor: colors.panel,
    overflow: "hidden",
  },
  loader: {
    marginTop: 48,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
  },
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "600",
  },
  rowCaption: {
    color: colors.muted,
    fontSize: 12,
  },
  stats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  sheetTitle: {
    color: colors.gold,
    marginBottom: 4,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: { color: colors.ivory, fontSize: 14, fontWeight: "700" },
  statLabel: { color: colors.faint, fontSize: 9, textTransform: "uppercase", marginTop: 3 },
  empty: {
    paddingVertical: 56,
    gap: 10,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "600",
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  error: {
    color: colors.red,
  },
} );
