import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { GlobalButtonVibration } from "@/components/GlobalButtonVibration";
import { PreventZoom } from "@/components/PreventZoom";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vishu Shoot 2026 | Registration",
  description: "Casting Call 2026",
};

/** Fit mobile width; limit pinch-zoom so layout stays stable (pair with 16px+ form fields in globals.css). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plusJakartaSans.variable} h-full overflow-x-hidden antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-dvh flex-col overflow-x-hidden md:min-h-[max(884px,100dvh)]">
        <PreventZoom />
        <GlobalButtonVibration />
        {children}
      </body>
    </html>
  );
}
