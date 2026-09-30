import type { Metadata, Viewport } from "next";
import { Lexend, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const lexend = Lexend({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyOnlineCikgu",
  description: "Find. Book. Learn. Improve.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyOnlineCikgu",
  },
};

export const viewport: Viewport = {
  themeColor: "#2B5D45",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexend.variable} ${inter.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col bg-[#F6F3EC] text-[#1C3529]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}