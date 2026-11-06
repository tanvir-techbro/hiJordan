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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
};

// Applies the saved theme before the first paint so dark mode does not flash.
const themeScript = `(function(){try{var t=localStorage.getItem("hijordan-theme")||"system";if(t==="dark")t="dark-black";var s=t==="light-grey"||t==="dark-grey";var d=t==="dark-black"||t==="dark-grey"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.lightStyle=s?"grey":"black";r.dataset.darkStyle=s?"grey":"black";r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${grandHotel.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
