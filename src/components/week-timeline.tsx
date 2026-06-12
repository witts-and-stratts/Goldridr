import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/lib/colors";
import { formatRideTime } from "@/lib/format";
import { parseKey } from "@/lib/schedule";
import type { BlockedSlot, DriverRide } from "@/lib/types";

export const HOUR_H = 44;
const TIMELINE_H = 24 * HOUR_H;
const GUTTER_W = 42;

function topFor( time: string ): number {
  const [ h = 0, m = 0 ] = time.split( ":" ).map( Number );
  return ( ( h * 60 + m ) / 60 ) * HOUR_H;
}

function heightFor( duration: number ): number {
  return Math.max( ( duration / 60 ) * HOUR_H, 18 );
}

function hourLabel( h: number ): string {
  if ( h === 0 ) return "12 AM";
  if ( h < 12 ) return `${ h } AM`;
  if ( h === 12 ) return "12 PM";
  return `${ h - 12 } PM`;
}

interface WeekTimelineProps {
  days: string[];
  today: string;
  ridesByDay: Record<string, DriverRide[]>;
  blocksByDay: Record<string, BlockedSlot[]>;
  onPressRide: ( ride: DriverRide ) => void;
  onSelectDay: ( key: string ) => void;
  /** Wide-column mode (day view): show rider and destination inside events. */
  detailed?: boolean;
}

export function WeekTimeline( {
  days,
  today,
  ridesByDay,
  blocksByDay,
  onPressRide,
  onSelectDay,
  detailed,
}: WeekTimelineProps ) {
  const now = new Date();
  const nowTop = ( ( now.getHours() * 60 + now.getMinutes() ) / 60 ) * HOUR_H;

  return (
    <View>
      {/* Day headers (redundant when a single day is shown; the toolbar names it) */ }
      <View style={ styles.headerRow }>
        <View style={ { width: GUTTER_W } } />
        { days.length > 1 && days.map( ( key ) => {
          const d = parseKey( key );
          const isToday = key === today;
          return (
            <TouchableOpacity
              key={ key }
              style={ styles.headerCell }
              onPress={ () => onSelectDay( key ) }
            >
              <Text style={ styles.headerWeekday }>
                { d.toLocaleDateString( "en-US", { weekday: "narrow" } ) }
              </Text>
              <Text style={ [ styles.headerDay, isToday && styles.headerToday ] }>
                { d.getDate() }
              </Text>
            </TouchableOpacity>
          );
        } ) }
      </View>

      {/* Timeline */ }
      <View style={ [ styles.body, { height: TIMELINE_H } ] }>
        {/* Hour gutter */ }
        <View style={ { width: GUTTER_W } }>
          { Array.from( { length: 24 }, ( _, h ) => (
            <Text key={ h } style={ [ styles.hourLabel, { top: h * HOUR_H - 6 } ] }>
              { h === 0 ? "" : hourLabel( h ) }
            </Text>
          ) ) }
        </View>

        <View style={ styles.columns }>
          {/* Hour gridlines */ }
          { Array.from( { length: 24 }, ( _, h ) => (
            <View key={ h } style={ [ styles.gridline, { top: h * HOUR_H } ] } />
          ) ) }

          { days.map( ( key ) => {
            const d = parseKey( key );
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const rides = ridesByDay[ key ] ?? [];
            const blocks = blocksByDay[ key ] ?? [];
            return (
              <View key={ key } style={ [ styles.col, isWeekend && styles.colWeekend ] }>
                { blocks.map( ( block ) => (
                  <View
                    key={ `b${ block.id }` }
                    style={ [
                      styles.block,
                      block.isFullDay
                        ? { top: 0, bottom: 0 }
                        : { top: topFor( block.time ), height: heightFor( block.duration ) },
                    ] }
                  />
                ) ) }
                { rides.map( ( ride ) => (
                  <TouchableOpacity
                    key={ ride.reference }
                    style={ [
                      styles.event,
                      { top: topFor( ride.time ), height: heightFor( ride.duration ) },
                    ] }
                    onPress={ () => onPressRide( ride ) }
                  >
                    <Text style={ styles.eventTime } numberOfLines={ 1 }>
                      { formatRideTime( ride.time ) }
                      { detailed && ` · ${ ride.customerName }` }
                    </Text>
                    { detailed && ( ride.pickup || ride.destination ) && (
                      <Text style={ styles.eventDetail } numberOfLines={ 1 }>
                        { ride.pickup ?? "—" } → { ride.destination ?? "—" }
                      </Text>
                    ) }
                  </TouchableOpacity>
                ) ) }
                { key === today && (
                  <View style={ [ styles.nowLine, { top: nowTop } ] }>
                    <View style={ styles.nowDot } />
                    <View style={ styles.nowRule } />
                  </View>
                ) }
              </View>
            );
          } ) }
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create( {
  headerRow: {
    flexDirection: "row",
    paddingBottom: 10,
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerWeekday: {
    color: colors.faint,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerDay: {
    color: colors.ivory,
    fontSize: 15,
    fontWeight: "600",
  },
  headerToday: {
    color: colors.gold,
    fontWeight: "700",
  },
  body: {
    flexDirection: "row",
  },
  hourLabel: {
    position: "absolute",
    right: 8,
    color: colors.faint,
    fontSize: 9,
  },
  columns: {
    flex: 1,
    flexDirection: "row",
  },
  gridline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  col: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.hairline,
  },
  colWeekend: {
    backgroundColor: "rgba(255, 252, 245, 0.02)",
  },
  block: {
    position: "absolute",
    left: 1,
    right: 1,
    backgroundColor: "rgba(255, 252, 245, 0.05)",
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderStyle: "dashed",
  },
  event: {
    position: "absolute",
    left: 1,
    right: 1,
    backgroundColor: "rgba(194, 158, 102, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(194, 158, 102, 0.55)",
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  eventTime: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: "700",
  },
  eventDetail: {
    color: colors.ivory,
    fontSize: 10,
    marginTop: 2,
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  nowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold,
  },
  nowRule: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(194, 158, 102, 0.6)",
  },
} );
