import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter( { subsets: [ 'latin' ], variable: '--font-sans' } );

const epilogue = localFont( {
  src: [
    {
      path: "./fonts/Epilogue-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Epilogue-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Epilogue-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Epilogue-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Epilogue-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-epilogue",
} );

// Configure local fonts - Expecting files in /src/app/fonts/
const engry = localFont( {
  src: [
    {
      path: "./fonts/engry.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-engry",
} );

const engravers = localFont( {
  src: [
    {
      path: "./fonts/EngraversGothic BT.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-engravers",
} );


export const metadata: Metadata = {
  title: "Goldridr - Luxury Chauffeured Services",
  description: "Experience the ultimate in luxury transportation.",
};

export default function RootLayout( {
  children,
}: Readonly<{
  children: React.ReactNode;
}> ) {
  return (
    <html lang="en" className={ inter.variable }>
      <body
        className={ `${ epilogue.variable } ${ engry.variable } ${ engravers.variable } antialiased font-sans` }
      >
        { children }
        <Toaster position="top-right" richColors />
        <Script
          src={ `https://maps.googleapis.com/maps/api/js?key=${ process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }&libraries=places` }
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
