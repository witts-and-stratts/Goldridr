import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { NativeIcon } from "@/components/native-icon";
import { RouteLine } from "@/components/route-line";
import { StatusText } from "@/components/status-text";
import { colors } from "@/lib/colors";
import { formatRideDate, formatRideTime } from "@/lib/format";
import type { DriverRide } from "@/lib/types";

interface RideRowProps {
  ride: DriverRide;
  dim?: boolean;
  /** Omit the date and show only the time, for lists already grouped by day. */
  timeOnly?: boolean;
}

export function RideRow( { ride, dim, timeOnly }: RideRowProps ) {
  return (
    <Pressable
      style={ ( { pressed } ) => [
        styles.card,
        dim && styles.cardDim,
        pressed && styles.pressed,
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

      <RouteLine pickup={ ride.pickup } destination={ ride.destination } compact />

      <View style={ styles.footer }>
        <View style={ styles.rider }>
          <View style={ styles.avatar }>
            <NativeIcon
              name={ { ios: "person.fill", android: "person", web: "person" } }
              color={ dim ? colors.muted : colors.ivory }
              size={ 14 }
            />
          </View>
          <View style={ styles.riderText }>
            <Text style={ [ styles.name, dim && styles.nameDim ] } numberOfLines={ 1 }>
              { ride.customerName }
            </Text>
            <Text style={ styles.meta } numberOfLines={ 1 }>
              { ride.tripType }
              { ride.passengers ? ` · ${ ride.passengers } pax` : "" }
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
  pressed: {
    backgroundColor: colors.raised,
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
  avatar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderRadius: 10,
  },
  riderText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
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
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
  },
} );
