import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { colors } from "@/lib/colors";
import emailPickupIcon from "../../assets/images/email-pickup.png";
import emailDropoffIcon from "../../assets/images/email-dropoff.png";

interface RouteLineProps {
  pickup: string | null;
  destination: string | null;
  compact?: boolean;
  mapPins?: boolean;
}

// The ride-hail route mark: circle for pickup, square for dropoff, a thin
// rail between them. Shapes stay ivory; the rail is a hairline.
export function RouteLine( { pickup, destination, compact, mapPins }: RouteLineProps ) {
  if ( !pickup && !destination ) return null;

  const textStyle = [
    compact ? styles.addressCompact : styles.address,
    mapPins && styles.addressWithPin,
  ];

  if ( mapPins ) {
    return (
      <View style={ styles.pinnedAddresses }>
        <View style={ styles.pinnedAddress }>
          <Image source={ emailPickupIcon } style={ styles.locationIcon } contentFit="contain" alt="" />
          <Text style={ textStyle } numberOfLines={ compact ? 1 : 2 }>
            { pickup ?? "Pickup not set" }
          </Text>
        </View>
        <View style={ styles.pinnedAddress }>
          <Image source={ emailDropoffIcon } style={ styles.locationIcon } contentFit="contain" alt="" />
          <Text style={ [ textStyle, styles.destination ] } numberOfLines={ compact ? 1 : 2 }>
            { destination ?? "Dropoff not set" }
          </Text>
        </View>
      </View>
    );
  }

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
  pinnedAddresses: {
    gap: 13,
  },
  pinnedAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationIcon: {
    width: 18,
    height: 18,
    opacity: 0.9,
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
  addressWithPin: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  destination: {},
} );
