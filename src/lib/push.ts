import { useEffect } from "react";
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";

import * as api from "@/lib/api";
import { colors } from "@/lib/colors";

type NotificationsModule = typeof import("expo-notifications");

// Expo Go and dev builds compiled before expo-notifications was added ship
// without its native modules, so requiring the package throws (and Metro
// logs the error even when caught). Probe for the native module first and
// skip the require when it's absent; push stays off until a binary that
// includes it.
const isExpoGo = Constants.executionEnvironment === "storeClient";
let notificationsModule: NotificationsModule | null | undefined;

export function getNotificationsModule(): NotificationsModule | null {
  if ( notificationsModule !== undefined ) return notificationsModule;
  if ( isExpoGo ) {
    notificationsModule = null;
    return null;
  }
  if ( !requireOptionalNativeModule( "ExpoPushTokenManager" ) ) {
    notificationsModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require( "expo-notifications" ) as NotificationsModule;
    loaded.setNotificationHandler( {
      handleNotification: async () => ( {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } ),
    } );
    notificationsModule = loaded;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

// Remembered so sign-out can tell the server which device token to drop.
let currentPushToken: string | null = null;

export async function registerForPushAsync( authToken: string ): Promise<void> {
  if ( Platform.OS === "web" || !Device.isDevice ) return;
  const Notifications = getNotificationsModule();
  if ( !Notifications ) return;

  try {
    if ( Platform.OS === "android" ) {
      await Notifications.setNotificationChannelAsync( "default", {
        name: "Ride updates",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [ 0, 250, 250, 250 ],
        lightColor: colors.gold,
      } );
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if ( existingStatus !== "granted" ) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if ( finalStatus !== "granted" ) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if ( !projectId ) return;

    const pushToken = ( await Notifications.getExpoPushTokenAsync( { projectId } ) ).data;
    currentPushToken = pushToken;
    await api.registerPushToken( authToken, pushToken, Platform.OS );
  } catch {
    // Push is best-effort; the in-app feed still works without it.
  }
}

export async function unregisterPushAsync( authToken: string ): Promise<void> {
  if ( !currentPushToken ) return;
  try {
    await api.unregisterPushToken( authToken, currentPushToken );
  } catch {
    // The server prunes dead tokens when Expo reports DeviceNotRegistered.
  }
  currentPushToken = null;
}

// Routes a tapped notification to the screen named in its data payload,
// including the cold-start tap that launched the app.
export function useNotificationRedirect() {
  useEffect( () => {
    if ( Platform.OS === "web" ) return;
    const Notifications = getNotificationsModule();
    if ( !Notifications ) return;

    const redirect = ( notification: import("expo-notifications").Notification ) => {
      const url = notification.request.content.data?.url;
      if ( typeof url === "string" ) router.push( url );
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if ( lastResponse?.notification ) redirect( lastResponse.notification );

    const subscription = Notifications.addNotificationResponseReceivedListener( ( response ) => {
      redirect( response.notification );
    } );
    return () => subscription.remove();
  }, [] );
}
