"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateWWId } from "@/lib/tmdb"
import { Plus, Search, Loader2, Tv } from "lucide-react"
import type { LiveTVChannel } from "@/lib/types"

const LIVE_TV_CATEGORIES = [
  { value: "general", label: "Generaliste" },
  { value: "sport", label: "Sport" },
  { value: "news", label: "Actualites" },
  { value: "entertainment", label: "Divertissement" },
  { value: "kids", label: "Enfants" },
  { value: "music", label: "Musique" },
  { value: "documentary", label: "Documentaire" },
  { value: "cinema", label: "Cinema" },
  { value: "other", label: "Autre" },
]

interface AddLinkModalProps {
  prefilledTmdbId?: number
  prefilledMediaType?: "movie" | "tv"
  prefilledTitle?: string
  prefilledPoster?: string
  prefilledSeasonNumber?: number | null
  prefilledEpisodeNumber?: number | null
  prefilledSeasons?: number
  prefilledChannel?: LiveTVChannel
  buttonVariant?: "default" | "outline" | "secondary" | "ghost"
  buttonText?: string
  buttonClassName?: string
  buttonIcon?: React.ReactNode
  onSuccess?: () => void
}

export function AddLinkModal({
  prefilledTmdbId,
  prefilledMediaType,
  prefilledTitle,
  prefilledPoster,
  prefilledSeasonNumber,
  prefilledEpisodeNumber,
  prefilledSeasons,
  prefilledChannel,
  buttonVariant = "default",
  buttonText = "Ajouter un lien",
  buttonClassName,
  buttonIcon,
  onSuccess,
}: AddLinkModalProps) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "uploader" | "member">("member")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [mainTab, setMainTab] = useState<"media" | "livetv">("media")
  const [liveTvMode, setLiveTvMode] = useState<"new" | "existing">("new")
  const [existingChannels, setExistingChannels] = useState<LiveTVChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string>("")
  const [channelSearchQuery, setChannelSearchQuery] = useState("")

  // Media selection state
  const [tmdbId, setTmdbId] = useState("")
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie")
  const [seasonNumber, setSeasonNumber] = useState("")
  const [episodeNumber, setEpisodeNumber] = useState("")
  const [mediaInfo, setMediaInfo] = useState<{ title: string; poster: string; seasons?: number } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [streamingData, setStreamingData] = useState({
    source_name: "",
    source_url: "",
    quality: "HD",
    language: "multi",
  })

  const [downloadData, setDownloadData] = useState({
    source_name: "",
    source_url: "",
    link_type: "direct" as "direct" | "torrent" | "magnet",
    quality: "HD",
    file_size: "",
    language: "multi",
  })

  const [liveTvData, setLiveTvData] = useState({
    channel_name: "",
    channel_logo: "",
    stream_url: "",
    category: "general",
    country: "fr",
    language: "fr",
    quality: "HD",
  })

  const [liveTvSourceData, setLiveTvSourceData] = useState({
    source_name: "",
    stream_url: "",
    quality: "HD",
  })

  const isPrefilled = !!prefilledTmdbId
  const isChannelPrefilled = !!prefilledChannel

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)
        setIsAuthenticated(true)

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        if (profile) {
          setUserRole(profile.role)
        }
      }
    }

    if (open) {
      checkAuth()
    }
  }, [open])

  useEffect(() => {
    const fetchChannels = async () => {
      if (open && mainTab === "livetv" && liveTvMode === "existing") {
        const supabase = createClient()
        const { data } = await supabase
          .from("live_tv_channels")
          .select("*")
          .eq("status", "approved")
          .order("channel_name")
        setExistingChannels(data || [])
      }
    }
    fetchChannels()
  }, [open, mainTab, liveTvMode])

  useEffect(() => {
    if (open) {
      if (prefilledChannel) {
        setMainTab("livetv")
        setLiveTvMode("existing")
        setSelectedChannelId(prefilledChannel.id)
      } else if (prefilledTmdbId) {
        setMainTab("media")
        setTmdbId(prefilledTmdbId.toString())
        setMediaType(prefilledMediaType || "movie")
        setSeasonNumber(prefilledSeasonNumber?.toString() || "")
        setEpisodeNumber(prefilledEpisodeNumber?.toString() || "")
        if (prefilledTitle) {
          setMediaInfo({
            title: prefilledTitle,
            poster: prefilledPoster || "",
            seasons: prefilledSeasons,
          })
        }
      } else {
        // Reset all state when opening without prefilled data
        setMainTab("media")
        setLiveTvMode("new")
        setTmdbId("")
        setMediaType("movie")
        setSeasonNumber("")
        setEpisodeNumber("")
        setMediaInfo(null)
        setError(null)
        setSuccess(null)
        setSelectedChannelId("")
        setLiveTvData({
          channel_name: "",
          channel_logo: "",
          stream_url: "",
          category: "general",
          country: "fr",
          language: "fr",
          quality: "HD",
        })
        setLiveTvSourceData({
          source_name: "",
          stream_url: "",
          quality: "HD",
        })
      }
    }
  }, [
    open,
    prefilledTmdbId,
    prefilledMediaType,
    prefilledTitle,
    prefilledPoster,
    prefilledSeasonNumber,
    prefilledEpisodeNumber,
    prefilledSeasons,
    prefilledChannel,
  ])

  const fetchMediaInfo = async () => {
    const id = Number.parseInt(tmdbId, 10)
    if (!tmdbId || isNaN(id)) {
      setError("Veuillez entrer un ID TMDB valide")
      return
    }

    setSearchLoading(true)
    setError(null)
    setMediaInfo(null)

    try {
      const res = await fetch(`/api/tmdb/${mediaType}/${id}`)

      if (!res.ok) {
        if (res.status === 404) {
          setError("Media non trouve sur TMDB. Verifiez l'ID et le type.")
        } else {
          setError("Erreur lors de la recherche")
        }
        return
      }

      const data = await res.json()
      setMediaInfo({
        title: data.title,
        poster: data.poster || "",
        seasons: data.seasons,
      })
    } catch (err) {
      console.error("[v0] Error fetching media:", err)
      setError("Erreur lors de la recuperation des infos TMDB")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      fetchMediaInfo()
    }
  }

  const getCurrentWWId = () => {
    const season = seasonNumber ? Number.parseInt(seasonNumber, 10) : null
    const episode = episodeNumber ? Number.parseInt(episodeNumber, 10) : null
    return generateWWId(mediaType, Number.parseInt(tmdbId, 10), season, episode)
  }

  const getLinkStatus = () => {
    return userRole === "admin" || userRole === "uploader" ? "approved" : "pending"
  }

  const handleStreamingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaInfo || !userId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const wwId = getCurrentWWId()
    const season = seasonNumber ? Number.parseInt(seasonNumber, 10) : null
    const episode = episodeNumber ? Number.parseInt(episodeNumber, 10) : null
    const status = getLinkStatus()

    const { error: insertError } = await supabase.from("streaming_links").insert({
      tmdb_id: Number.parseInt(tmdbId, 10),
      media_type: mediaType,
      ww_id: wwId,
      source_name: streamingData.source_name,
      source_url: streamingData.source_url,
      quality: streamingData.quality,
      language: streamingData.language,
      season_number: season,
      episode_number: episode,
      is_auto_generated: false,
      submitted_by: userId,
      is_verified: false,
      is_active: true,
      status: status,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      const message =
        status === "pending" ? "Lien streaming soumis - En attente de validation" : "Lien streaming ajoute avec succes!"
      setSuccess(message)
      setStreamingData({ source_name: "", source_url: "", quality: "HD", language: "multi" })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaInfo || !userId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const wwId = getCurrentWWId()
    const season = seasonNumber ? Number.parseInt(seasonNumber, 10) : null
    const episode = episodeNumber ? Number.parseInt(episodeNumber, 10) : null
    const status = getLinkStatus()

    const { error: insertError } = await supabase.from("download_links").insert({
      tmdb_id: Number.parseInt(tmdbId, 10),
      media_type: mediaType,
      ww_id: wwId,
      source_name: downloadData.source_name,
      source_url: downloadData.source_url,
      link_type: downloadData.link_type,
      quality: downloadData.quality,
      file_size: downloadData.file_size || null,
      language: downloadData.language,
      season_number: season,
      episode_number: episode,
      is_auto_generated: false,
      submitted_by: userId,
      is_verified: false,
      is_active: true,
      status: status,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      const message =
        status === "pending"
          ? "Lien telechargement soumis - En attente de validation"
          : "Lien telechargement ajoute avec succes!"
      setSuccess(message)
      setDownloadData({
        source_name: "",
        source_url: "",
        link_type: "direct",
        quality: "HD",
        file_size: "",
        language: "multi",
      })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const handleLiveTvSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()

    const { error: insertError } = await supabase.from("live_tv_channels").insert({
      channel_name: liveTvData.channel_name,
      channel_logo: liveTvData.channel_logo || null,
      stream_url: liveTvData.stream_url,
      category: liveTvData.category,
      country: liveTvData.country,
      language: liveTvData.language,
      quality: liveTvData.quality,
      submitted_by: userId,
      status: status,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      const message =
        status === "pending" ? "Chaine TV soumise - En attente de validation" : "Chaine TV ajoutee avec succes!"
      setSuccess(message)
      setLiveTvData({
        channel_name: "",
        channel_logo: "",
        stream_url: "",
        category: "general",
        country: "fr",
        language: "fr",
        quality: "HD",
      })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const handleLiveTvSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !selectedChannelId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()

    const { error: insertError } = await supabase.from("live_tv_sources").insert({
      channel_id: selectedChannelId,
      source_name: liveTvSourceData.source_name,
      stream_url: liveTvSourceData.stream_url,
      quality: liveTvSourceData.quality,
      is_active: true,
      submitted_by: userId,
      status: status,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      const message =
        status === "pending" ? "Source TV soumise - En attente de validation" : "Source TV ajoutee avec succes!"
      setSuccess(message)
      setLiveTvSourceData({
        source_name: "",
        stream_url: "",
        quality: "HD",
      })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const filteredChannels = existingChannels.filter((ch) =>
    ch.channel_name.toLowerCase().includes(channelSearchQuery.toLowerCase()),
  )

  const selectedChannel = prefilledChannel || existingChannels.find((ch) => ch.id === selectedChannelId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={buttonClassName}>
          {buttonIcon || <Plus className="w-4 h-4 mr-2" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isChannelPrefilled ? `Ajouter une source a ${prefilledChannel?.channel_name}` : "Ajouter un lien"}
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Vous devez etre connecte pour ajouter un lien</p>
            <Button asChild>
              <a href="/auth/login">Se connecter</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {userRole === "member" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-500">
                En tant que membre, vos liens seront soumis a validation par un administrateur.
              </div>
            )}

            {!isPrefilled && !isChannelPrefilled && (
              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "media" | "livetv")}>
                <TabsList className="w-full">
                  <TabsTrigger value="media" className="flex-1">
                    Film / Serie
                  </TabsTrigger>
                  <TabsTrigger value="livetv" className="flex-1">
                    <Tv className="w-4 h-4 mr-2" />
                    TV Live
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Media Tab Content */}
            {mainTab === "media" && !isChannelPrefilled && (
              <>
                {/* Media Selection - only if not prefilled */}
                {!isPrefilled && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">1. Selectionner le media</Label>
                    <div className="flex flex-wrap gap-3">
                      <Input
                        placeholder="ID TMDB"
                        value={tmdbId}
                        onChange={(e) => setTmdbId(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        type="number"
                        className="flex-1 min-w-[120px]"
                      />
                      <Select
                        value={mediaType}
                        onValueChange={(v) => {
                          setMediaType(v as "movie" | "tv")
                          if (v === "movie") {
                            setSeasonNumber("")
                            setEpisodeNumber("")
                          }
                          setMediaInfo(null)
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="movie">Film</SelectItem>
                          <SelectItem value="tv">Serie</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={fetchMediaInfo}
                        disabled={searchLoading || !tmdbId}
                        variant="secondary"
                      >
                        {searchLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Rechercher
                          </>
                        )}
                      </Button>
                    </div>
                    {error && !mediaInfo && <p className="text-sm text-red-500">{error}</p>}
                  </div>
                )}

                {/* Media Info */}
                {mediaInfo && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                      {mediaInfo.poster && (
                        <img
                          src={mediaInfo.poster || "/placeholder.svg"}
                          alt={mediaInfo.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{mediaInfo.title}</p>
                        <p className="text-sm text-muted-foreground">WW ID: {getCurrentWWId()}</p>
                        {mediaInfo.seasons && (
                          <p className="text-xs text-muted-foreground">{mediaInfo.seasons} saison(s)</p>
                        )}
                      </div>
                    </div>

                    {mediaType === "tv" && !isPrefilled && (
                      <div className="flex gap-3 items-end flex-wrap">
                        <div className="space-y-2">
                          <Label>Saison</Label>
                          <Input
                            placeholder="N"
                            value={seasonNumber}
                            onChange={(e) => setSeasonNumber(e.target.value)}
                            type="number"
                            min="0"
                            className="w-20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Episode</Label>
                          <Input
                            placeholder="N"
                            value={episodeNumber}
                            onChange={(e) => setEpisodeNumber(e.target.value)}
                            type="number"
                            min="1"
                            className="w-20"
                            disabled={!seasonNumber}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground pb-2">Optionnel pour un episode specifique</p>
                      </div>
                    )}

                    {/* Link Type Tabs */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">2. Type de lien</Label>
                      <Tabs defaultValue="streaming">
                        <TabsList className="w-full">
                          <TabsTrigger value="streaming" className="flex-1">
                            Streaming
                          </TabsTrigger>
                          <TabsTrigger value="download" className="flex-1">
                            Telechargement
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="streaming" className="space-y-4 mt-4">
                          <form onSubmit={handleStreamingSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Nom de la source</Label>
                                <Input
                                  placeholder="Ex: VidCloud"
                                  value={streamingData.source_name}
                                  onChange={(e) => setStreamingData({ ...streamingData, source_name: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Qualite</Label>
                                <Select
                                  value={streamingData.quality}
                                  onValueChange={(v) => setStreamingData({ ...streamingData, quality: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CAM">CAM</SelectItem>
                                    <SelectItem value="TS">TS</SelectItem>
                                    <SelectItem value="SD">SD</SelectItem>
                                    <SelectItem value="HD">HD</SelectItem>
                                    <SelectItem value="FHD">FHD (1080p)</SelectItem>
                                    <SelectItem value="4K">4K</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>URL du lecteur (iframe)</Label>
                              <Input
                                placeholder="https://..."
                                value={streamingData.source_url}
                                onChange={(e) => setStreamingData({ ...streamingData, source_url: e.target.value })}
                                type="url"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Langue</Label>
                              <Select
                                value={streamingData.language}
                                onValueChange={(v) => setStreamingData({ ...streamingData, language: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="vf">VF (Francais)</SelectItem>
                                  <SelectItem value="vostfr">VOSTFR</SelectItem>
                                  <SelectItem value="vo">VO</SelectItem>
                                  <SelectItem value="multi">Multi</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {success && <p className="text-sm text-green-500">{success}</p>}
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                              {loading ? "Ajout en cours..." : "Ajouter le lien streaming"}
                            </Button>
                          </form>
                        </TabsContent>

                        <TabsContent value="download" className="space-y-4 mt-4">
                          <form onSubmit={handleDownloadSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Nom de la source</Label>
                                <Input
                                  placeholder="Ex: 1fichier"
                                  value={downloadData.source_name}
                                  onChange={(e) => setDownloadData({ ...downloadData, source_name: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Type de lien</Label>
                                <Select
                                  value={downloadData.link_type}
                                  onValueChange={(v) =>
                                    setDownloadData({
                                      ...downloadData,
                                      link_type: v as "direct" | "torrent" | "magnet",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="direct">Direct</SelectItem>
                                    <SelectItem value="torrent">Torrent</SelectItem>
                                    <SelectItem value="magnet">Magnet</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>URL du telechargement</Label>
                              <Input
                                placeholder="https://..."
                                value={downloadData.source_url}
                                onChange={(e) => setDownloadData({ ...downloadData, source_url: e.target.value })}
                                required
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Qualite</Label>
                                <Select
                                  value={downloadData.quality}
                                  onValueChange={(v) => setDownloadData({ ...downloadData, quality: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SD">SD</SelectItem>
                                    <SelectItem value="HD">HD</SelectItem>
                                    <SelectItem value="FHD">FHD</SelectItem>
                                    <SelectItem value="4K">4K</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Taille (opt.)</Label>
                                <Input
                                  placeholder="1.5 GB"
                                  value={downloadData.file_size}
                                  onChange={(e) => setDownloadData({ ...downloadData, file_size: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Langue</Label>
                                <Select
                                  value={downloadData.language}
                                  onValueChange={(v) => setDownloadData({ ...downloadData, language: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="vf">VF</SelectItem>
                                    <SelectItem value="vostfr">VOSTFR</SelectItem>
                                    <SelectItem value="vo">VO</SelectItem>
                                    <SelectItem value="multi">Multi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {success && <p className="text-sm text-green-500">{success}</p>}
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                              {loading ? "Ajout en cours..." : "Ajouter le lien telechargement"}
                            </Button>
                          </form>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Live TV Tab Content */}
            {(mainTab === "livetv" || isChannelPrefilled) && (
              <div className="space-y-4">
                {!isChannelPrefilled && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={liveTvMode === "new" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLiveTvMode("new")}
                    >
                      Nouvelle chaine
                    </Button>
                    <Button
                      variant={liveTvMode === "existing" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLiveTvMode("existing")}
                    >
                      Ajouter une source
                    </Button>
                  </div>
                )}

                {liveTvMode === "new" && !isChannelPrefilled ? (
                  <form onSubmit={handleLiveTvSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom de la chaine</Label>
                        <Input
                          placeholder="Ex: TF1"
                          value={liveTvData.channel_name}
                          onChange={(e) => setLiveTvData({ ...liveTvData, channel_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categorie</Label>
                        <Select
                          value={liveTvData.category}
                          onValueChange={(v) => setLiveTvData({ ...liveTvData, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LIVE_TV_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>URL du logo (optionnel)</Label>
                      <Input
                        placeholder="https://..."
                        value={liveTvData.channel_logo}
                        onChange={(e) => setLiveTvData({ ...liveTvData, channel_logo: e.target.value })}
                        type="url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL du flux (m3u8, etc.)</Label>
                      <Input
                        placeholder="https://..."
                        value={liveTvData.stream_url}
                        onChange={(e) => setLiveTvData({ ...liveTvData, stream_url: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pays</Label>
                        <Input
                          placeholder="fr"
                          value={liveTvData.country}
                          onChange={(e) => setLiveTvData({ ...liveTvData, country: e.target.value })}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Langue</Label>
                        <Input
                          placeholder="fr"
                          value={liveTvData.language}
                          onChange={(e) => setLiveTvData({ ...liveTvData, language: e.target.value })}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Qualite</Label>
                        <Select
                          value={liveTvData.quality}
                          onValueChange={(v) => setLiveTvData({ ...liveTvData, quality: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SD">SD</SelectItem>
                            <SelectItem value="HD">HD</SelectItem>
                            <SelectItem value="FHD">FHD</SelectItem>
                            <SelectItem value="4K">4K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Ajout en cours..." : "Ajouter la chaine TV"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {!isChannelPrefilled && (
                      <>
                        <div className="space-y-2">
                          <Label>Rechercher une chaine</Label>
                          <Input
                            placeholder="Nom de la chaine..."
                            value={channelSearchQuery}
                            onChange={(e) => setChannelSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {filteredChannels.map((channel) => (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => setSelectedChannelId(channel.id)}
                              className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                                selectedChannelId === channel.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {channel.channel_logo ? (
                                <img
                                  src={channel.channel_logo || "/placeholder.svg"}
                                  alt={channel.channel_name}
                                  className="w-10 h-10 object-contain rounded bg-muted"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <Tv className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{channel.channel_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {channel.category} - {channel.country}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {selectedChannel && (
                      <form onSubmit={handleLiveTvSourceSubmit} className="space-y-4 mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Ajouter une source a: <strong>{selectedChannel.channel_name}</strong>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nom de la source</Label>
                            <Input
                              placeholder="Ex: Source HD"
                              value={liveTvSourceData.source_name}
                              onChange={(e) =>
                                setLiveTvSourceData({ ...liveTvSourceData, source_name: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Qualite</Label>
                            <Select
                              value={liveTvSourceData.quality}
                              onValueChange={(v) => setLiveTvSourceData({ ...liveTvSourceData, quality: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SD">SD</SelectItem>
                                <SelectItem value="HD">HD</SelectItem>
                                <SelectItem value="FHD">FHD</SelectItem>
                                <SelectItem value="4K">4K</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>URL du flux</Label>
                          <Input
                            placeholder="https://..."
                            value={liveTvSourceData.stream_url}
                            onChange={(e) => setLiveTvSourceData({ ...liveTvSourceData, stream_url: e.target.value })}
                            required
                          />
                        </div>
                        {success && <p className="text-sm text-green-500">{success}</p>}
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Ajout en cours..." : "Ajouter la source TV"}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
