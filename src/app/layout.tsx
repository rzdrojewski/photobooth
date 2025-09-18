import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { EventTitleDocumentTitle } from "@/components/EventTitleDocumentTitle";
import { DEFAULT_EVENT_TITLE } from "@/config/eventTitle";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: DEFAULT_EVENT_TITLE,
  description: "Photobooth capture experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EventTitleDocumentTitle />
        {children}
      </body>
    </html>
  );
}
