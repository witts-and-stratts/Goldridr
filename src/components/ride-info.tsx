import { Linking, StyleSheet, Text, View } from "react-native";

import { NativeButton } from "@/components/native-controls";
import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import { RouteLine } from "@/components/route-line";
import { StatusText } from "@/components/status-text";
import { colors, plate } from "@/lib/colors";
import { formatRideDate, formatRideTime } from "@/lib/format";
import type { DriverRide } from "@/lib/types";

function Row( {
  icon,
  label,
  value,
}: {
  icon: NativeSymbolName;
  label: string;
  value: string | null | undefined;
} ) {
  if ( !value ) return null;
  return (
    <View style={ styles.metaRow }>
      <View style={ styles.metaLabelGroup }>
        <NativeIcon name={ icon } size={ 16 } />
        <Text style={ styles.metaLabel }>{ label }</Text>
      </View>
      <Text style={ styles.metaValue } numberOfLines={ 2 }>{ value }</Text>
    </View>
  );
}

export function RideInfo( { ride }: { ride: DriverRide } ) {
  return (
    <View>
      {/* When and what state */ }
      <View style={ styles.header }>
        <Text style={ styles.time }>{ formatRideTime( ride.time ) }</Text>
        <Text style={ styles.date }>{ formatRideDate( ride.date ) }</Text>
        <StatusText status={ ride.status } style={ styles.status } />
      </View>

      <View style={ styles.hairline } />

      <View style={ styles.section }>
        <RouteLine pickup={ ride.pickup } destination={ ride.destination } />
      </View>

      <View style={ styles.hairline } />

      <View style={ styles.section }>
        <Row
          icon={ { ios: "car", android: "directions_car", web: "directions_car" } }
          label="Trip type"
          value={ ride.tripType }
        />
        <Row
          icon={ { ios: "person.2", android: "group", web: "group" } }
          label="Passengers"
          value={ ride.passengers }
        />
        <Row
          icon={ { ios: "airplane", android: "flight", web: "flight" } }
          label="Flight"
          value={ ride.flightNumber }
        />
        <Row
          icon={ { ios: "sterlingsign.circle", android: "payments", web: "payments" } }
          label="Estimated total"
          value={ ride.estimatedPrice }
        />
        <Row
          icon={ { ios: "number", android: "tag", web: "tag" } }
          label="Reference"
          value={ ride.reference }
        />
      </View>

      { ride.notes && (
        <>
          <View style={ styles.hairline } />
          <View style={ styles.section }>
            <Text style={ [ plate, styles.notesLabel ] }>Special requests</Text>
            <Text style={ styles.notes }>{ ride.notes }</Text>
          </View>
        </>
      ) }

      <View style={ styles.hairline } />

      {/* Rider */ }
      <View style={ [ styles.section, styles.riderRow ] }>
        <View style={ styles.riderName }>
          <Text style={ [ plate, styles.notesLabel ] }>Rider</Text>
          <Text style={ styles.rider }>{ ride.customerName }</Text>
        </View>
        { ride.customerPhone && (
          <NativeButton
            label="Call"
            icon={ { ios: "phone.fill", android: "call", web: "call" } }
            variant="outlined"
            compact
            onPress={ () => Linking.openURL( `tel:${ ride.customerPhone }` ) }
          />
        ) }
      </View>
    </View>
  );
}

const styles = StyleSheet.create( {
  header: {
    paddingVertical: 20,
    gap: 2,
  },
  time: {
    color: colors.ivory,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  date: {
    color: colors.muted,
    fontSize: 15,
  },
  status: {
    marginTop: 10,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  section: {
    paddingVertical: 20,
    gap: 14,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  metaLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaValue: {
    color: colors.ivory,
    fontSize: 14,
    flexShrink: 1,
    textAlign: "right",
    textTransform: "capitalize",
  },
  notesLabel: {
    color: colors.faint,
  },
  notes: {
    color: colors.ivory,
    fontSize: 15,
    lineHeight: 21,
  },
  riderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riderName: {
    gap: 6,
    flexShrink: 1,
  },
  rider: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "600",
  },
} );
