import type { Metadata, Viewport } from "next";
import { Grand_Hotel, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const grandHotel = Grand_Hotel({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-grand-hotel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HiJordan — Messages",
  description: "Private messages, one conversation at a time.",
  applicationName: "HiJordan",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${grandHotel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
