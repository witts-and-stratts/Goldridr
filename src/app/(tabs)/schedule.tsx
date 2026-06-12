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

import SegmentedControl from "@expo/ui/community/segmented-control";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AgendaList } from "@/components/agenda-list";
import { BlockRow } from "@/components/block-row";
import { MonthGrid, type DayMarkers } from "@/components/month-grid";
import { NativeButton, NativeSwitch, NativeTextField } from "@/components/native-controls";
import { NativeIconButton } from "@/components/native-icon";
import { RideRow } from "@/components/ride-row";
import { WeekTimeline } from "@/components/week-timeline";
import { YearGrid } from "@/components/year-grid";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import { formatRideDate } from "@/lib/format";
import {
  addDaysKey,
  blocksForDate,
  dateKey,
  monthGrid,
  monthTitle,
  parseKey,
  ridesForDate,
  weekDays,
  weekTitle,
} from "@/lib/schedule";
import type { BlockedSlot, DriverRide } from "@/lib/types";

type ScheduleView = "day" | "week" | "month" | "year" | "agenda";

const VIEWS: { value: ScheduleView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "agenda", label: "Agenda" },
];

const HIDDEN_STATUSES = [ "cancelled", "rejected" ];

const DURATIONS = [
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
  { label: "8h", minutes: 480 },
];

const REPEATS = [
  { label: "Once", value: "none" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Weekends", value: "weekends" },
];

interface BlockFormProps {
  date: string;
  isSaving: boolean;
  onSubmit: ( block: {
    title: string;
    isFullDay: boolean;
    time: string;
    duration: number;
    recurring: string;
  } ) => void;
}

export function BlockForm( { date, isSaving, onSubmit }: BlockFormProps ) {
  const [ title, setTitle ] = useState( "" );
  const [ isFullDay, setIsFullDay ] = useState( true );
  const [ time, setTime ] = useState( "09:00" );
  const [ duration, setDuration ] = useState( 120 );
  const [ recurring, setRecurring ] = useState( "none" );

  const valid = title.trim().length > 0 && ( isFullDay || /^\d{1,2}:\d{2}$/.test( time ) );

  return (
    <View style={ styles.form }>
      <NativeTextField
        value={ title }
        onChangeText={ setTitle }
        placeholder="Reason (e.g. Day off)"
        returnKeyType="next"
      />

      <View style={ styles.formRow }>
        <Text style={ styles.formRowLabel }>All day</Text>
        <NativeSwitch
          value={ isFullDay }
          onValueChange={ setIsFullDay }
        />
      </View>

      { !isFullDay && (
        <>
          <View style={ styles.formRow }>
            <Text style={ styles.formRowLabel }>Starts at</Text>
            <View style={ styles.timeInput }>
              <NativeTextField
                value={ time }
                onChangeText={ setTime }
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                textAlign="center"
              />
            </View>
          </View>
          <SegmentedControl
            values={ DURATIONS.map( ( item ) => item.label ) }
            selectedIndex={ DURATIONS.findIndex( ( item ) => item.minutes === duration ) }
            onChange={ ( event ) => {
              setDuration( DURATIONS[ event.nativeEvent.selectedSegmentIndex ].minutes );
            } }
            appearance="dark"
            tintColor={ colors.gold }
          />
        </>
      ) }

      <SegmentedControl
        values={ REPEATS.map( ( item ) => item.label ) }
        selectedIndex={ REPEATS.findIndex( ( item ) => item.value === recurring ) }
        onChange={ ( event ) => {
          setRecurring( REPEATS[ event.nativeEvent.selectedSegmentIndex ].value );
        } }
        appearance="dark"
        tintColor={ colors.gold }
      />

      <NativeButton
        label={ isSaving ? "Blocking time" : `Block ${ formatRideDate( date ) }` }
        disabled={ !valid || isSaving }
        onPress={ () => {
          const normalized = time.length === 4 ? `0${ time }` : time;
          onSubmit( { title: title.trim(), isFullDay, time: normalized, duration, recurring } );
        } }
      />
    </View>
  );
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { token, chauffeur, signOut } = useAuth();
  const now = new Date();
  const todayKey = dateKey( now );
  const [ view, setView ] = useState<ScheduleView>( "month" );
  const [ year, setYear ] = useState( now.getFullYear() );
  const [ month, setMonth ] = useState( now.getMonth() );
  const [ selected, setSelected ] = useState( todayKey );
  const [ rides, setRides ] = useState<DriverRide[]>( [] );
  const [ blocks, setBlocks ] = useState<BlockedSlot[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ isSaving, setIsSaving ] = useState( false );
  const [ formOpen, setFormOpen ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const [ ridesResult, blocksResult ] = await Promise.all( [
        api.getRides( token ),
        api.getBlockedSlots( token ),
      ] );
      setRides( ridesResult.rides );
      setBlocks( blocksResult.blocks );
      setError( null );
    } catch ( err ) {
      if ( err instanceof api.ApiError && err.status === 401 ) {
        await signOut();
        return;
      }
      setError( err instanceof Error ? err.message : "Failed to load schedule" );
    } finally {
      setIsLoading( false );
    }
  }, [ token, signOut ] );

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

  const visibleRides = useMemo(
    () => rides.filter( ( r ) => !HIDDEN_STATUSES.includes( r.status ) ),
    [ rides ]
  );

  // ── Month data ──────────────────────────────────────────────────────────
  const cells = useMemo( () => monthGrid( year, month ), [ year, month ] );

  const markersFor = useCallback( ( keys: string[] ) => {
    const map: Record<string, DayMarkers> = {};
    for ( const key of keys ) {
      const dayRides = ridesForDate( visibleRides, key );
      const dayBlocks = blocksForDate( blocks, key );
      if ( dayRides.length || dayBlocks.length ) {
        map[ key ] = { rides: dayRides.length, blocked: dayBlocks.length > 0 };
      }
    }
    return map;
  }, [ visibleRides, blocks ] );

  const monthMarkers = useMemo(
    () => markersFor( cells.map( ( c ) => c.key ) ),
    [ cells, markersFor ]
  );

  // ── Week data ───────────────────────────────────────────────────────────
  const week = useMemo( () => weekDays( selected ), [ selected ] );

  const weekData = useMemo( () => {
    const ridesByDay: Record<string, DriverRide[]> = {};
    const blocksByDay: Record<string, BlockedSlot[]> = {};
    for ( const key of week ) {
      ridesByDay[ key ] = ridesForDate( visibleRides, key );
      blocksByDay[ key ] = blocksForDate( blocks, key );
    }
    return { ridesByDay, blocksByDay };
  }, [ week, visibleRides, blocks ] );

  // ── Year data ───────────────────────────────────────────────────────────
  const yearMarkers = useMemo( () => {
    if ( view !== "year" ) return {};
    const keys: string[] = [];
    for ( let m = 0; m < 12; m++ ) {
      for ( const cell of monthGrid( year, m ) ) {
        if ( cell.inMonth ) keys.push( cell.key );
      }
    }
    return markersFor( keys );
  }, [ view, year, markersFor ] );

  // ── Selected-day agenda (month view) ────────────────────────────────────
  const dayRides = useMemo(
    () => ridesForDate( rides, selected ).sort( ( a, b ) => a.time.localeCompare( b.time ) ),
    [ rides, selected ]
  );
  const dayBlocks = useMemo( () => blocksForDate( blocks, selected ), [ blocks, selected ] );

  // ── Navigation ──────────────────────────────────────────────────────────
  const syncToKey = ( key: string ) => {
    const d = parseKey( key );
    setSelected( key );
    setYear( d.getFullYear() );
    setMonth( d.getMonth() );
  };

  const shiftPeriod = ( delta: number ) => {
    if ( view === "month" ) {
      const d = new Date( year, month + delta, 1 );
      setYear( d.getFullYear() );
      setMonth( d.getMonth() );
    } else if ( view === "year" ) {
      setYear( year + delta );
    } else if ( view === "day" ) {
      syncToKey( addDaysKey( selected, delta ) );
    } else {
      syncToKey( addDaysKey( selected, 7 * delta ) );
    }
  };

  const goToday = () => {
    syncToKey( todayKey );
  };

  // Mirrors the admin: tapping a day in the year or week headers opens day view
  const openDay = ( key: string ) => {
    syncToKey( key );
    setFormOpen( false );
    setView( "day" );
  };

  const title = view === "month"
    ? monthTitle( year, month )
    : view === "year"
      ? String( year )
      : view === "week"
        ? weekTitle( selected )
        : view === "day"
          ? parseKey( selected ).toLocaleDateString( "en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          } )
          : selected === todayKey ? "From today" : `From ${ formatRideDate( selected ) }`;

  // ── Mutations ───────────────────────────────────────────────────────────
  const submitBlock = async ( form: {
    title: string;
    isFullDay: boolean;
    time: string;
    duration: number;
    recurring: string;
  } ) => {
    if ( !token ) return;
    setIsSaving( true );
    try {
      const result = await api.createBlockedSlot( token, { ...form, date: selected } );
      setBlocks( ( prev ) => [ result.block, ...prev ] );
      setFormOpen( false );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to block time" );
    } finally {
      setIsSaving( false );
    }
  };

  const removeBlock = ( block: BlockedSlot ) => {
    Alert.alert( "Remove block", `Remove "${ block.title }"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if ( !token ) return;
          try {
            await api.deleteBlockedSlot( token, block.id );
            setBlocks( ( prev ) => prev.filter( ( b ) => b.id !== block.id ) );
          } catch ( err ) {
            setError( err instanceof Error ? err.message : "Failed to remove block" );
          }
        },
      },
    ] );
  };

  return (
    <View style={ [ styles.container, { paddingTop: insets.top + 12 } ] }>
      <View style={ styles.header }>
        <View style={ styles.monthBar }>
          <NativeIconButton
            name={ { ios: "chevron.left", android: "chevron_left", web: "chevron_left" } }
            accessibilityLabel="Previous period"
            onPress={ () => shiftPeriod( -1 ) }
          />
          <Pressable onPress={ goToday } accessibilityRole="button">
            <Text style={ styles.monthTitle }>{ title }</Text>
          </Pressable>
          <NativeIconButton
            name={ { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } }
            accessibilityLabel="Next period"
            onPress={ () => shiftPeriod( 1 ) }
          />
        </View>

        <SegmentedControl
          values={ VIEWS.map( ( item ) => item.label ) }
          selectedIndex={ VIEWS.findIndex( ( item ) => item.value === view ) }
          onChange={ ( event ) => {
            setView( VIEWS[ event.nativeEvent.selectedSegmentIndex ].value );
          } }
          appearance="dark"
          tintColor={ colors.gold }
          style={ styles.viewBar }
        />

        { error && <Text style={ styles.error }>{ error }</Text> }
      </View>

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
        { isLoading ? (
          <ActivityIndicator color={ colors.gold } style={ styles.loader } />
        ) : view === "week" ? (
          <WeekTimeline
            days={ week }
            today={ todayKey }
            ridesByDay={ weekData.ridesByDay }
            blocksByDay={ weekData.blocksByDay }
            onPressRide={ ( ride ) => router.push( `/ride/${ ride.reference }` ) }
            onSelectDay={ openDay }
          />
        ) : view === "day" ? (
          // selected is always inside its own week, so weekData covers it
          <WeekTimeline
            days={ [ selected ] }
            today={ todayKey }
            ridesByDay={ weekData.ridesByDay }
            blocksByDay={ weekData.blocksByDay }
            onPressRide={ ( ride ) => router.push( `/ride/${ ride.reference }` ) }
            onSelectDay={ openDay }
            detailed
          />
        ) : view === "year" ? (
          <YearGrid
            year={ year }
            today={ todayKey }
            markers={ yearMarkers }
            onSelectDay={ openDay }
            onSelectMonth={ ( m ) => {
              setMonth( m );
              setView( "month" );
            } }
          />
        ) : view === "agenda" ? (
          <AgendaList
            from={ selected }
            today={ todayKey }
            rides={ visibleRides }
            blocks={ blocks }
            chauffeurId={ chauffeur?.id }
            onRemoveBlock={ removeBlock }
          />
        ) : (
          <>
            <MonthGrid
              cells={ cells }
              selected={ selected }
              today={ todayKey }
              markers={ monthMarkers }
              onSelect={ ( key ) => {
                setSelected( key );
                setFormOpen( false );
              } }
            />

            <View style={ styles.hairline } />

            <View style={ styles.dayBar }>
              <Text style={ [ plate, styles.dayLabel ] }>{ formatRideDate( selected ) }</Text>
              <NativeButton
                label={ formOpen ? "Cancel" : "Block time" }
                variant="text"
                compact
                onPress={ () => setFormOpen( ( open ) => !open ) }
              />
            </View>

            { formOpen && (
              <BlockForm date={ selected } isSaving={ isSaving } onSubmit={ submitBlock } />
            ) }

            { dayBlocks.map( ( block ) => (
              <BlockRow
                key={ block.id }
                block={ block }
                onRemove={ block.chauffeurId === chauffeur?.id ? removeBlock : undefined }
              />
            ) ) }

            <View style={ styles.rideList }>
              { dayRides.map( ( ride ) => (
                <RideRow key={ ride.reference } ride={ ride } timeOnly />
              ) ) }
            </View>

            { dayRides.length === 0 && dayBlocks.length === 0 && !formOpen && (
              <Text style={ styles.freeDay }>Nothing scheduled.</Text>
            ) }
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 20,
  },
  monthBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  monthTitle: {
    color: colors.ivory,
    fontSize: 18,
    fontWeight: "700",
  },
  viewBar: {
    height: 34,
    marginBottom: 16,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.hairline,
    marginTop: 16,
  },
  rideList: {
    gap: 12,
  },
  loader: {
    marginTop: 40,
  },
  dayBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 8,
  },
  dayLabel: {
    color: colors.faint,
  },
  form: {
    backgroundColor: colors.panel,
    padding: 16,
    gap: 14,
    marginVertical: 10,
    borderRadius: 16,
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formRowLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  timeInput: {
    width: 90,
  },
  freeDay: {
    color: colors.faint,
    fontSize: 14,
    paddingVertical: 18,
  },
  error: {
    color: colors.red,
    marginTop: 14,
  },
} );
