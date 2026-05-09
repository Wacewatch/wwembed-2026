"use client"

import { useState } from "react"
import type { StreamingLink } from "@/lib/types"

interface EmbedPlayerProps {
  sources: StreamingLink[]
  title: string
  poster?: string
}

export function EmbedPlayer({ sources, title, poster }: EmbedPlayerProps) {
  const [selectedSource, setSelectedSource] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  if (sources.length === 0) {
    return (
      <div className="aspect-video bg-card rounded-lg flex items-center justify-center border border-border">
        <p className="text-muted-foreground">Aucune source disponible</p>
      </div>
    )
  }

  const currentSource = sources[selectedSource]

  return (
    <div className="space-y-4">
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        {isPlaying ? (
          <iframe
            src={currentSource.source_url}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer group"
            style={{
              backgroundImage: poster ? `url(${poster})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            onClick={() => setIsPlaying(true)}
          >
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-white font-medium text-lg">{title}</p>
            </div>
          </div>
        )}
      </div>

      {sources.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((source, index) => (
            <button
              key={source.id}
              onClick={() => {
                setSelectedSource(index)
                setIsPlaying(true)
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                index === selectedSource
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {source.source_name}
              {source.is_verified && <span className="ml-1 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
