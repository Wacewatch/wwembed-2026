import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WWEmbed - Streaming & Download Links Aggregator",
  description: "Embed streaming players and download links for movies and TV shows using TMDB IDs",
  keywords: ["embed", "streaming", "download", "tmdb", "movies", "tv shows"],
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico", // ou "/icon.png" si tu préfères
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
