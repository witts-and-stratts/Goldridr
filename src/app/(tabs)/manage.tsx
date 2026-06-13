import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SegmentedControl } from "@expo/ui/community/segmented-control";

import { NativePicker } from "@/components/native-controls";
import { NativeIcon } from "@/components/native-icon";
import { RideRow } from "@/components/ride-row";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import type { AdminChauffeur, DriverRide } from "@/lib/types";

type ActiveTab = "overview" | "bookings";

const STATUSES = [ "all", "pending", "confirmed", "accepted", "completed", "cancelled" ] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TRIP_TYPES = [ "all", "airport", "city", "town", "hourly" ] as const;
type TripTypeFilter = (typeof TRIP_TYPES)[number];

const TRIP_TYPE_LABELS: Record<TripTypeFilter, string> = {
  all: "All types",
  airport: "Airport",
  city: "City",
  town: "Town",
  hourly: "Hourly",
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ chauffeur?: string }>();
  const { token, isAdmin, signOut } = useAuth();
  const [ rides, setRides ] = useState<DriverRide[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ activeTab, setActiveTab ] = useState<ActiveTab>(
    params.chauffeur ? "bookings" : "overview"
  );
  const [ query, setQuery ] = useState( "" );
  const [ statusFilter, setStatusFilter ] = useState<StatusFilter>( "all" );
  const [ showAdvanced, setShowAdvanced ] = useState( false );
  const [ tripTypeFilter, setTripTypeFilter ] = useState<TripTypeFilter>( "all" );
  const [ chauffeurs, setChauffeurs ] = useState<AdminChauffeur[]>( [] );
  const [ chauffeurId, setChauffeurId ] = useState( Number( params.chauffeur ) || 0 );
  const [ dateFrom, setDateFrom ] = useState( "" );
  const [ dateTo, setDateTo ] = useState( "" );

  useEffect( () => {
    const nextChauffeurId = Number( params.chauffeur ) || 0;
    setChauffeurId( nextChauffeurId );
    if ( nextChauffeurId ) setActiveTab( "bookings" );
  }, [ params.chauffeur ] );

  const loadRides = useCallback( async () => {
    if ( !token ) return;
    try {
      const [ ridesResult, chauffeursResult ] = await Promise.all( [
        api.getRides( token ),
        api.getAdminChauffeurs( token ),
      ] );
      setRides( ridesResult.rides );
      setChauffeurs( chauffeursResult.chauffeurs );
      setError( null );
    } catch ( err ) {
      if ( err instanceof api.ApiError && err.status === 401 ) {
        await signOut();
        return;
      }
      setError( err instanceof Error ? err.message : "Failed to load bookings" );
    } finally {
      setIsLoading( false );
    }
  }, [ token, signOut ] );

  useFocusEffect(
    useCallback( () => {
      loadRides();
    }, [ loadRides ] )
  );

  const stats = useMemo( () => {
    const byTripType: Record<string, number> = {};
    for ( const r of rides ) {
      const t = r.tripType.toLowerCase();
      byTripType[ t ] = ( byTripType[ t ] ?? 0 ) + 1;
    }
    return {
      total: rides.length,
      pending: rides.filter( ( r ) => r.status === "pending" ).length,
      active: rides.filter( ( r ) => r.status === "confirmed" || r.status === "accepted" ).length,
      completed: rides.filter( ( r ) => r.status === "completed" ).length,
      cancelled: rides.filter( ( r ) => r.status === "cancelled" ).length,
      bookedValue: rides
        .filter( r => ![ "cancelled", "rejected" ].includes( r.status ) )
        .reduce( ( total, r ) => total + ( Number.parseFloat( r.estimatedPrice ?? "0" ) || 0 ), 0 ),
      byTripType,
    };
  }, [ rides ] );

  const filtered = useMemo( () => {
    const q = query.trim().toLowerCase();
    return rides.filter( ( r ) => {
      if ( statusFilter !== "all" && r.status !== statusFilter ) return false;
      if ( tripTypeFilter !== "all" && r.tripType.toLowerCase() !== tripTypeFilter ) return false;
      if ( chauffeurId !== 0 && r.chauffeurId !== chauffeurId ) return false;
      if ( dateFrom && r.date < dateFrom ) return false;
      if ( dateTo && r.date > dateTo ) return false;
      if ( !q ) return true;
      return (
        r.reference.toLowerCase().includes( q ) ||
        r.customerName.toLowerCase().includes( q ) ||
        ( r.pickup ?? "" ).toLowerCase().includes( q ) ||
        ( r.destination ?? "" ).toLowerCase().includes( q )
      );
    } );
  }, [ rides, query, statusFilter, tripTypeFilter, chauffeurId, dateFrom, dateTo ] );

  if ( !isAdmin ) return <Redirect href="/" />;

  const handleDelete = ( ride: DriverRide ) => {
    Alert.alert(
      "Delete booking",
      `Permanently delete booking ${ ride.reference }? The rider is not notified automatically.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if ( !token ) return;
            try {
              await api.deleteAdminBooking( token, ride.reference );
              setRides( ( current ) => current.filter( ( r ) => r.reference !== ride.reference ) );
              setError( null );
            } catch ( err ) {
              setError( err instanceof Error ? err.message : "Failed to delete booking" );
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing( true );
    await loadRides();
    setIsRefreshing( false );
  };

  const hasActiveFilters = statusFilter !== "all"
    || tripTypeFilter !== "all"
    || chauffeurId !== 0
    || dateFrom.length > 0
    || dateTo.length > 0
    || query.trim().length > 0;

  const jumpToBookings = ( filter: StatusFilter ) => {
    setStatusFilter( filter );
    setActiveTab( "bookings" );
  };

  return (
    <View style={ [ styles.container, { paddingTop: insets.top + 12 } ] }>
      { /* Header */ }
      <View style={ styles.headerBlock }>
        <Text style={ [ plate, styles.kicker ] }>Dispatcher console</Text>
        <Text style={ styles.heading }>Bookings</Text>
      </View>

      { /* Tab switcher */ }
      <SegmentedControl
        values={ [ "Overview", "Bookings" ] }
        selectedIndex={ activeTab === "overview" ? 0 : 1 }
        onValueChange={ ( value ) => setActiveTab( value === "Overview" ? "overview" : "bookings" ) }
        appearance="dark"
        tintColor={ colors.gold }
        style={ styles.segmented }
      />

      { /* ── OVERVIEW TAB ── */ }
      { activeTab === "overview" && (
        <ScrollView
          style={ styles.body }
          contentContainerStyle={ [ styles.overviewContent, { paddingBottom: insets.bottom + 70 } ] }
          refreshControl={
            <RefreshControl refreshing={ isRefreshing } onRefresh={ handleRefresh } tintColor={ colors.gold } />
          }
        >
          { error && <Text style={ styles.error }>{ error }</Text> }

          { isLoading ? (
            <ActivityIndicator color={ colors.gold } style={ styles.loader } />
          ) : (
            <>
              { /* Status breakdown */ }
              <Text style={ [ plate, styles.sectionTitle ] }>Status breakdown</Text>
              <View style={ styles.statGrid }>
                <View style={ [ styles.statCard, styles.statCardWide ] }>
                  <Text style={ styles.statValue }>{ stats.total }</Text>
                  <Text style={ styles.statLabel }>Total bookings</Text>
                </View>
                <Pressable
                  style={ ( { pressed } ) => [ styles.statCard, pressed && styles.statCardPressed ] }
                  onPress={ () => jumpToBookings( "pending" ) }
                >
                  <Text style={ [ styles.statValue, { color: colors.amber } ] }>{ stats.pending }</Text>
                  <Text style={ styles.statLabel }>Pending</Text>
                </Pressable>
                <Pressable
                  style={ ( { pressed } ) => [ styles.statCard, pressed && styles.statCardPressed ] }
                  onPress={ () => jumpToBookings( "confirmed" ) }
                >
                  <Text style={ [ styles.statValue, { color: colors.ivory } ] }>{ stats.active }</Text>
                  <Text style={ styles.statLabel }>Active</Text>
                </Pressable>
                <Pressable
                  style={ ( { pressed } ) => [ styles.statCard, pressed && styles.statCardPressed ] }
                  onPress={ () => jumpToBookings( "completed" ) }
                >
                  <Text style={ [ styles.statValue, { color: colors.gold } ] }>{ stats.completed }</Text>
                  <Text style={ styles.statLabel }>Completed</Text>
                </Pressable>
                <Pressable
                  style={ ( { pressed } ) => [ styles.statCard, pressed && styles.statCardPressed ] }
                  onPress={ () => jumpToBookings( "cancelled" ) }
                >
                  <Text style={ [ styles.statValue, { color: colors.red } ] }>{ stats.cancelled }</Text>
                  <Text style={ styles.statLabel }>Cancelled</Text>
                </Pressable>
                <View style={ [ styles.statCard, styles.statCardWide ] }>
                  <Text style={ styles.statValue }>
                    { new Intl.NumberFormat( "en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    } ).format( stats.bookedValue ) }
                  </Text>
                  <Text style={ styles.statLabel }>Booked value</Text>
                </View>
              </View>

              { /* Trip type breakdown */ }
              { Object.keys( stats.byTripType ).length > 0 && (
                <>
                  <Text style={ [ plate, styles.sectionTitle ] }>By trip type</Text>
                  <View style={ styles.tripTypeList }>
                    { Object.entries( stats.byTripType )
                      .sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
                      .map( ( [ type, count ] ) => (
                        <View key={ type } style={ styles.tripTypeRow }>
                          <Text style={ styles.tripTypeName }>{ type.charAt( 0 ).toUpperCase() + type.slice( 1 ) }</Text>
                          <View style={ styles.tripTypeBar }>
                            <View
                              style={ [
                                styles.tripTypeBarFill,
                                { width: `${ Math.round( ( count / stats.total ) * 100 ) }%` },
                              ] }
                            />
                          </View>
                          <Text style={ styles.tripTypeCount }>{ count }</Text>
                        </View>
                      ) ) }
                  </View>
                </>
              ) }

              { rides.length > 0 && (
                <>
                  <Text style={ [ plate, styles.sectionTitle ] }>Recent bookings</Text>
                  <View>
                    { [ ...rides ]
                      .sort( ( a, b ) => `${ b.date } ${ b.time }`.localeCompare( `${ a.date } ${ a.time }` ) )
                      .slice( 0, 6 )
                      .map( ride => <RideRow key={ ride.reference } ride={ ride } flat /> ) }
                  </View>
                </>
              ) }

              { /* Quick actions */ }
              <Text style={ [ plate, styles.sectionTitle ] }>Quick actions</Text>
              <View style={ styles.quickActions }>
                { ( [
                  { href: "/manage/chauffeurs", label: "Chauffeurs", icon: { ios: "person.2.fill", android: "group", web: "group" } },
                  { href: "/manage/discounts", label: "Discounts", icon: { ios: "tag.fill", android: "sell", web: "sell" } },
                  { href: "/manage/payments", label: "Payments", icon: { ios: "creditcard.fill", android: "credit_card", web: "credit_card" } },
                  { href: "/manage/settings", label: "Settings", icon: { ios: "gearshape.fill", android: "settings", web: "settings" } },
                  { href: "/manage/communications", label: "Messages", icon: { ios: "message.fill", android: "chat", web: "chat" } },
                  { href: "/manage/testing", label: "Testing", icon: { ios: "testtube.2", android: "science", web: "science" } },
                ] as const ).map( ( action ) => (
                  <Pressable
                    key={ action.href }
                    onPress={ () => router.push( action.href ) }
                    style={ ( { pressed } ) => [ styles.quickAction, pressed && styles.quickActionPressed ] }
                    accessibilityRole="button"
                    accessibilityLabel={ action.label }
                  >
                    <NativeIcon name={ action.icon } color={ colors.gold } size={ 20 } />
                    <Text style={ styles.quickActionLabel }>{ action.label }</Text>
                  </Pressable>
                ) ) }
              </View>
            </>
          ) }
        </ScrollView>
      ) }

      { /* ── BOOKINGS TAB ── */ }
      { activeTab === "bookings" && (
        <>
          { /* Search bar */ }
          <View style={ styles.searchBar }>
            <NativeIcon
              name={ { ios: "magnifyingglass", android: "search", web: "search" } }
              color={ colors.faint }
              size={ 16 }
            />
            <TextInput
              style={ styles.searchInput }
              placeholder="Name, reference, pickup, destination…"
              placeholderTextColor={ colors.faint }
              value={ query }
              onChangeText={ setQuery }
              returnKeyType="search"
              autoCorrect={ false }
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            <Pressable
              onPress={ () => setShowAdvanced( ( v ) => !v ) }
              style={ ( { pressed } ) => [ styles.filterToggle, pressed && styles.filterTogglePressed ] }
              accessibilityLabel="Toggle advanced filters"
            >
              <NativeIcon
                name={ { ios: "slider.horizontal.3", android: "tune", web: "tune" } }
                color={ showAdvanced ? colors.gold : colors.faint }
                size={ 16 }
              />
            </Pressable>
          </View>

          { /* Status chips */ }
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={ false }
            style={ styles.chipScroll }
            contentContainerStyle={ styles.chipRow }
          >
            { STATUSES.map( ( s ) => (
              <Pressable
                key={ s }
                onPress={ () => setStatusFilter( s ) }
                style={ [ styles.chip, statusFilter === s && styles.chipActive ] }
              >
                <Text style={ [ styles.chipText, statusFilter === s && styles.chipTextActive ] }>
                  { STATUS_LABELS[ s ] }
                </Text>
              </Pressable>
            ) ) }
          </ScrollView>

          { /* Advanced filters */ }
          { showAdvanced && (
            <View style={ styles.advancedPanel }>
              <Text style={ [ plate, styles.advancedLabel ] }>Chauffeur</Text>
              <NativePicker
                options={ [
                  { label: "All chauffeurs", value: 0 },
                  ...chauffeurs.map( chauffeur => ( { label: chauffeur.name, value: chauffeur.id } ) ),
                ] }
                selectedValue={ chauffeurId }
                onValueChange={ setChauffeurId }
              />
              <Text style={ [ plate, styles.advancedLabel ] }>Trip type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={ false }
                style={ styles.chipScroll }
                contentContainerStyle={ styles.chipRow }
              >
                { TRIP_TYPES.map( ( t ) => (
                  <Pressable
                    key={ t }
                    onPress={ () => setTripTypeFilter( t ) }
                    style={ [ styles.chip, tripTypeFilter === t && styles.chipActive ] }
                  >
                    <Text style={ [ styles.chipText, tripTypeFilter === t && styles.chipTextActive ] }>
                      { TRIP_TYPE_LABELS[ t ] }
                    </Text>
                  </Pressable>
                ) ) }
              </ScrollView>
              <Text style={ [ plate, styles.advancedLabel ] }>Date range</Text>
              <View style={ styles.dateRange }>
                <TextInput
                  value={ dateFrom }
                  onChangeText={ setDateFrom }
                  placeholder="From YYYY-MM-DD"
                  placeholderTextColor={ colors.faint }
                  style={ styles.dateInput }
                  autoCapitalize="none"
                />
                <TextInput
                  value={ dateTo }
                  onChangeText={ setDateTo }
                  placeholder="To YYYY-MM-DD"
                  placeholderTextColor={ colors.faint }
                  style={ styles.dateInput }
                  autoCapitalize="none"
                />
              </View>
              { hasActiveFilters && (
                <Pressable
                  onPress={ () => {
                    setQuery( "" );
                    setStatusFilter( "all" );
                    setTripTypeFilter( "all" );
                    setChauffeurId( 0 );
                    setDateFrom( "" );
                    setDateTo( "" );
                  } }
                  style={ styles.clearFilters }
                >
                  <NativeIcon
                    name={ { ios: "xmark.circle.fill", android: "cancel", web: "cancel" } }
                    color={ colors.faint }
                    size={ 14 }
                  />
                  <Text style={ styles.clearFiltersText }>Clear filters</Text>
                </Pressable>
              ) }
            </View>
          ) }

          <ScrollView
            style={ styles.body }
            contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 70 } ] }
            refreshControl={
              <RefreshControl refreshing={ isRefreshing } onRefresh={ handleRefresh } tintColor={ colors.gold } />
            }
          >
            { error && <Text style={ styles.error }>{ error }</Text> }

            { isLoading ? (
              <ActivityIndicator color={ colors.gold } style={ styles.loader } />
            ) : filtered.length === 0 ? (
              <View style={ styles.empty }>
                <NativeIcon
                  name={ { ios: "calendar.badge.checkmark", android: "event_available", web: "event_available" } }
                  color={ colors.faint }
                  size={ 34 }
                />
                <Text style={ styles.emptyTitle }>
                  { hasActiveFilters ? "No matching bookings" : "No bookings yet" }
                </Text>
                <Text style={ styles.emptyBody }>
                  { hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "Every booking across the fleet appears here as riders confirm trips; pull down to refresh." }
                </Text>
              </View>
            ) : (
              <>
                <Text style={ [ plate, styles.resultCount ] }>
                  { filtered.length } { filtered.length === 1 ? "booking" : "bookings" }
                </Text>
                { filtered.map( ( ride ) => (
                  <ReanimatedSwipeable
                    key={ ride.reference }
                    friction={ 2 }
                    rightThreshold={ 40 }
                    overshootRight={ false }
                    renderRightActions={ ( _progress, _translation, methods ) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={ `Delete booking ${ ride.reference }` }
                        onPress={ () => {
                          methods.close();
                          handleDelete( ride );
                        } }
                        style={ ( { pressed } ) => [
                          styles.deleteAction,
                          pressed && styles.deleteActionPressed,
                        ] }
                      >
                        <NativeIcon
                          name={ { ios: "trash.fill", android: "delete", web: "delete" } }
                          color={ colors.ivory }
                          size={ 20 }
                        />
                        <Text style={ styles.deleteActionLabel }>Delete</Text>
                      </Pressable>
                    ) }
                  >
                    <RideRow ride={ ride } flat />
                  </ReanimatedSwipeable>
                ) ) }
              </>
            ) }
          </ScrollView>
        </>
      ) }
    </View>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Matches the cardFlat footprint (marginBottom 12, radius 14) so the
  // revealed action lines up with the card it belongs to.
  deleteAction: {
    width: 84,
    marginBottom: 12,
    marginLeft: 12,
    borderRadius: 14,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  deleteActionPressed: {
    opacity: 0.85,
  },
  deleteActionLabel: {
    color: colors.ivory,
    fontSize: 12,
    fontWeight: "600",
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 4,
  },
  kicker: {
    color: colors.gold,
  },
  heading: {
    color: colors.ivory,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.1,
    lineHeight: 42,
  },

  segmented: {
    marginHorizontal: 20,
    marginBottom: 16,
  },

  // Overview
  overviewContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: colors.faint,
    marginBottom: 12,
    marginTop: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    gap: 4,
  },
  statCardWide: {
    minWidth: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statCardPressed: {
    backgroundColor: colors.raised,
    borderColor: colors.hairlineStrong,
  },
  statValue: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  statLabel: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Trip type breakdown
  tripTypeList: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    marginBottom: 28,
  },
  tripTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  tripTypeName: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "500",
    width: 64,
  },
  tripTypeBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.raised,
    borderRadius: 3,
    overflow: "hidden",
  },
  tripTypeBarFill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: 3,
    opacity: 0.7,
  },
  tripTypeCount: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    width: 28,
    textAlign: "right",
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
  },
  quickActionPressed: {
    backgroundColor: colors.raised,
    borderColor: colors.hairlineStrong,
  },
  quickActionLabel: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
  },

  // Bookings tab
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.ivory,
    fontSize: 15,
    padding: 0,
  },
  filterToggle: {
    padding: 4,
    marginRight: -2,
  },
  filterTogglePressed: {
    opacity: 0.7,
  },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(194, 158, 102, 0.12)",
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.gold,
    fontWeight: "600",
  },
  advancedPanel: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  advancedLabel: {
    color: colors.faint,
  },
  dateRange: {
    flexDirection: "row",
    gap: 10,
  },
  dateInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    backgroundColor: colors.panel,
    color: colors.ivory,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  clearFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  clearFiltersText: {
    color: colors.faint,
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  resultCount: {
    color: colors.faint,
    marginBottom: 12,
  },
  loader: {
    marginTop: 48,
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
