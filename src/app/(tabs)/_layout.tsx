import { NativeTabs } from "expo-router/unstable-native-tabs";

import { colors } from "@/lib/colors";

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={ colors.background }
      iconColor={ { default: colors.faint, selected: colors.gold } }
      labelStyle={ {
        default: { color: colors.faint, fontSize: 11, fontWeight: "600" },
        selected: { color: colors.gold, fontSize: 11, fontWeight: "600" },
      } }
      shadowColor={ colors.hairlineStrong }
      tintColor={ colors.gold }
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={ { default: "car", selected: "car.fill" } }
          md={ { default: "directions_car", selected: "directions_car" } }
        />
        <NativeTabs.Trigger.Label>Rides</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="schedule">
        <NativeTabs.Trigger.Icon
          sf={ { default: "calendar", selected: "calendar" } }
          md={ { default: "calendar_today", selected: "calendar_today" } }
        />
        <NativeTabs.Trigger.Label>Schedule</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scan" role="search">
        <NativeTabs.Trigger.Icon
          sf={ { default: "qrcode.viewfinder", selected: "qrcode.viewfinder" } }
          md={ { default: "qr_code_scanner", selected: "qr_code_scanner" } }
        />
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
