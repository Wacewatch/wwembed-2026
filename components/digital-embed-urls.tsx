"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DigitalContentType } from "@/lib/types"

interface DigitalEmbedUrlsProps {
  wwId: string
  contentType: DigitalContentType
  title: string
}

export function DigitalEmbedUrls({ wwId, contentType, title }: DigitalEmbedUrlsProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const getEmbedUrl = () => {
    if (contentType === "ebook") {
      return `${baseUrl}/api/v1/ebook/${wwId}`
    } else if (contentType === "music") {
      return `${baseUrl}/api/v1/music/${wwId}`
    } else {
      return `${baseUrl}/api/v1/digital/${wwId}`
    }
  }

  const downloadUrl = `${baseUrl}/api/v1/download/${wwId}`
  const embedUrl = getEmbedUrl()

  const getTypeLabel = () => {
    switch (contentType) {
      case "ebook":
        return "Lecteur Ebook"
      case "music":
        return "Lecteur Audio"
      case "software":
        return "Page Logiciel"
      case "game":
        return "Page Jeu"
      default:
        return "Embed"
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-foreground">URLs pour Intégration</h3>
        <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded capitalize">{contentType}</span>
      </div>

      <div className="space-y-4">
        {(contentType === "ebook" || contentType === "music") && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">URL {getTypeLabel()} (HTML)</label>
            <div className="flex gap-2">
              <Input value={baseUrl ? embedUrl : "Chargement..."} readOnly className="font-mono text-xs" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(embedUrl, "embed")}
                disabled={!baseUrl}
              >
                {copied === "embed" ? "Copié!" : "Copier"}
              </Button>
            </div>
          </div>
        )}

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
          Titre: <span className="font-medium text-foreground">{title}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          WW ID: <code className="bg-secondary px-2 py-1 rounded">{wwId}</code>
        </p>
        <p className="text-xs text-muted-foreground">
          Format: <code className="bg-secondary px-1 rounded">ww-{contentType}-xxxxx</code>
        </p>
      </div>
    </div>
  )
}
