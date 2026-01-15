"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Episode {
  id: string
  season_number: number
  episode_number: number
  download_link?: string
  streaming_link?: string
}

interface ProfileEpisodesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodes: Episode[]
  title: string
  variant: "download" | "streaming"
}

const AD_URL = "https://otieu.com/4/9248013"

export function ProfileEpisodesModal({ open, onOpenChange, episodes, title, variant }: ProfileEpisodesModalProps) {
  const [showAdModal, setShowAdModal] = useState(false)
  const [selectedEpisodes, setSelectedEpisodes] = useState<Episode[]>([])
  const [unlockedLinks, setUnlockedLinks] = useState<{ episode: Episode; link: string }[]>([])

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisodes((prev) => {
      const exists = prev.find((e) => e.id === episode.id)
      if (exists) {
        return prev.filter((e) => e.id !== episode.id)
      } else {
        return [...prev, episode]
      }
    })
  }

  const handleUnlock = () => {
    if (selectedEpisodes.length === 0) return

    setShowAdModal(true)
  }

  const handleAdUnlock = () => {
    // Open ad in new tab
    const link = document.createElement("a")
    link.href = AD_URL
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Unlock content after short delay
    setTimeout(() => {
      const links = selectedEpisodes.map((ep) => ({
        episode: ep,
        link: getLink(ep) || "",
      }))
      setUnlockedLinks(links)
      setShowAdModal(false)
      setSelectedEpisodes([])
    }, 300)
  }

  const getLink = (episode: Episode) => {
    return variant === "download" ? episode.download_link : episode.streaming_link
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{title}</span>
              {selectedEpisodes.length > 0 && (
                <Button onClick={handleUnlock} size="sm">
                  Déverrouiller ({selectedEpisodes.length})
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 p-4">
            {episodes.map((episode) => {
              const isSelected = selectedEpisodes.find((e) => e.id === episode.id)
              return (
                <Button
                  key={episode.id}
                  onClick={() => handleEpisodeClick(episode)}
                  variant={isSelected ? "default" : "outline"}
                  className="h-auto py-4 flex flex-col gap-1"
                >
                  <div className="text-sm font-semibold">
                    S{episode.season_number}E{episode.episode_number}
                  </div>
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Modal */}
      <Dialog open={showAdModal} onOpenChange={setShowAdModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Déverrouiller les épisodes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">
              Cliquez sur le bouton pour déverrouiller l'accès aux {selectedEpisodes.length} épisode(s) sélectionné(s)
            </p>
            <Button onClick={handleAdUnlock} className="w-full" size="lg">
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show Links Modal */}
      {unlockedLinks.length > 0 && (
        <Dialog open={unlockedLinks.length > 0} onOpenChange={() => setUnlockedLinks([])}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Liens déverrouillés</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              {unlockedLinks.map(({ episode, link }, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="font-semibold text-sm">
                    S{episode.season_number}E{episode.episode_number}
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 break-all text-xs font-mono">{link}</div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigator.clipboard.writeText(link)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Copier
                    </Button>
                    <Button onClick={() => window.open(link, "_blank")} size="sm" className="flex-1">
                      Ouvrir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
