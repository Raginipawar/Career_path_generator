import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import Navbar from "@/components/ui/Navbar";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

export const metadata: Metadata = {
  title: "SANATAN LABS — PASSIONIT-PRUTL KALKI AI DHARMA Framework",
  description: "AI-powered ethical career intelligence by Sanatan Labs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} antialiased min-h-screen flex flex-col`}>
        <Navbar />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
