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
import { Textarea } from "@/components/ui/textarea"
import { generateWWId } from "@/lib/tmdb"
import { Plus, Search, Loader2, Tv, Book, Music, Gamepad2, Package } from "lucide-react"
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

const DIGITAL_CONTENT_TYPES = [
  { value: "ebook", label: "Ebook", icon: Book },
  { value: "music", label: "Musique", icon: Music },
  { value: "software", label: "Logiciel", icon: Package },
  { value: "game", label: "Jeu", icon: Gamepad2 },
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

  const [mainTab, setMainTab] = useState<"media" | "livetv" | "digital">("media")
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

  const [digitalContentType, setDigitalContentType] = useState<"ebook" | "music" | "software" | "game">("ebook")
  const [digitalContentData, setDigitalContentData] = useState({
    title: "",
    author: "",
    description: "",
    cover_url: "",
    version: "",
  })
  const [digitalLinkData, setDigitalLinkData] = useState({
    source_name: "",
    download_url: "",
    reader_url: "",
    file_format: "",
    file_size: "",
    quality: "",
    language: "fr",
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
        setDigitalContentType("ebook")
        setDigitalContentData({
          title: "",
          author: "",
          description: "",
          cover_url: "",
          version: "",
        })
        setDigitalLinkData({
          source_name: "",
          download_url: "",
          reader_url: "",
          file_format: "",
          file_size: "",
          quality: "",
          language: "fr",
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

  const generateDigitalWWId = () => {
    const prefix =
      digitalContentType === "ebook"
        ? "ww-ebook"
        : digitalContentType === "music"
          ? "ww-music"
          : digitalContentType === "software"
            ? "ww-soft"
            : "ww-game"
    const randomId = Math.floor(100000 + Math.random() * 900000)
    return `${prefix}-${randomId}`
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
    if (!userId) return
    const channelId = prefilledChannel?.id || selectedChannelId
    if (!channelId) {
      setError("Veuillez selectionner une chaine")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()

    const { error: insertError } = await supabase.from("live_tv_sources").insert({
      channel_id: channelId,
      source_name: liveTvSourceData.source_name,
      stream_url: liveTvSourceData.stream_url,
      quality: liveTvSourceData.quality,
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

  const handleDigitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (!digitalContentData.title) {
      setError("Le titre est requis")
      return
    }

    if (!digitalLinkData.source_name || !digitalLinkData.download_url) {
      setError("Le nom de la source et l'URL de telechargement sont requis")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()
    const wwId = generateDigitalWWId()

    // First create the digital content
    const { data: contentData, error: contentError } = await supabase
      .from("digital_content")
      .insert({
        ww_id: wwId,
        content_type: digitalContentType,
        title: digitalContentData.title,
        author: digitalContentData.author || null,
        description: digitalContentData.description || null,
        cover_url: digitalContentData.cover_url || null,
        version: digitalContentData.version || null,
        submitted_by: userId,
        status: status,
        is_active: true,
      })
      .select()
      .single()

    if (contentError) {
      setError(contentError.message)
      setLoading(false)
      return
    }

    // Then create the download link
    const { error: linkError } = await supabase.from("digital_download_links").insert({
      content_id: contentData.id,
      ww_id: wwId,
      source_name: digitalLinkData.source_name,
      source_url: digitalLinkData.download_url,
      reader_url: digitalLinkData.reader_url || null,
      file_format: digitalLinkData.file_format || null,
      file_size: digitalLinkData.file_size || null,
      quality: digitalLinkData.quality || null,
      language: digitalLinkData.language,
      submitted_by: userId,
      status: status,
      is_active: true,
    })

    if (linkError) {
      setError(linkError.message)
    } else {
      const typeLabel =
        digitalContentType === "ebook"
          ? "Ebook"
          : digitalContentType === "music"
            ? "Musique"
            : digitalContentType === "software"
              ? "Logiciel"
              : "Jeu"
      const message =
        status === "pending" ? `${typeLabel} soumis - En attente de validation` : `${typeLabel} ajoute avec succes!`
      setSuccess(message)
      setDigitalContentData({
        title: "",
        author: "",
        description: "",
        cover_url: "",
        version: "",
      })
      setDigitalLinkData({
        source_name: "",
        download_url: "",
        reader_url: "",
        file_format: "",
        file_size: "",
        quality: "",
        language: "fr",
      })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const filteredChannels = existingChannels.filter((c) =>
    c.channel_name.toLowerCase().includes(channelSearchQuery.toLowerCase()),
  )

  const getAuthorLabel = () => {
    switch (digitalContentType) {
      case "ebook":
        return "Auteur"
      case "music":
        return "Artiste"
      case "software":
      case "game":
        return "Developpeur"
      default:
        return "Auteur"
    }
  }

  const getFormatSuggestions = () => {
    switch (digitalContentType) {
      case "ebook":
        return "PDF, EPUB, MOBI"
      case "music":
        return "MP3, FLAC, WAV"
      case "software":
        return "EXE, DMG, ZIP"
      case "game":
        return "ISO, ZIP, EXE"
      default:
        return ""
    }
  }

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
          <DialogTitle>Ajouter un lien</DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Vous devez etre connecte pour ajouter un lien</p>
            <Button onClick={() => (window.location.href = "/auth/login")}>Se connecter</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Type Selection */}
            {!isPrefilled && !isChannelPrefilled && (
              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "media" | "livetv" | "digital")}>
                <TabsList className="w-full">
                  <TabsTrigger value="media" className="flex-1">
                    Film / Serie
                  </TabsTrigger>
                  <TabsTrigger value="digital" className="flex-1">
                    <Book className="w-4 h-4 mr-2" />
                    Digital
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

            {mainTab === "digital" && !isChannelPrefilled && !isPrefilled && (
              <div className="space-y-6">
                {/* Content Type Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">1. Type de contenu</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DIGITAL_CONTENT_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant={digitalContentType === type.value ? "default" : "outline"}
                          className="flex flex-col h-20 gap-1"
                          onClick={() => setDigitalContentType(type.value as typeof digitalContentType)}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Content Info */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">2. Informations du contenu</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Titre *</Label>
                      <Input
                        placeholder="Titre du contenu"
                        value={digitalContentData.title}
                        onChange={(e) => setDigitalContentData({ ...digitalContentData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{getAuthorLabel()}</Label>
                      <Input
                        placeholder={getAuthorLabel()}
                        value={digitalContentData.author}
                        onChange={(e) => setDigitalContentData({ ...digitalContentData, author: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Description du contenu (optionnel)"
                      value={digitalContentData.description}
                      onChange={(e) => setDigitalContentData({ ...digitalContentData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>URL de la couverture</Label>
                      <Input
                        placeholder="https://..."
                        value={digitalContentData.cover_url}
                        onChange={(e) => setDigitalContentData({ ...digitalContentData, cover_url: e.target.value })}
                        type="url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input
                        placeholder="Ex: 1.0, 2024"
                        value={digitalContentData.version}
                        onChange={(e) => setDigitalContentData({ ...digitalContentData, version: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Link Info */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">3. Lien de telechargement</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom de la source *</Label>
                      <Input
                        placeholder="Ex: Mega, 1fichier"
                        value={digitalLinkData.source_name}
                        onChange={(e) => setDigitalLinkData({ ...digitalLinkData, source_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Input
                        placeholder={getFormatSuggestions()}
                        value={digitalLinkData.file_format}
                        onChange={(e) => setDigitalLinkData({ ...digitalLinkData, file_format: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>URL de telechargement *</Label>
                    <Input
                      placeholder="https://..."
                      value={digitalLinkData.download_url}
                      onChange={(e) => setDigitalLinkData({ ...digitalLinkData, download_url: e.target.value })}
                      type="url"
                      required
                    />
                  </div>
                  {/* Show reader URL only for ebook and music */}
                  {(digitalContentType === "ebook" || digitalContentType === "music") && (
                    <div className="space-y-2">
                      <Label>
                        URL de lecture {digitalContentType === "ebook" ? "(lecteur PDF)" : "(lecteur audio)"}
                      </Label>
                      <Input
                        placeholder="https://... (optionnel, pour la lecture en ligne)"
                        value={digitalLinkData.reader_url}
                        onChange={(e) => setDigitalLinkData({ ...digitalLinkData, reader_url: e.target.value })}
                        type="url"
                      />
                      <p className="text-xs text-muted-foreground">
                        {digitalContentType === "ebook"
                          ? "URL pour lire le PDF en ligne (sera affiche dans le lecteur)"
                          : "URL du fichier audio pour l'ecoute en ligne"}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Taille</Label>
                      <Input
                        placeholder="100 MB"
                        value={digitalLinkData.file_size}
                        onChange={(e) => setDigitalLinkData({ ...digitalLinkData, file_size: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qualite</Label>
                      <Input
                        placeholder={digitalContentType === "music" ? "320kbps" : "HD"}
                        value={digitalLinkData.quality}
                        onChange={(e) => setDigitalLinkData({ ...digitalLinkData, quality: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Langue</Label>
                      <Select
                        value={digitalLinkData.language}
                        onValueChange={(v) => setDigitalLinkData({ ...digitalLinkData, language: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Francais</SelectItem>
                          <SelectItem value="en">Anglais</SelectItem>
                          <SelectItem value="multi">Multi</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {success && <p className="text-sm text-green-500">{success}</p>}
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="button" className="w-full" disabled={loading} onClick={handleDigitalSubmit}>
                  {loading
                    ? "Ajout en cours..."
                    : `Ajouter le ${
                        digitalContentType === "ebook"
                          ? "ebook"
                          : digitalContentType === "music"
                            ? "morceau"
                            : digitalContentType === "software"
                              ? "logiciel"
                              : "jeu"
                      }`}
                </Button>
              </div>
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
                      <Label>URL du flux</Label>
                      <Input
                        placeholder="https://... ou m3u8"
                        value={liveTvData.stream_url}
                        onChange={(e) => setLiveTvData({ ...liveTvData, stream_url: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pays</Label>
                        <Select
                          value={liveTvData.country}
                          onValueChange={(v) => setLiveTvData({ ...liveTvData, country: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">France</SelectItem>
                            <SelectItem value="be">Belgique</SelectItem>
                            <SelectItem value="ch">Suisse</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="us">USA</SelectItem>
                            <SelectItem value="uk">UK</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Langue</Label>
                        <Select
                          value={liveTvData.language}
                          onValueChange={(v) => setLiveTvData({ ...liveTvData, language: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">Francais</SelectItem>
                            <SelectItem value="en">Anglais</SelectItem>
                            <SelectItem value="multi">Multi</SelectItem>
                          </SelectContent>
                        </Select>
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
                            placeholder="Rechercher..."
                            value={channelSearchQuery}
                            onChange={(e) => setChannelSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto border rounded-md">
                          {filteredChannels.map((channel) => (
                            <button
                              key={channel.id}
                              type="button"
                              className={`w-full flex items-center gap-3 p-2 hover:bg-secondary/50 text-left ${
                                selectedChannelId === channel.id ? "bg-secondary" : ""
                              }`}
                              onClick={() => setSelectedChannelId(channel.id)}
                            >
                              {channel.channel_logo && (
                                <img
                                  src={channel.channel_logo || "/placeholder.svg"}
                                  alt={channel.channel_name}
                                  className="w-8 h-8 object-contain"
                                />
                              )}
                              <span>{channel.channel_name}</span>
                            </button>
                          ))}
                          {filteredChannels.length === 0 && (
                            <p className="text-center py-4 text-muted-foreground">Aucune chaine trouvee</p>
                          )}
                        </div>
                      </>
                    )}

                    {(selectedChannelId || isChannelPrefilled) && (
                      <form onSubmit={handleLiveTvSourceSubmit} className="space-y-4">
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
                            placeholder="https://... ou m3u8"
                            value={liveTvSourceData.stream_url}
                            onChange={(e) => setLiveTvSourceData({ ...liveTvSourceData, stream_url: e.target.value })}
                            required
                          />
                        </div>
                        {success && <p className="text-sm text-green-500">{success}</p>}
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Ajout en cours..." : "Ajouter la source"}
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
