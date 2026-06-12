import { StyleSheet, Text, View } from "react-native";

import { BlockRow } from "@/components/block-row";
import { RideRow } from "@/components/ride-row";
import { colors, plate } from "@/lib/colors";
import { formatRideDate } from "@/lib/format";
import { addDaysKey, blocksForDate, ridesForDate } from "@/lib/schedule";
import type { BlockedSlot, DriverRide } from "@/lib/types";

// Mirrors the admin AgendaView: the next 60 days that have anything on them.
const AHEAD_DAYS = 60;

interface AgendaListProps {
  from: string;
  today: string;
  rides: DriverRide[];
  blocks: BlockedSlot[];
  chauffeurId?: number;
  onRemoveBlock: ( block: BlockedSlot ) => void;
}

export function AgendaList( {
  from,
  today,
  rides,
  blocks,
  chauffeurId,
  onRemoveBlock,
}: AgendaListProps ) {
  const days = Array.from( { length: AHEAD_DAYS }, ( _, i ) => addDaysKey( from, i ) )
    .map( ( key ) => ( {
      key,
      rides: ridesForDate( rides, key ).sort( ( a, b ) => a.time.localeCompare( b.time ) ),
      blocks: blocksForDate( blocks, key ),
    } ) )
    .filter( ( day ) => day.rides.length > 0 || day.blocks.length > 0 );

  if ( days.length === 0 ) {
    return (
      <Text style={ styles.empty }>
        Nothing scheduled in the next { AHEAD_DAYS } days.
      </Text>
    );
  }

  return (
    <View>
      { days.map( ( day ) => (
        <View key={ day.key } style={ styles.day }>
          <Text style={ [ plate, styles.dayLabel, day.key === today && styles.dayToday ] }>
            { day.key === today ? "Today" : formatRideDate( day.key ) }
          </Text>
          { day.blocks.map( ( block ) => (
            <BlockRow
              key={ block.id }
              block={ block }
              onRemove={ block.chauffeurId === chauffeurId ? onRemoveBlock : undefined }
            />
          ) ) }
          <View style={ styles.rideList }>
            { day.rides.map( ( ride ) => (
              <RideRow key={ ride.reference } ride={ ride } timeOnly />
            ) ) }
          </View>
        </View>
      ) ) }
    </View>
  );
}

const styles = StyleSheet.create( {
  day: {
    marginBottom: 26,
  },
  dayLabel: {
    color: colors.faint,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  dayToday: {
    color: colors.gold,
  },
  rideList: {
    gap: 12,
  },
  empty: {
    color: colors.faint,
    fontSize: 14,
    paddingVertical: 18,
  },
} );
