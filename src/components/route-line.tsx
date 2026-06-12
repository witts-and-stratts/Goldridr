import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/colors";

interface RouteLineProps {
  pickup: string | null;
  destination: string | null;
  compact?: boolean;
}

// The ride-hail route mark: circle for pickup, square for dropoff, a thin
// rail between them. Shapes stay ivory; the rail is a hairline.
export function RouteLine( { pickup, destination, compact }: RouteLineProps ) {
  if ( !pickup && !destination ) return null;

  const textStyle = compact ? styles.addressCompact : styles.address;

  return (
    <View style={ styles.row }>
      <View style={ styles.rail }>
        <View style={ styles.dot } />
        <View style={ styles.line } />
        <View style={ styles.square } />
      </View>
      <View style={ styles.addresses }>
        <Text style={ textStyle } numberOfLines={ compact ? 1 : 2 }>
          { pickup ?? "Pickup not set" }
        </Text>
        <Text style={ [ textStyle, styles.destination ] } numberOfLines={ compact ? 1 : 2 }>
          { destination ?? "Dropoff not set" }
        </Text>
      </View>
    </View>
  );
}

const MARK = 7;

const styles = StyleSheet.create( {
  row: {
    flexDirection: "row",
    gap: 14,
  },
  rail: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dot: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    backgroundColor: colors.ivory,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: colors.hairlineStrong,
    marginVertical: 4,
  },
  square: {
    width: MARK,
    height: MARK,
    backgroundColor: colors.ivory,
  },
  addresses: {
    flex: 1,
    justifyContent: "space-between",
    gap: 16,
  },
  address: {
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 21,
  },
  addressCompact: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
  },
  destination: {},
} );
