import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";

function RootNavigator() {
  const { isLoading, token } = useAuth();

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
      </Stack.Protected>

      <Stack.Protected guard={ !token }>
        <Stack.Screen name="login" options={ { headerShown: false } } />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
