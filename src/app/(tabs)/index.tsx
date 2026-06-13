import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import airplaneIcon from "../../../assets/images/ride-types/airplane.svg";
import cityIcon from "../../../assets/images/ride-types/city.svg";
import clockIcon from "../../../assets/images/ride-types/clock.svg";
import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import { RideRow } from "@/components/ride-row";
import { RouteLine } from "@/components/route-line";
import { StatusText } from "@/components/status-text";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import { firstName, formatRideDate, formatRideTime } from "@/lib/format";
import type { DriverRide } from "@/lib/types";

const ACTIVE_STATUSES = [ "pending", "confirmed", "accepted" ];
const TRIP_TYPE_ICONS: Record<string, number> = {
  airport: airplaneIcon,
  city: cityIcon,
  town: cityIcon,
  hourly: clockIcon,
};

interface ManageAction {
  href:
    | "/manage/chauffeurs"
    | "/manage/discounts"
    | "/manage/payments"
    | "/manage/settings"
    | "/manage/communications"
    | "/manage/testing";
  title: string;
  icon: NativeSymbolName;
}

interface SidebarAction {
  label: string;
  icon: NativeSymbolName;
  badge?: number;
  onPress: () => void;
}

const MANAGE_ACTIONS: ManageAction[] = [
  {
    href: "/manage/chauffeurs",
    title: "Chauffeurs",
    icon: { ios: "person.2", android: "group", web: "group" },
  },
  {
    href: "/manage/discounts",
    title: "Discount codes",
    icon: { ios: "tag", android: "sell", web: "sell" },
  },
  {
    href: "/manage/payments",
    title: "Payments",
    icon: { ios: "creditcard", android: "credit_card", web: "credit_card" },
  },
  {
    href: "/manage/settings",
    title: "Settings",
    icon: { ios: "gearshape", android: "settings", web: "settings" },
  },
  {
    href: "/manage/communications",
    title: "Communications",
    icon: { ios: "message", android: "chat", web: "chat" },
  },
  {
    href: "/manage/testing",
    title: "Testing tools",
    icon: { ios: "testtube.2", android: "science", web: "science" },
  },
];

function getInitials( name?: string | null ) {
  const parts = name?.trim().split( /\s+/ ).filter( Boolean ) ?? [];
  if ( parts.length === 0 ) return "GR";
  if ( parts.length === 1 ) return parts[ 0 ]!.slice( 0, 2 ).toUpperCase();
  return `${ parts[ 0 ]![ 0 ] ?? "" }${ parts[ parts.length - 1 ]![ 0 ] ?? "" }`.toUpperCase();
}

function AccountSidebar( {
  visible,
  displayName,
  actions,
  onClose,
  onSignOut,
}: {
  visible: boolean;
  displayName: string | null;
  actions: SidebarAction[];
  onClose: () => void;
  onSignOut: () => void;
} ) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min( width * 0.86, 380 );
  const [ progress ] = useState( () => new Animated.Value( 0 ) );

  useEffect( () => {
    if ( !visible ) return;
    progress.setValue( 0 );
    Animated.timing( progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out( Easing.cubic ),
      useNativeDriver: true,
    } ).start();
  }, [ visible, progress ] );

  const close = useCallback( () => {
    Animated.timing( progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in( Easing.cubic ),
      useNativeDriver: true,
    } ).start( ( { finished } ) => {
      if ( finished ) onClose();
    } );
  }, [ onClose, progress ] );

  const translateX = progress.interpolate( {
    inputRange: [ 0, 1 ],
    outputRange: [ -panelWidth, 0 ],
  } );

  return (
    <Modal
      visible={ visible }
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={ close }
    >
      <View style={ styles.sidebarModal }>
        <Animated.View style={ [ styles.sidebarBackdrop, { opacity: progress } ] }>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close account menu"
            onPress={ close }
            style={ StyleSheet.absoluteFill }
          />
        </Animated.View>

        <Animated.View
          style={ [
            styles.sidebar,
            {
              width: panelWidth,
              paddingTop: insets.top + 12,
              transform: [ { translateX } ],
            },
          ] }
        >
          <View style={ styles.sidebarHeader }>
            <View style={ styles.sidebarProfile }>
              <View style={ styles.sidebarAvatar }>
                <Text style={ styles.sidebarAvatarText }>{ getInitials( displayName ) }</Text>
              </View>
              <View style={ styles.sidebarProfileText }>
                <Text style={ styles.sidebarName } numberOfLines={ 1 }>
                  { displayName ?? "Chauffeur" }
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close account menu"
              onPress={ close }
              style={ ( { pressed } ) => [
                styles.sidebarCloseButton,
                pressed && styles.sidebarCloseButtonPressed,
              ] }
            >
              <NativeIcon
                name={ { ios: "chevron.left", android: "chevron_left", web: "chevron_left" } }
                color={ colors.muted }
                size={ 22 }
              />
            </Pressable>
          </View>

          <View style={ styles.sidebarActions }>
            { actions.map( ( action ) => (
              <Pressable
                key={ action.label }
                accessibilityRole="button"
                accessibilityLabel={ action.label }
                onPress={ action.onPress }
                style={ ( { pressed } ) => [
                  styles.sidebarAction,
                  pressed && styles.sidebarActionPressed,
                ] }
              >
                <View style={ styles.sidebarActionIcon }>
                  <NativeIcon
                    name={ action.icon }
                    color={ colors.muted }
                    size={ 21 }
                  />
                </View>
                <Text style={ styles.sidebarActionLabel }>
                  { action.label }
                </Text>
                { action.badge ? (
                  <View style={ styles.sidebarActionBadge }>
                    <Text style={ styles.sidebarActionBadgeText }>
                      { action.badge > 99 ? "99+" : action.badge }
                    </Text>
                  </View>
                ) : null }
              </Pressable>
            ) ) }
          </View>

          <View
            style={ [
              styles.sidebarFooter,
              { paddingBottom: Math.max( insets.bottom, 12 ) },
            ] }
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={ onSignOut }
              style={ ( { pressed } ) => [
                styles.sidebarAction,
                pressed && styles.sidebarActionPressed,
              ] }
            >
              <View style={ styles.sidebarActionIcon }>
                <NativeIcon
                  name={ { ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" } }
                  color={ colors.muted }
                  size={ 21 }
                />
              </View>
              <Text style={ styles.sidebarActionLabel }>Sign out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function NextRideCard( { ride }: { ride: DriverRide } ) {
  const tripTypeIcon = TRIP_TYPE_ICONS[ ride.tripType.toLowerCase() ];

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
          { tripTypeIcon && (
            <Image
              source={ tripTypeIcon }
              style={ styles.heroTripIcon }
              contentFit="contain"
              alt={ `${ ride.tripType } ride` }
              accessibilityLabel={ `${ ride.tripType } ride` }
            />
          ) }
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
          <RideRow key={ ride.reference } ride={ ride } dim={ dim } flat />
        ) ) }
      </View>
    </View>
  );
}

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const { token, chauffeur, user, isAdmin, signOut } = useAuth();
  const displayName = chauffeur?.name ?? user?.name ?? null;
  const [ rides, setRides ] = useState<DriverRide[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ settingsOpen, setSettingsOpen ] = useState( false );
  const [ unreadCount, setUnreadCount ] = useState( 0 );

  // Badge is best-effort; ride loading surfaces the real connectivity errors.
  const loadUnreadCount = useCallback( async () => {
    if ( !token ) return;
    try {
      const result = await api.getNotifications( token, { limit: 1 } );
      setUnreadCount( result.unreadCount );
    } catch {
      // Keep the last known count.
    }
  }, [ token ] );

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
      loadUnreadCount();
    }, [ loadRides, loadUnreadCount ] )
  );

  const handleRefresh = async () => {
    setIsRefreshing( true );
    await Promise.all( [ loadRides(), loadUnreadCount() ] );
    setIsRefreshing( false );
  };

  const handleSignOut = useCallback( async () => {
    setSettingsOpen( false );
    await signOut();
  }, [ signOut ] );

  const sidebarActions = useMemo( (): SidebarAction[] => [
    {
      label: "Notifications",
      icon: { ios: "bell", android: "notifications_none", web: "notifications_none" },
      badge: unreadCount,
      onPress: () => {
        setSettingsOpen( false );
        router.push( "/notifications" );
      },
    },
    ...( isAdmin ? MANAGE_ACTIONS.map( ( action ) => ( {
      label: action.title,
      icon: action.icon,
      onPress: () => {
        setSettingsOpen( false );
        router.push( action.href );
      },
    } ) ) : [] ),
  ], [ isAdmin, unreadCount ] );

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
            accessibilityLabel="Open account menu"
            onPress={ () => setSettingsOpen( ( open ) => !open ) }
            style={ ( { pressed } ) => [ styles.avatarButton, pressed && styles.avatarPressed ] }
          >
            <View style={ styles.avatar }>
              <Text style={ styles.avatarText }>{ getInitials( displayName ) }</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <AccountSidebar
        visible={ settingsOpen }
        displayName={ displayName }
        actions={ sidebarActions }
        onClose={ () => setSettingsOpen( false ) }
        onSignOut={ handleSignOut }
      />

      <ScrollView
        style={ styles.body }
        contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 70 } ] }
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
            { displayName ? firstName( displayName ) : "chauffeur" }
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
            <Text style={ styles.emptyTitle }>
              { isAdmin ? "No bookings yet" : "No rides on your schedule" }
            </Text>
            <Text style={ styles.emptyBody }>
              { isAdmin
                ? "Every booking across the fleet appears here as riders confirm trips; pull down to refresh."
                : "Dispatch assigns rides to you from the Goldridr admin. New assignments appear here; pull down to refresh." }
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
  sidebarModal: {
    flex: 1,
  },
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  sidebar: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRightWidth: 1,
    borderRightColor: colors.hairlineStrong,
    paddingHorizontal: 20,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 30,
  },
  sidebarCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  sidebarCloseButtonPressed: {
    backgroundColor: colors.raised,
  },
  sidebarActions: {
    flex: 1,
    gap: 2,
  },
  sidebarAction: {
    minHeight: 54,
    borderRadius: 10,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sidebarActionPressed: {
    backgroundColor: colors.raised,
  },
  sidebarActionIcon: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarActionLabel: {
    flex: 1,
    color: colors.ivory,
    fontSize: 16,
    fontWeight: "500",
  },
  sidebarActionBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
  },
  sidebarActionBadgeText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: "700",
  },
  sidebarProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sidebarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  sidebarAvatarText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  sidebarProfileText: {
    flex: 1,
  },
  sidebarName: {
    color: colors.ivory,
    fontSize: 15,
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
    flexWrap: "wrap",
  },
  heroTripIcon: {
    width: 24,
    height: 24,
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
    borderRadius: 999,
  },
  section: {
    marginBottom: 36,
  },
  sectionLabel: {
    color: colors.faint,
    marginBottom: 12,
  },
  cardList: {
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
