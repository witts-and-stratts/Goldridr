import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, plate } from "@/lib/colors";
import type { MonthCell } from "@/lib/schedule";

const WEEKDAYS = [ "S", "M", "T", "W", "T", "F", "S" ];

export interface DayMarkers {
  rides: number;
  blocked: boolean;
}

interface MonthGridProps {
  cells: MonthCell[];
  selected: string;
  today: string;
  markers: Record<string, DayMarkers>;
  onSelect: ( key: string ) => void;
}

export function MonthGrid( { cells, selected, today, markers, onSelect }: MonthGridProps ) {
  return (
    <View>
      <View style={ styles.weekRow }>
        { WEEKDAYS.map( ( d, i ) => (
          <Text key={ i } style={ [ plate, styles.weekday ] }>{ d }</Text>
        ) ) }
      </View>

      { Array.from( { length: 6 }, ( _, week ) => (
        <View key={ week } style={ styles.row }>
          { cells.slice( week * 7, week * 7 + 7 ).map( ( cell ) => {
            const mark = markers[ cell.key ];
            const isSelected = cell.key === selected;
            const isToday = cell.key === today;
            return (
              <TouchableOpacity
                key={ cell.key }
                style={ [ styles.cell, isSelected && styles.cellSelected ] }
                onPress={ () => onSelect( cell.key ) }
                activeOpacity={ 0.7 }
              >
                <Text
                  style={ [
                    styles.day,
                    !cell.inMonth && styles.dayOutside,
                    isToday && !isSelected && styles.dayToday,
                    isSelected && styles.daySelected,
                  ] }
                >
                  { cell.day }
                </Text>
                <View style={ styles.marks }>
                  { mark?.rides ? (
                    <View style={ [ styles.rideDot, isSelected && styles.markSelected ] } />
                  ) : null }
                  { mark?.blocked ? (
                    <View style={ [ styles.blockDash, isSelected && styles.markSelected ] } />
                  ) : null }
                </View>
              </TouchableOpacity>
            );
          } ) }
        </View>
      ) ) }
    </View>
  );
}

const styles = StyleSheet.create( {
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: colors.faint,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    aspectRatio: 0.92,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cellSelected: {
    backgroundColor: colors.ivory,
  },
  day: {
    color: colors.ivory,
    fontSize: 15,
  },
  dayOutside: {
    color: colors.faint,
  },
  dayToday: {
    color: colors.gold,
    fontWeight: "700",
  },
  daySelected: {
    color: colors.background,
    fontWeight: "700",
  },
  marks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 5,
  },
  rideDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold,
  },
  blockDash: {
    width: 8,
    height: 2,
    backgroundColor: colors.muted,
  },
  markSelected: {
    backgroundColor: colors.background,
  },
} );
