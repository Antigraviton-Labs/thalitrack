import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ThaliTrack - Find Your Perfect Mess",
  description:
    "Discover nearby messes, view daily veg thali menus, ratings, and find where to eat without visiting multiple places. The easiest way for students to find great food.",
  keywords: [
    "mess finder",
    "thali",
    "student food",
    "mess near me",
    "daily menu",
    "veg thali",
    "mess ratings",
  ],
  authors: [{ name: "ThaliTrack Team" }],
  openGraph: {
    title: "ThaliTrack - Find Your Perfect Mess",
    description:
      "Discover nearby messes, view daily veg thali menus, and ratings. The easiest way for students to find great food.",
    type: "website",
    locale: "en_IN",
    siteName: "ThaliTrack",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThaliTrack - Find Your Perfect Mess",
    description:
      "Discover nearby messes, view daily veg thali menus, and ratings.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#E8861A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
