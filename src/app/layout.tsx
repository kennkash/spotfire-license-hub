import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import QueryProvider from "@/components/query-provider"

/* -------------------------
   Geist Sans (UI font)
-------------------------- */
const geistSans = localFont({
  src: [
    {
      path: "../assets/fonts/geist/Geist-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/geist/Geist-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/geist/Geist-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/geist/Geist-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
})

/* -------------------------
   Geist Mono (code font)
-------------------------- */
const geistMono = localFont({
  src: [
    {
      path: "../assets/fonts/geist/GeistMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/geist/GeistMono-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Spotfire License Hub",
  description: "Digital Solutions - KS",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
