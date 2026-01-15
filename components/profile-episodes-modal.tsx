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
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [unlocked, setUnlocked] = useState(false)

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode(episode)
    setShowAdModal(true)
    setUnlocked(false)
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
      setUnlocked(true)
      setShowAdModal(false)
    }, 300)
  }

  const getLink = (episode: Episode) => {
    return variant === "download" ? episode.download_link : episode.streaming_link
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
            {episodes.map((episode) => (
              <Button
                key={episode.id}
                onClick={() => handleEpisodeClick(episode)}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-1"
              >
                <div className="text-sm font-semibold">
                  S{episode.season_number}E{episode.episode_number}
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Modal */}
      <Dialog open={showAdModal} onOpenChange={setShowAdModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Déverrouiller l'épisode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">Cliquez sur le bouton pour déverrouiller l'accès</p>
            <Button onClick={handleAdUnlock} className="w-full" size="lg">
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show Link Modal */}
      {unlocked && selectedEpisode && (
        <Dialog open={unlocked} onOpenChange={() => setUnlocked(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Lien de l'épisode S{selectedEpisode.season_number}E{selectedEpisode.episode_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div className="bg-slate-800 rounded-lg p-4 break-all text-sm font-mono">{getLink(selectedEpisode)}</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(getLink(selectedEpisode) || "")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Copier
                </Button>
                <Button onClick={() => window.open(getLink(selectedEpisode), "_blank")} className="flex-1">
                  Ouvrir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
