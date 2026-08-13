import type { Metadata, Viewport } from "next";

export const adminPwaMetadata: Metadata = {
  applicationName: "GoldRidr Admin",
  title: "GoldRidr Admin",
  description: "GoldRidr operations dashboard for bookings and fleet management.",
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "GoldRidr Admin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [
      {
        url: "/admin-icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const adminPwaViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#171717",
  colorScheme: "dark",
};
