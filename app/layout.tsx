import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WWEmbed - Streaming & Download Links Aggregator",
  description: "Embed streaming players and download links for movies and TV shows using TMDB IDs",
  keywords: ["embed", "streaming", "download", "tmdb", "movies", "tv shows"],
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />

        {/* === HISTATS === */}
        <Script id="histats-init" strategy="afterInteractive">
          {`
            var _Hasync = _Hasync || [];
            _Hasync.push(['Histats.start', '1,4996171,4,0,0,0,00010000']);
            _Hasync.push(['Histats.fasi', '1']);
            _Hasync.push(['Histats.track_hits', '']);
            (function() {
              var hs = document.createElement('script');
              hs.type = 'text/javascript';
              hs.async = true;
              hs.src = ('//s10.histats.com/js15_as.js');
              (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
            })();
          `}
        </Script>

        <noscript>
          <a href="/" target="_blank">
            <img
              src="//sstatic1.histats.com/0.gif?4996171&101"
              alt="free hit counter javascript"
            />
          </a>
        </noscript>
        {/* === END HISTATS === */}
      </body>
    </html>
  )
}

