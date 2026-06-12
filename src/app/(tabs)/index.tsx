import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeIcon } from "@/components/native-icon";
import { RideRow } from "@/components/ride-row";
import { RouteLine } from "@/components/route-line";
import { StatusText } from "@/components/status-text";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import { firstName, formatRideDate, formatRideTime } from "@/lib/format";
import type { DriverRide } from "@/lib/types";

const ACTIVE_STATUSES = [ "pending", "confirmed", "accepted" ];

function getInitials( name?: string | null ) {
  const parts = name?.trim().split( /\s+/ ).filter( Boolean ) ?? [];
  if ( parts.length === 0 ) return "GR";
  if ( parts.length === 1 ) return parts[ 0 ]!.slice( 0, 2 ).toUpperCase();
  return `${ parts[ 0 ]![ 0 ] ?? "" }${ parts[ parts.length - 1 ]![ 0 ] ?? "" }`.toUpperCase();
}

export function NextRideCard( { ride }: { ride: DriverRide } ) {
  return (
    <Pressable
      style={ ( { pressed } ) => [ styles.hero, pressed && styles.heroPressed ] }
      accessibilityRole="button"
      accessibilityLabel={ `Open next ride for ${ ride.customerName } at ${ formatRideTime( ride.time ) }` }
      onPress={ () => router.push( `/ride/${ ride.reference }` ) }
    >
      <View style={ styles.heroHeader }>
        <View style={ styles.heroIdentity }>
          <NativeIcon
            name={ { ios: "car.side.fill", android: "directions_car", web: "directions_car" } }
            color={ colors.gold }
            size={ 18 }
          />
          <Text style={ [ plate, styles.heroLabel ] }>Next assignment</Text>
        </View>
        <Text style={ styles.heroReference }>{ ride.reference }</Text>
      </View>

      <View style={ styles.heroDivider } />

      <View style={ styles.heroSchedule }>
        <Text style={ styles.heroTime }>{ formatRideTime( ride.time ) }</Text>
        <View style={ styles.heroMetaRow }>
          <View style={ styles.heroDateRow }>
            <NativeIcon
              name={ { ios: "calendar", android: "calendar_today", web: "calendar_today" } }
              color={ colors.muted }
              size={ 14 }
            />
            <Text style={ styles.heroDate }>{ formatRideDate( ride.date ) }</Text>
          </View>
          <StatusText status={ ride.status } />
        </View>
      </View>

      <View style={ styles.heroRoute }>
        <RouteLine pickup={ ride.pickup } destination={ ride.destination } />
      </View>

      <View style={ styles.heroDivider } />

      <View style={ styles.heroFooter }>
        <View style={ styles.heroRiderGroup }>
          <View style={ styles.heroAvatar }>
            <NativeIcon
              name={ { ios: "person.fill", android: "person", web: "person" } }
              color={ colors.ivory }
              size={ 16 }
            />
          </View>
          <View style={ styles.heroRiderText }>
            <Text style={ styles.heroRider } numberOfLines={ 1 }>
              { ride.customerName }
            </Text>
            <Text style={ styles.heroTripType } numberOfLines={ 1 }>
              { ride.tripType }
              { ride.passengers ? ` · ${ ride.passengers } pax` : "" }
            </Text>
          </View>
        </View>
        <View style={ styles.heroOpen }>
          <NativeIcon
            name={ { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } }
            color={ colors.gold }
            size={ 19 }
          />
        </View>
      </View>
    </Pressable>
  );
}

export function Section( { title, rides, dim }: { title: string; rides: DriverRide[]; dim?: boolean } ) {
  if ( rides.length === 0 ) return null;
  return (
    <View style={ styles.section }>
      <Text style={ [ plate, styles.sectionLabel ] }>{ title }</Text>
      <View style={ styles.cardList }>
        { rides.map( ( ride ) => (
          <RideRow key={ ride.reference } ride={ ride } dim={ dim } />
        ) ) }
      </View>
    </View>
  );
}

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const { token, chauffeur, signOut } = useAuth();
  const [ rides, setRides ] = useState<DriverRide[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ settingsOpen, setSettingsOpen ] = useState( false );

  const loadRides = useCallback( async () => {
    if ( !token ) return;
    try {
      const result = await api.getRides( token );
      setRides( result.rides );
      setError( null );
    } catch ( err ) {
      if ( err instanceof api.ApiError && err.status === 401 ) {
        await signOut();
        return;
      }
      setError( err instanceof Error ? err.message : "Failed to load rides" );
    } finally {
      setIsLoading( false );
    }
  }, [ token, signOut ] );

  useFocusEffect(
    useCallback( () => {
      loadRides();
    }, [ loadRides ] )
  );

  const handleRefresh = async () => {
    setIsRefreshing( true );
    await loadRides();
    setIsRefreshing( false );
  };

  const handleSignOut = useCallback( async () => {
    setSettingsOpen( false );
    await signOut();
  }, [ signOut ] );

  const { next, upcoming, past } = useMemo( () => {
    const active = rides.filter( ( r ) => ACTIVE_STATUSES.includes( r.status ) );
    const done = rides
      .filter( ( r ) => !ACTIVE_STATUSES.includes( r.status ) )
      .reverse();
    return { next: active[ 0 ] ?? null, upcoming: active.slice( 1 ), past: done };
  }, [ rides ] );

  return (
    <View style={ [ styles.container, { paddingTop: insets.top + 12 } ] }>
      <View style={ styles.header }>
        <View style={ styles.topBar }>
          <Image
            // React Native image assets are resolved by Metro through require().
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={ require( "../../../assets/images/goldridr-logo.png" ) }
            style={ styles.logo }
            contentFit="contain"
            alt="Goldridr"
            accessibilityLabel="Goldridr"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={ () => setSettingsOpen( ( open ) => !open ) }
            style={ ( { pressed } ) => [ styles.avatarButton, pressed && styles.avatarPressed ] }
          >
            <View style={ styles.avatar }>
              <Text style={ styles.avatarText }>{ getInitials( chauffeur?.name ) }</Text>
            </View>
          </Pressable>
        </View>
      </View>

      { settingsOpen && (
        <Pressable style={ styles.flyoutOverlay } onPress={ () => setSettingsOpen( false ) }>
          <Pressable
            style={ styles.flyout }
            onPress={ ( event ) => event.stopPropagation() }
          >
            <View style={ styles.flyoutProfile }>
              <View style={ styles.flyoutAvatar }>
                <Text style={ styles.flyoutAvatarText }>{ getInitials( chauffeur?.name ) }</Text>
              </View>
              <View style={ styles.flyoutText }>
                <Text style={ styles.flyoutName } numberOfLines={ 1 }>
                  { chauffeur?.name ?? "Driver" }
                </Text>
                <Text style={ styles.flyoutEmail } numberOfLines={ 1 }>
                  { chauffeur?.email ?? "Signed in" }
                </Text>
              </View>
            </View>

            <View style={ styles.flyoutDivider } />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={ handleSignOut }
              style={ ( { pressed } ) => [ styles.flyoutAction, pressed && styles.flyoutActionPressed ] }
            >
              <NativeIcon
                name={ { ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" } }
                color={ colors.ivory }
                size={ 18 }
              />
              <Text style={ styles.flyoutActionText }>Sign out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      ) }

      <ScrollView
        style={ styles.body }
        contentContainerStyle={ styles.content }
        refreshControl={
          <RefreshControl
            refreshing={ isRefreshing }
            onRefresh={ handleRefresh }
            tintColor={ colors.gold }
          />
        }
      >
        <View style={ styles.greetingBlock }>
          <Text style={ styles.greetingLabel }>Good morning</Text>
          <Text
            style={ styles.greetingName }
            numberOfLines={ 1 }
            adjustsFontSizeToFit
            minimumFontScale={ 0.86 }
          >
            { chauffeur ? firstName( chauffeur.name ) : "driver" }
          </Text>
        </View>

        { error && <Text style={ styles.error }>{ error }</Text> }

        { isLoading ? (
          <ActivityIndicator color={ colors.gold } style={ styles.loader } />
        ) : rides.length === 0 ? (
          <View style={ styles.empty }>
            <NativeIcon
              name={ { ios: "car.side", android: "directions_car", web: "directions_car" } }
              color={ colors.faint }
              size={ 34 }
            />
            <Text style={ styles.emptyTitle }>No rides on your schedule</Text>
            <Text style={ styles.emptyBody }>
              Dispatch assigns rides to you from the Goldridr admin. New
              assignments appear here; pull down to refresh.
            </Text>
          </View>
        ) : (
          <>
            { next && <NextRideCard ride={ next } /> }
            <Section title="Upcoming" rides={ upcoming } />
            <Section title="History" rides={ past } dim />
          </>
        ) }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 18,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 134,
    height: 28,
  },
  avatarButton: {
    borderRadius: 999,
  },
  avatarPressed: {
    opacity: 0.8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  avatarText: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  flyoutOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  flyout: {
    position: "absolute",
    top: 62,
    right: 20,
    width: 230,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  flyoutProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flyoutAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  flyoutAvatarText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  flyoutText: {
    flex: 1,
    gap: 2,
  },
  flyoutName: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "700",
  },
  flyoutEmail: {
    color: colors.muted,
    fontSize: 12,
  },
  flyoutDivider: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  flyoutAction: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.raised,
  },
  flyoutActionPressed: {
    opacity: 0.85,
  },
  flyoutActionText: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
  },
  greetingBlock: {
    paddingTop: 6,
    paddingBottom: 20,
  },
  greetingLabel: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.1,
    textTransform: "none",
  },
  greetingName: {
    color: colors.ivory,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.1,
    lineHeight: 42,
    marginTop: 2,
  },
  loader: {
    marginTop: 48,
  },
  hero: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    marginBottom: 36,
    overflow: "hidden",
  },
  heroPressed: {
    backgroundColor: colors.raised,
    borderColor: colors.hairlineStrong,
  },
  heroLabel: {
    color: colors.gold,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  heroIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  heroReference: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  heroSchedule: {
    gap: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroTime: {
    color: colors.ivory,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  heroDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroDate: {
    color: colors.muted,
    fontSize: 14,
  },
  heroRoute: {
    paddingVertical: 2,
  },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },
  heroRiderGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  heroAvatar: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 11,
  },
  heroRiderText: {
    flex: 1,
    gap: 3,
  },
  heroRider: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "600",
  },
  heroTripType: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "capitalize",
  },
  heroOpen: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 11,
  },
  section: {
    marginBottom: 36,
  },
  sectionLabel: {
    color: colors.faint,
    marginBottom: 12,
  },
  cardList: {
    gap: 12,
  },
  empty: {
    paddingVertical: 56,
    gap: 10,
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
  },
  error: {
    color: colors.red,
    marginBottom: 16,
  },
} );
