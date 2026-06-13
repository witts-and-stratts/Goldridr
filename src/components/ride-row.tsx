import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";

import airplaneIcon from "../../assets/images/ride-types/airplane.svg";
import cityIcon from "../../assets/images/ride-types/city.svg";
import clockIcon from "../../assets/images/ride-types/clock.svg";
import { NativeIcon } from "@/components/native-icon";
import { RouteLine } from "@/components/route-line";
import { StatusText } from "@/components/status-text";
import { colors } from "@/lib/colors";
import { formatRideDate, formatRideTime } from "@/lib/format";
import type { DriverRide } from "@/lib/types";

const TRIP_TYPE_ICONS: Record<string, number> = {
  airport: airplaneIcon,
  city: cityIcon,
  town: cityIcon,
  hourly: clockIcon,
};

interface RideRowProps {
  ride: DriverRide;
  dim?: boolean;
  flat?: boolean;
  /** Omit the date and show only the time, for lists already grouped by day. */
  timeOnly?: boolean;
}

export function RideRow( { ride, dim, flat, timeOnly }: RideRowProps ) {
  const tripTypeIcon = TRIP_TYPE_ICONS[ ride.tripType.toLowerCase() ];

  return (
    <Pressable
      style={ ( { pressed } ) => [
        styles.card,
        flat && styles.cardFlat,
        dim && styles.cardDim,
        dim && flat && styles.cardFlatDim,
        pressed && styles.pressed,
        pressed && flat && styles.pressedFlat,
      ] }
      accessibilityRole="button"
      accessibilityLabel={ `Open ride for ${ ride.customerName } on ${ formatRideDate( ride.date ) } at ${ formatRideTime( ride.time ) }` }
      onPress={ () => router.push( `/ride/${ ride.reference }` ) }
    >
      <View style={ styles.header }>
        <View style={ styles.when }>
          <Text style={ [ styles.time, dim && styles.timeDim ] }>
            { formatRideTime( ride.time ) }
          </Text>
          { !timeOnly && (
            <View style={ styles.dateRow }>
              <NativeIcon
                name={ { ios: "calendar", android: "calendar_today", web: "calendar_today" } }
                color={ colors.muted }
                size={ 13 }
              />
              <Text style={ styles.date }>{ formatRideDate( ride.date ) }</Text>
            </View>
          ) }
        </View>
        <StatusText status={ ride.status } />
      </View>

      <View style={ styles.divider } />

      <View style={ styles.routeRow }>
        <View style={ styles.route }>
          <RouteLine
            pickup={ ride.pickup }
            destination={ ride.destination }
            compact
            mapPins={ flat }
          />
        </View>
        { flat && tripTypeIcon && (
          <Image
            source={ tripTypeIcon }
            style={ styles.tripTypeIcon }
            contentFit="contain"
            alt={ `${ ride.tripType } ride` }
            accessibilityLabel={ `${ ride.tripType } ride` }
          />
        ) }
      </View>

      <View style={ styles.footer }>
        <View style={ styles.rider }>
          <View style={ styles.riderText }>
            <Text
              style={ [ styles.name, flat && styles.nameFlat, dim && styles.nameDim ] }
              numberOfLines={ 1 }
            >
              { ride.customerName }
            </Text>
            <Text style={ styles.meta } numberOfLines={ 1 }>
              { ride.passengers
                ? `${ ride.passengers } ${ Number( ride.passengers ) === 1 ? "passenger" : "passengers" }`
                : "" }
            </Text>
          </View>
        </View>
        <View style={ styles.disclosure }>
          <NativeIcon
            name={ { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } }
            color={ dim ? colors.faint : colors.gold }
            size={ 17 }
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create( {
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  cardDim: {
    backgroundColor: "rgba(27, 25, 22, 0.64)",
  },
  cardFlat: {
    backgroundColor: "rgba(17, 15, 13, 0.98)",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderTopColor: colors.hairline,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  cardFlatDim: {
    backgroundColor: "rgba(17, 15, 13, 0.9)",
  },
  pressed: {
    backgroundColor: colors.raised,
    borderColor: colors.hairlineStrong,
  },
  pressedFlat: {
    backgroundColor: colors.panel,
    borderColor: colors.hairlineStrong,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  when: {
    flex: 1,
    gap: 5,
  },
  time: {
    color: colors.ivory,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  timeDim: {
    color: colors.muted,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },
  route: {
    flex: 1,
  },
  tripTypeIcon: {
    width: 42,
    height: 42,
    opacity: 0.82,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rider: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  riderText: {
    flex: 1,
    justifyContent: "center",
    gap: 0,
  },
  name: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
  },
  nameFlat: {
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: -0.1,
  },
  nameDim: {
    color: colors.muted,
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "capitalize",
  },
  disclosure: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 999,
  },
} );
