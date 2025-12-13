"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface Link {
  id: string
  created_at: string
  tmdb_id?: number
  media_type?: string
  title?: string
  season_number?: number
  episode_number?: number
  [key: string]: any
}

interface ClientActivityListProps {
  streamingLinks: Link[]
  downloadLinks: Link[]
  getMediaInfo: (link: Link) => { title: string; poster: string | null; mediaType: string }
  formatEpisodeInfo: (link: Link) => string
}

export function ClientActivityList({
  streamingLinks,
  downloadLinks,
  getMediaInfo,
  formatEpisodeInfo,
}: ClientActivityListProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const sortedLinks = [
    ...streamingLinks.map((link) => ({ ...link, linkType: "streaming" as const })),
    ...downloadLinks.map((link) => ({ ...link, linkType: "download" as const })),
  ]
    .filter((link) => link.created_at)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })
    .slice(0, 5)

  if (!mounted) {
    return (
      <div className="space-y-3">
        {sortedLinks.map((link) => {
          const mediaInfo = getMediaInfo(link)
          const episodeInfo = formatEpisodeInfo(link)
          return (
            <div
              key={link.id}
              className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                {mediaInfo.poster && (
                  <img
                    src={mediaInfo.poster || "/placeholder.svg"}
                    alt={mediaInfo.title}
                    className="w-10 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {mediaInfo.title} {episodeInfo}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>--/--/----</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        link.linkType === "streaming"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                      }`}
                    >
                      {link.linkType === "streaming" ? "Streaming" : "Téléchargement"}
                    </Badge>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                Approuve
              </Badge>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedLinks.map((link) => {
        const mediaInfo = getMediaInfo(link)
        const episodeInfo = formatEpisodeInfo(link)
        return (
          <div
            key={link.id}
            className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
          >
            <div className="flex items-center gap-3">
              {mediaInfo.poster && (
                <img
                  src={mediaInfo.poster || "/placeholder.svg"}
                  alt={mediaInfo.title}
                  className="w-10 h-12 object-cover rounded"
                />
              )}
              <div>
                <p className="text-sm font-medium truncate max-w-[150px]">
                  {mediaInfo.title} {episodeInfo}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>
                    {new Date(link.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      link.linkType === "streaming"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                    }`}
                  >
                    {link.linkType === "streaming" ? "Streaming" : "Téléchargement"}
                  </Badge>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
              Approuve
            </Badge>
          </div>
        )
      })}
    </div>
  )
}
