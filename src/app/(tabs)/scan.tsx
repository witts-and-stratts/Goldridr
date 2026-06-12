import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeButton } from "@/components/native-controls";
import { NativeIcon } from "@/components/native-icon";
import { RideInfo } from "@/components/ride-info";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import type { DriverRide } from "@/lib/types";

type ScanState =
  | { kind: "scanning" }
  | { kind: "loading" }
  | { kind: "result"; ride: DriverRide; assignedToYou: boolean }
  | { kind: "error"; message: string };

const FRAME = 250;
const CORNER = 28;

// Four corner ticks instead of a boxed frame: the viewfinder stays open.
function Viewfinder() {
  return (
    <View style={ styles.frame }>
      <View style={ [ styles.corner, styles.cornerTL ] } />
      <View style={ [ styles.corner, styles.cornerTR ] } />
      <View style={ [ styles.corner, styles.cornerBL ] } />
      <View style={ [ styles.corner, styles.cornerBR ] } />
    </View>
  );
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [ permission, requestPermission ] = useCameraPermissions();
  const [ state, setState ] = useState<ScanState>( { kind: "scanning" } );
  const [ isFocused, setIsFocused ] = useState( false );
  // CameraView keeps firing onBarcodeScanned while the code is in frame;
  // this lock makes sure one sighting produces one lookup.
  const scanLock = useRef( false );

  useFocusEffect(
    useCallback( () => {
      setIsFocused( true );
      scanLock.current = false;
      setState( { kind: "scanning" } );
      return () => setIsFocused( false );
    }, [] )
  );

  const handleBarcode = async ( { data }: { data: string } ) => {
    if ( scanLock.current || !token ) return;
    scanLock.current = true;
    setState( { kind: "loading" } );

    try {
      const result = await api.scanRiderCode( token, data );
      setState( { kind: "result", ride: result.ride, assignedToYou: result.assignedToYou } );
    } catch ( err ) {
      setState( {
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to look up QR code",
      } );
    }
  };

  const resetScanner = () => {
    scanLock.current = false;
    setState( { kind: "scanning" } );
  };

  if ( !permission ) {
    return <View style={ styles.container } />;
  }

  if ( !permission.granted ) {
    return (
      <View style={ [ styles.container, styles.centered ] }>
        <NativeIcon
          name={ { ios: "camera", android: "photo_camera", web: "photo_camera" } }
          color={ colors.gold }
          size={ 36 }
        />
        <Text style={ [ plate, styles.permissionLabel ] }>Camera access</Text>
        <Text style={ styles.permissionText }>
          The camera reads a rider&apos;s Ride Pass and pulls up their trip
          details at pickup. Nothing is recorded.
        </Text>
        <NativeButton label="Allow camera" onPress={ requestPermission } />
      </View>
    );
  }

  if ( state.kind === "result" || state.kind === "error" ) {
    return (
      <ScrollView
        style={ styles.container }
        contentContainerStyle={ [ styles.result, { paddingTop: insets.top + 24 } ] }
      >
        { state.kind === "result" ? (
          <>
            <Text style={ [ plate, state.assignedToYou ? styles.resultYours : styles.resultOther ] }>
              { state.assignedToYou ? "Your ride" : "Unassigned ride" }
            </Text>
            <RideInfo ride={ state.ride } />
            { state.assignedToYou && (
              <NativeButton
                label="Open ride"
                onPress={ () => router.push( `/ride/${ state.ride.reference }` ) }
              />
            ) }
          </>
        ) : (
          <>
            <Text style={ [ plate, styles.resultFailed ] }>Scan failed</Text>
            <Text style={ styles.errorMessage }>{ state.message }</Text>
          </>
        ) }
        <NativeButton label="Scan again" variant="outlined" onPress={ resetScanner } />
      </ScrollView>
    );
  }

  return (
    <View style={ styles.container }>
      { isFocused && (
        <CameraView
          style={ StyleSheet.absoluteFill }
          facing="back"
          barcodeScannerSettings={ { barcodeTypes: [ "qr" ] } }
          onBarcodeScanned={ state.kind === "scanning" ? handleBarcode : undefined }
        />
      ) }

      <View style={ styles.overlay } pointerEvents="none">
        <Viewfinder />
        <NativeIcon
          name={ { ios: "qrcode.viewfinder", android: "qr_code_scanner", web: "qr_code_scanner" } }
          color={ colors.ivory }
          size={ 28 }
        />
        <Text style={ [ plate, styles.hint ] }>
          { state.kind === "loading" ? "Looking up ride" : "Frame the rider's pass" }
        </Text>
        { state.kind === "loading" && <ActivityIndicator color={ colors.gold } /> }
      </View>
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
    padding: 28,
    gap: 16,
  },
  permissionLabel: {
    color: colors.gold,
  },
  permissionText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
  },
  frame: {
    width: FRAME,
    height: FRAME,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: colors.ivory,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  hint: {
    color: colors.ivory,
    backgroundColor: "rgba(14, 13, 12, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: "hidden",
  },
  result: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 8,
  },
  resultYours: {
    color: colors.gold,
    marginBottom: 4,
  },
  resultOther: {
    color: colors.amber,
    marginBottom: 4,
  },
  resultFailed: {
    color: colors.red,
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
} );
