"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EmbedUrlsProps {
  wwId: string
  mediaType?: "movie" | "tv"
  seasonNumber?: number | null
  episodeNumber?: number | null
}

export function EmbedUrls({ wwId, mediaType, seasonNumber, episodeNumber }: EmbedUrlsProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const streamingUrl = `${baseUrl}/api/v1/streaming/${wwId}`
  const downloadUrl = `${baseUrl}/api/v1/download/${wwId}`

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-foreground">URLs pour Intégration</h3>
        {mediaType === "tv" && seasonNumber !== undefined && seasonNumber !== null && (
          <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded">
            {episodeNumber ? `S${seasonNumber}E${episodeNumber}` : `Saison ${seasonNumber}`}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">URL Lecteur Streaming (HTML)</label>
          <div className="flex gap-2">
            <Input value={baseUrl ? streamingUrl : "Chargement..."} readOnly className="font-mono text-xs" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(streamingUrl, "streaming")}
              disabled={!baseUrl}
            >
              {copied === "streaming" ? "Copié!" : "Copier"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">URL Téléchargement (HTML)</label>
          <div className="flex gap-2">
            <Input value={baseUrl ? downloadUrl : "Chargement..."} readOnly className="font-mono text-xs" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(downloadUrl, "download")}
              disabled={!baseUrl}
            >
              {copied === "download" ? "Copié!" : "Copier"}
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground">
          WW ID: <code className="bg-secondary px-2 py-1 rounded">{wwId}</code>
        </p>
        <p className="text-xs text-muted-foreground">
          Format: <code className="bg-secondary px-1 rounded">ww-movie-ID</code> ou{" "}
          <code className="bg-secondary px-1 rounded">ww-tv-ID-s1-e1</code>
        </p>
      </div>
    </div>
  )
}
