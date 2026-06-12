import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeButton } from "@/components/native-controls";
import { NativeIcon } from "@/components/native-icon";
import { RideInfo } from "@/components/ride-info";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import type { DriverRide } from "@/lib/types";

export default function RideDetailScreen() {
  const insets = useSafeAreaInsets();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { token } = useAuth();
  const [ ride, setRide ] = useState<DriverRide | null>( null );
  const [ error, setError ] = useState<string | null>( null );
  const [ isUpdating, setIsUpdating ] = useState( false );

  useFocusEffect(
    useCallback( () => {
      if ( !token || !reference ) return;
      api.getRide( token, reference )
        .then( ( result ) => setRide( result.ride ) )
        .catch( ( err ) => setError( err instanceof Error ? err.message : "Failed to load ride" ) );
    }, [ token, reference ] )
  );

  const changeStatus = ( status: "confirmed" | "completed", confirmText: string ) => {
    Alert.alert( "Update ride", confirmText, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          if ( !token || !ride ) return;
          setIsUpdating( true );
          try {
            const result = await api.updateRideStatus( token, ride.reference, status );
            setRide( result.ride );
          } catch ( err ) {
            setError( err instanceof Error ? err.message : "Failed to update ride" );
          } finally {
            setIsUpdating( false );
          }
        },
      },
    ] );
  };

  if ( error && !ride ) {
    return (
      <View style={ [ styles.container, styles.centered ] }>
        <NativeIcon
          name={ { ios: "exclamationmark.triangle", android: "error", web: "error" } }
          color={ colors.red }
          size={ 30 }
        />
        <Text style={ styles.error }>{ error }</Text>
      </View>
    );
  }

  if ( !ride ) {
    return (
      <View style={ [ styles.container, styles.centered ] }>
        <ActivityIndicator color={ colors.gold } />
      </View>
    );
  }

  const canConfirm = ride.status === "pending";
  const canComplete = ride.status === "confirmed" || ride.status === "accepted";

  return (
    <View style={ styles.container }>
      <ScrollView contentContainerStyle={ styles.content }>
        <RideInfo ride={ ride } />
        { error && <Text style={ styles.error }>{ error }</Text> }
      </ScrollView>

      { ( canConfirm || canComplete ) && (
        <View style={ [ styles.footer, { paddingBottom: insets.bottom + 16 } ] }>
          <NativeButton
            label={
              isUpdating
                ? "Updating"
                : canConfirm ? "Confirm ride" : "Complete ride"
            }
            disabled={ isUpdating }
            onPress={ () =>
              canConfirm
                ? changeStatus( "confirmed", "Confirm this ride?" )
                : changeStatus( "completed", "Mark this ride as completed?" )
            }
          />
        </View>
      ) }
    </View>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  error: {
    color: colors.red,
    fontSize: 15,
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
} );
