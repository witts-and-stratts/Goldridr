import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { DayMarkers } from "@/components/month-grid";
import { colors } from "@/lib/colors";
import { monthGrid } from "@/lib/schedule";

interface YearGridProps {
  year: number;
  today: string;
  markers: Record<string, DayMarkers>;
  onSelectDay: ( key: string ) => void;
  onSelectMonth: ( month: number ) => void;
}

function MiniMonth( {
  year,
  month,
  today,
  markers,
  onSelectDay,
  onSelectMonth,
}: YearGridProps & { month: number } ) {
  const cells = monthGrid( year, month );
  const title = new Date( year, month, 1 ).toLocaleDateString( "en-US", { month: "short" } );

  return (
    <View style={ styles.mini }>
      <TouchableOpacity onPress={ () => onSelectMonth( month ) }>
        <Text style={ styles.miniTitle }>{ title }</Text>
      </TouchableOpacity>
      { Array.from( { length: 6 }, ( _, week ) => (
        <View key={ week } style={ styles.miniRow }>
          { cells.slice( week * 7, week * 7 + 7 ).map( ( cell ) => {
            if ( !cell.inMonth ) {
              return <View key={ cell.key } style={ styles.miniCell } />;
            }
            const mark = markers[ cell.key ];
            const isToday = cell.key === today;
            return (
              <TouchableOpacity
                key={ cell.key }
                style={ styles.miniCell }
                onPress={ () => onSelectDay( cell.key ) }
                hitSlop={ 2 }
              >
                <Text style={ [ styles.miniDay, isToday && styles.miniToday ] }>
                  { cell.day }
                </Text>
                <View style={ styles.miniMarks }>
                  { mark?.rides ? <View style={ styles.miniRideDot } /> : null }
                  { mark?.blocked ? <View style={ styles.miniBlockDot } /> : null }
                </View>
              </TouchableOpacity>
            );
          } ) }
        </View>
      ) ) }
    </View>
  );
}

export function YearGrid( props: YearGridProps ) {
  return (
    <View style={ styles.grid }>
      { Array.from( { length: 12 }, ( _, month ) => (
        <MiniMonth key={ month } { ...props } month={ month } />
      ) ) }
    </View>
  );
}

const styles = StyleSheet.create( {
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 28,
  },
  mini: {
    width: "50%",
    paddingRight: 14,
  },
  miniTitle: {
    color: colors.ivory,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  miniRow: {
    flexDirection: "row",
  },
  miniCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
    gap: 1,
  },
  miniDay: {
    color: colors.muted,
    fontSize: 10,
  },
  miniToday: {
    color: colors.gold,
    fontWeight: "700",
  },
  miniMarks: {
    flexDirection: "row",
    gap: 2,
    height: 3,
  },
  miniRideDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.gold,
  },
  miniBlockDot: {
    width: 3,
    height: 3,
    backgroundColor: colors.faint,
  },
} );
