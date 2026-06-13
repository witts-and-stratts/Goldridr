import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { useNotificationRedirect } from "@/lib/push";

function RootNavigator() {
  const { isLoading, token, isAdmin } = useAuth();
  useNotificationRedirect();

  // Wait for the stored session before picking a stack, so a signed-in
  // driver doesn't flash the login screen on launch.
  if ( isLoading ) return null;

  return (
    <Stack
      screenOptions={ {
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.gold,
        headerTitleStyle: { color: colors.ivory, fontSize: 15, fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      } }
    >
      <Stack.Protected guard={ !!token }>
        <Stack.Screen name="(tabs)" options={ { headerShown: false } } />
        <Stack.Screen
          name="ride/[reference]"
          options={ { title: "Ride details", headerBackButtonDisplayMode: "minimal" } }
        />
        <Stack.Screen
          name="notifications"
          options={ { title: "Notifications", headerBackButtonDisplayMode: "minimal" } }
        />

        <Stack.Protected guard={ isAdmin }>
          <Stack.Screen
            name="manage/chauffeurs"
            options={ { title: "Chauffeurs", headerBackButtonDisplayMode: "minimal" } }
          />
          <Stack.Screen
            name="manage/discounts"
            options={ { title: "Discount codes", headerBackButtonDisplayMode: "minimal" } }
          />
          <Stack.Screen
            name="manage/payments"
            options={ { title: "Payments", headerBackButtonDisplayMode: "minimal" } }
          />
          <Stack.Screen
            name="manage/settings"
            options={ { title: "Settings", headerBackButtonDisplayMode: "minimal" } }
          />
          <Stack.Screen
            name="manage/communications"
            options={ { title: "Communications", headerBackButtonDisplayMode: "minimal" } }
          />
          <Stack.Screen
            name="manage/testing"
            options={ { title: "Testing tools", headerBackButtonDisplayMode: "minimal" } }
          />
        </Stack.Protected>
      </Stack.Protected>

      <Stack.Protected guard={ !token }>
        <Stack.Screen name="login" options={ { headerShown: false } } />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={ { flex: 1 } }>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
