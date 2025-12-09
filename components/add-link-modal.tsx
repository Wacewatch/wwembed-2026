"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Search,
  Loader2,
  Tv,
  Book,
  Music,
  Gamepad2,
  Package,
  Trash2,
  Film,
  Download,
  Sparkles,
} from "lucide-react"
import type { LiveTVChannel } from "@/lib/types"
import { generateWWId } from "@/lib/tmdb"

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
  // Props for specific modes
  tmdbId?: string // For download mode
  mediaType?: "movie" | "tv" // For download mode
  seasonNumber?: string | null // For download mode
  episodeNumber?: string | null // For download mode
  trigger?: React.ReactNode // Custom trigger element
  mode?: "streaming" | "download" | "livetv" | "digital" // Default is streaming
  digitalContentId?: string // For digital content mode
  digitalWwId?: string // For digital content mode
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
  tmdbId: propTmdbId, // Renamed to avoid conflict with state
  mediaType: propMediaType, // Renamed to avoid conflict with state
  seasonNumber: initialSeasonNumber, // Renamed to avoid conflict with state
  episodeNumber: initialEpisodeNumber, // Renamed to avoid conflict with state
  trigger,
  mode = "streaming",
  digitalContentId,
  digitalWwId,
}: AddLinkModalProps) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "uploader" | "member">("member")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const getInitialMainTab = () => {
    if (mode === "livetv") return "livetv"
    if (mode === "digital") return "digital"
    return "media"
  }

  const [mainTab, setMainTab] = useState<"media" | "livetv" | "digital">(getInitialMainTab())
  const [liveTvMode, setLiveTvMode] = useState<"new" | "existing">("new")
  const [digitalMode, setDigitalMode] = useState<"new" | "existing">("new")
  const [existingDigitalContents, setExistingDigitalContents] = useState<any[]>([])
  const [selectedDigitalContentId, setSelectedDigitalContentId] = useState<string>("")
  const [digitalSearchQuery, setDigitalSearchQuery] = useState("")
  const [existingChannels, setExistingChannels] = useState<LiveTVChannel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string>("")
  const [channelSearchQuery, setChannelSearchQuery] = useState("")

  // Media selection state
  const [tmdbId, setTmdbId] = useState(propTmdbId || "")
  const [mediaType, setMediaType] = useState<"movie" | "tv">(propMediaType || "movie")
  const [seasonNumber, setSeasonNumber] = useState(initialSeasonNumber || "")
  const [episodeNumber, setEpisodeNumber] = useState(initialEpisodeNumber || "")
  const [mediaInfo, setMediaInfo] = useState<{ title: string; poster: string; seasons?: number } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Streaming state
  const [streamingData, setStreamingData] = useState({
    source_name: "",
    source_url: "",
    quality: "HD",
    language: "multi",
  })

  // Download state
  const [downloadData, setDownloadData] = useState({
    source_name: "",
    source_url: "",
    link_type: "direct" as "direct" | "torrent" | "magnet",
    quality: "HD",
    file_size: "",
    language: "multi",
    release_name: "",
    codec_video: "",
    codec_audio: "",
    resolution: "",
    subtitle: "",
    nfo: "",
    has_audio_description: false,
  })

  // Live TV state
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

  // Digital content state
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

  // Download mode specific states
  const [bulkMode, setBulkMode] = useState(false)
  const [fullSeasonMode, setFullSeasonMode] = useState(false)
  const [bulkUrls, setBulkUrls] = useState("")
  const [startEpisode, setStartEpisode] = useState("1")
  const [downloadLinks, setDownloadLinks] = useState([
    {
      source_name: "",
      source_url: "",
      link_type: "direct" as "direct" | "torrent" | "magnet",
      quality: "HD",
      file_size: "",
      language: "multi",
      release_name: "",
      codec_video: "",
      codec_audio: "",
      resolution: "",
      subtitle: "",
      nfo: "",
      has_audio_description: false,
    },
  ])

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

  // Fetch existing channels for Live TV
  useEffect(() => {
    if (open && (mainTab === "livetv" || mode === "livetv")) {
      const fetchChannels = async () => {
        const supabase = createClient()
        const { data } = await supabase.from("live_tv_channels").select("*").order("channel_name")
        if (data) setExistingChannels(data)
      }
      fetchChannels()
    }
  }, [open, mainTab, mode])

  // Fetch existing digital contents for Digital mode
  useEffect(() => {
    if (open && (mainTab === "digital" || mode === "digital")) {
      const fetchDigitalContents = async () => {
        const supabase = createClient()
        const { data, error } = await supabase.from("digital_content").select("*").order("title")
        if (error) {
          console.error("[v0] Error fetching digital content:", error)
        }
        if (data) {
          setExistingDigitalContents(data)
        }
      }
      fetchDigitalContents()
    }
  }, [open, mainTab, mode])

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
        if (mode === "livetv") {
          setMainTab("livetv")
        } else if (mode === "digital") {
          setMainTab("digital")
        } else {
          setMainTab("media")
        }
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
        // Reset digital states if not prefilled
        setDigitalMode("new")
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
        // Reset download specific states
        setBulkMode(false)
        setFullSeasonMode(false)
        setBulkUrls("")
        setStartEpisode("1")
        setDownloadLinks([
          {
            source_name: "",
            source_url: "",
            link_type: "direct",
            quality: "HD",
            file_size: "",
            language: "multi",
            release_name: "",
            codec_video: "",
            codec_audio: "",
            resolution: "",
            subtitle: "",
            nfo: "",
            has_audio_description: false,
          },
        ])
      }
    }
  }, [
    open,
    mode,
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

  const addDownloadLink = () => {
    setDownloadLinks([
      ...downloadLinks,
      {
        source_name: downloadLinks[0]?.source_name || "",
        source_url: "",
        link_type: downloadLinks[0]?.link_type || "direct",
        quality: downloadLinks[0]?.quality || "HD",
        file_size: "",
        language: downloadLinks[0]?.language || "multi",
        release_name: "",
        codec_video: downloadLinks[0]?.codec_video || "",
        codec_audio: downloadLinks[0]?.codec_audio || "",
        resolution: downloadLinks[0]?.resolution || "",
        subtitle: downloadLinks[0]?.subtitle || "",
        nfo: "",
        has_audio_description: downloadLinks[0]?.has_audio_description || false,
      },
    ])
  }

  const removeDownloadLink = (index: number) => {
    if (downloadLinks.length > 1) {
      setDownloadLinks(downloadLinks.filter((_, i) => i !== index))
    }
  }

  const updateDownloadLink = (index: number, field: string, value: any) => {
    const updated = [...downloadLinks]
    updated[index] = { ...updated[index], [field]: value }
    setDownloadLinks(updated)
  }

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaInfo || !userId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()

    try {
      // Mode bulk: une URL par ligne pour chaque épisode
      if (bulkMode && mediaType === "tv" && seasonNumber) {
        const urls = bulkUrls.split("\n").filter((url) => url.trim())
        if (urls.length === 0) {
          setError("Veuillez entrer au moins une URL")
          setLoading(false)
          return
        }

        const startEp = Number.parseInt(startEpisode, 10) || 1
        const insertData = urls.map((url, index) => {
          const episodeNum = startEp + index
          const wwId = `ww${tmdbId}s${seasonNumber}e${episodeNum}`
          return {
            tmdb_id: Number.parseInt(tmdbId, 10),
            media_type: mediaType,
            ww_id: wwId,
            source_name: downloadLinks[0].source_name,
            source_url: url.trim(),
            link_type: downloadLinks[0].link_type,
            quality: downloadLinks[0].quality,
            file_size: downloadLinks[0].file_size || null,
            language: downloadLinks[0].language,
            season_number: Number.parseInt(seasonNumber, 10),
            episode_number: episodeNum,
            is_auto_generated: false,
            submitted_by: userId,
            is_verified: false,
            is_active: true,
            status: status,
            release_name: downloadLinks[0].release_name || null,
            codec_video: downloadLinks[0].codec_video || null,
            codec_audio: downloadLinks[0].codec_audio || null,
            resolution: downloadLinks[0].resolution || null,
            subtitle: downloadLinks[0].subtitle || null,
            nfo: downloadLinks[0].nfo || null,
            has_audio_description: downloadLinks[0].has_audio_description,
          }
        })

        const { error: insertError } = await supabase.from("download_links").insert(insertData)

        if (insertError) {
          setError(insertError.message)
        } else {
          setSuccess(`${urls.length} liens ajoutés avec succès!`)
          setBulkUrls("")
          setTimeout(() => {
            setOpen(false)
            setSuccess(null)
            onSuccess?.()
          }, 1500)
        }
      }
      // Mode saison complète
      else if (fullSeasonMode && mediaType === "tv" && seasonNumber) {
        const wwId = `ww${tmdbId}s${seasonNumber}`
        const insertData = downloadLinks.map((link) => ({
          tmdb_id: Number.parseInt(tmdbId, 10),
          media_type: mediaType,
          ww_id: wwId,
          source_name: link.source_name,
          source_url: link.source_url,
          link_type: link.link_type,
          quality: link.quality,
          file_size: link.file_size || null,
          language: link.language,
          season_number: Number.parseInt(seasonNumber, 10),
          episode_number: null, // null = saison complète
          is_auto_generated: false,
          submitted_by: userId,
          is_verified: false,
          is_active: true,
          status: status,
          release_name: link.release_name || null,
          codec_video: link.codec_video || null,
          codec_audio: link.codec_audio || null,
          resolution: link.resolution || null,
          subtitle: link.subtitle || null,
          nfo: link.nfo || null,
          has_audio_description: link.has_audio_description,
        }))

        const { error: insertError } = await supabase.from("download_links").insert(insertData)

        if (insertError) {
          setError(insertError.message)
        } else {
          setSuccess(`${downloadLinks.length} lien(s) saison complète ajouté(s)!`)
          setTimeout(() => {
            setOpen(false)
            setSuccess(null)
            onSuccess?.()
          }, 1500)
        }
      }
      // Mode normal: plusieurs liens
      else {
        const season = seasonNumber ? Number.parseInt(seasonNumber, 10) : null
        const episode = episodeNumber ? Number.parseInt(episodeNumber, 10) : null
        const wwId = getCurrentWWId()

        const insertData = downloadLinks.map((link) => ({
          tmdb_id: Number.parseInt(tmdbId, 10),
          media_type: mediaType,
          ww_id: wwId,
          source_name: link.source_name,
          source_url: link.source_url,
          link_type: link.link_type,
          quality: link.quality,
          file_size: link.file_size || null,
          language: link.language,
          season_number: season,
          episode_number: episode,
          is_auto_generated: false,
          submitted_by: userId,
          is_verified: false,
          is_active: true,
          status: status,
          release_name: link.release_name || null,
          codec_video: link.codec_video || null,
          codec_audio: link.codec_audio || null,
          resolution: link.resolution || null,
          subtitle: link.subtitle || null,
          nfo: link.nfo || null,
          has_audio_description: link.has_audio_description,
        }))

        const { error: insertError } = await supabase.from("download_links").insert(insertData)

        if (insertError) {
          setError(insertError.message)
        } else {
          const message =
            status === "pending"
              ? `${downloadLinks.length} lien(s) soumis - En attente de validation`
              : `${downloadLinks.length} lien(s) ajouté(s) avec succès!`
          setSuccess(message)
          setDownloadLinks([
            {
              source_name: "",
              source_url: "",
              link_type: "direct",
              quality: "HD",
              file_size: "",
              language: "multi",
              release_name: "",
              codec_video: "",
              codec_audio: "",
              resolution: "",
              subtitle: "",
              nfo: "",
              has_audio_description: false,
            },
          ])
          setTimeout(() => {
            setOpen(false)
            setSuccess(null)
            onSuccess?.()
          }, 1500)
        }
      }
    } catch (err) {
      setError("Erreur lors de l'ajout des liens")
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

  const handleDigitalLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (!selectedDigitalContentId) {
      setError("Veuillez selectionner un contenu")
      return
    }

    if (!digitalLinkData.source_name || !digitalLinkData.download_url) {
      setError("Le nom de la source et l'URL sont requis")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()

    const { error: linkError } = await supabase.from("digital_download_links").insert({
      content_id: selectedDigitalContentId,
      source_name: digitalLinkData.source_name,
      source_url: digitalLinkData.download_url,
      reader_url: digitalLinkData.reader_url || null,
      file_format: digitalLinkData.file_format || null,
      file_size: digitalLinkData.file_size || null,
      quality: digitalLinkData.quality || null,
      language: digitalLinkData.language,
      submitted_by: userId,
      status: status,
    })

    if (linkError) {
      setError(linkError.message)
    } else {
      const message = status === "pending" ? "Lien soumis - En attente de validation" : "Lien ajoute avec succes!"
      setSuccess(message)
      setDigitalLinkData({
        source_name: "",
        download_url: "",
        reader_url: "",
        file_format: "",
        file_size: "",
        quality: "",
        language: "fr",
      })
      setSelectedDigitalContentId("")
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const handleDigitalSubmit = async () => {
    // Check if digital content info is filled (only if not adding a link to existing content)
    if (!digitalContentData.title) {
      setError("Le titre est requis")
      return
    }

    // Handle the case where we are adding a link to an existing digital content
    if (digitalMode === "existing" && selectedDigitalContentId) {
      return handleDigitalLinkSubmit(new Event("submit") as React.FormEvent)
    }

    // Proceed with creating new digital content and its link
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

  // Filter digital content
  const filteredDigitalContents = existingDigitalContents.filter(
    (content) =>
      content.title.toLowerCase().includes(digitalSearchQuery.toLowerCase()) &&
      content.content_type === digitalContentType,
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
      {trigger ? (
        <DialogTrigger asChild onClick={() => setOpen(true)}>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant={buttonVariant} className={buttonClassName}>
            {buttonIcon || <Plus className="w-4 h-4 mr-2" />}
            {buttonText}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {mode === "livetv"
              ? "Ajouter une chaine TV"
              : mode === "digital"
                ? "Ajouter un contenu digital"
                : "Ajouter un lien"}
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-zinc-500" />
            </div>
            <p className="text-zinc-400">Vous devez etre connecte pour ajouter un lien</p>
            <Button onClick={() => (window.location.href = "/auth/login")} className="bg-primary hover:bg-primary/90">
              Se connecter
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {mode === "streaming" && !isPrefilled && !isChannelPrefilled && (
              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "media" | "livetv" | "digital")}>
                <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1">
                  <TabsTrigger
                    value="media"
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Film / Serie
                  </TabsTrigger>
                  <TabsTrigger
                    value="livetv"
                    className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    <Tv className="w-4 h-4 mr-2" />
                    TV Live
                  </TabsTrigger>
                  <TabsTrigger
                    value="digital"
                    className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                  >
                    <Book className="w-4 h-4 mr-2" />
                    Digital
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {(mainTab === "media" || mode === "streaming" || mode === "download") && !isChannelPrefilled && (
              <>
                {/* Media Selection - only if not prefilled and not in download mode */}
                {!(isPrefilled || mode === "download") && (
                  <div className="space-y-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        1
                      </div>
                      Selectionner le media
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      <Input
                        placeholder="ID TMDB"
                        value={tmdbId}
                        onChange={(e) => setTmdbId(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        type="number"
                        className="flex-1 min-w-[120px] bg-zinc-900 border-zinc-700 focus:border-primary"
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
                        <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="movie">Film</SelectItem>
                          <SelectItem value="tv">Serie</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={fetchMediaInfo}
                        disabled={searchLoading || !tmdbId}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white"
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
                    {error && !mediaInfo && <p className="text-sm text-red-400">{error}</p>}
                  </div>
                )}

                {/* Media Info */}
                {mediaInfo && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-cyan-500/10 rounded-xl border border-primary/20">
                      {mediaInfo.poster && (
                        <img
                          src={mediaInfo.poster || "/placeholder.svg"}
                          alt={mediaInfo.title}
                          className="w-16 h-24 object-cover rounded-lg shadow-lg"
                        />
                      )}
                      <div>
                        <p className="font-bold text-lg text-foreground">{mediaInfo.title}</p>
                        <p className="text-sm text-primary font-mono">WW ID: {getCurrentWWId()}</p>
                        {mediaInfo.seasons && <p className="text-xs text-zinc-400">{mediaInfo.seasons} saison(s)</p>}
                      </div>
                    </div>

                    {/* Mode Download Specifics */}
                    {mode === "download" && (
                      <>
                        {mediaType === "tv" && (
                          <div className="space-y-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-4">
                              <div className="space-y-2">
                                <Label>Saison</Label>
                                <Input
                                  placeholder="N°"
                                  value={seasonNumber}
                                  onChange={(e) => setSeasonNumber(e.target.value)}
                                  type="number"
                                  min="0"
                                  className="w-20 bg-zinc-900 border-zinc-700 focus:border-primary"
                                />
                              </div>
                              {!fullSeasonMode && !bulkMode && (
                                <div className="space-y-2">
                                  <Label>Episode</Label>
                                  <Input
                                    placeholder="N°"
                                    value={episodeNumber}
                                    onChange={(e) => setEpisodeNumber(e.target.value)}
                                    type="number"
                                    min="1"
                                    className="w-20 bg-zinc-900 border-zinc-700 focus:border-primary"
                                    disabled={!seasonNumber}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Options spéciales pour séries */}
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="fullSeason"
                                  checked={fullSeasonMode}
                                  onCheckedChange={(checked) => {
                                    setFullSeasonMode(!!checked)
                                    if (checked) {
                                      setBulkMode(false)
                                      setEpisodeNumber("")
                                    }
                                  }}
                                  disabled={!seasonNumber}
                                />
                                <label htmlFor="fullSeason" className="text-sm font-medium">
                                  Saison complète
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="bulkMode"
                                  checked={bulkMode}
                                  onCheckedChange={(checked) => {
                                    setBulkMode(!!checked)
                                    if (checked) {
                                      setFullSeasonMode(false)
                                      setEpisodeNumber("")
                                    }
                                  }}
                                  disabled={!seasonNumber}
                                />
                                <label htmlFor="bulkMode" className="text-sm font-medium">
                                  Mode multi-épisodes (1 URL par ligne)
                                </label>
                              </div>
                            </div>

                            {bulkMode && (
                              <div className="space-y-2">
                                <Label>Épisode de départ</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={startEpisode}
                                  onChange={(e) => setStartEpisode(e.target.value)}
                                  className="w-24 bg-zinc-900 border-zinc-700 focus:border-primary"
                                />
                                <p className="text-xs text-zinc-400">
                                  Le premier lien sera l'épisode {startEpisode}, le suivant l'épisode{" "}
                                  {Number.parseInt(startEpisode) + 1}, etc.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <form
                          onSubmit={handleDownloadSubmit}
                          className="space-y-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
                        >
                          {/* Infos communes pour tous les liens */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nom de la source</Label>
                              <Input
                                placeholder="Ex: 1fichier"
                                value={downloadLinks[0].source_name}
                                onChange={(e) => updateDownloadLink(0, "source_name", e.target.value)}
                                required
                                className="bg-zinc-900 border-zinc-700 focus:border-primary"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Type de lien</Label>
                              <Select
                                value={downloadLinks[0].link_type}
                                onValueChange={(v) => updateDownloadLink(0, "link_type", v)}
                              >
                                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  <SelectItem value="direct">Direct</SelectItem>
                                  <SelectItem value="torrent">Torrent</SelectItem>
                                  <SelectItem value="magnet">Magnet</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Mode bulk: textarea pour les URLs */}
                          {bulkMode ? (
                            <div className="space-y-2">
                              <Label>URLs (une par ligne)</Label>
                              <Textarea
                                placeholder="https://exemple.com/episode1&#10;https://exemple.com/episode2&#10;https://exemple.com/episode3"
                                value={bulkUrls}
                                onChange={(e) => setBulkUrls(e.target.value)}
                                rows={8}
                                required
                                className="bg-zinc-900 border-zinc-700 focus:border-primary"
                              />
                              <p className="text-xs text-zinc-400">
                                {bulkUrls.split("\n").filter((u) => u.trim()).length} URL(s) détectée(s)
                              </p>
                            </div>
                          ) : (
                            /* Mode normal: liste de liens */
                            <div className="space-y-4">
                              {downloadLinks.map((link, index) => (
                                <div key={index} className="p-4 border rounded-xl bg-zinc-900 space-y-4 relative">
                                  {downloadLinks.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-400"
                                      onClick={() => removeDownloadLink(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {downloadLinks.length > 1 && (
                                    <p className="text-sm font-medium text-zinc-400">Lien #{index + 1}</p>
                                  )}

                                  <div className="space-y-2">
                                    <Label>URL du téléchargement {downloadLinks.length > 1 && `#${index + 1}`}</Label>
                                    <Input
                                      placeholder="https://..."
                                      value={link.source_url}
                                      onChange={(e) => updateDownloadLink(index, "source_url", e.target.value)}
                                      required
                                      className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>Qualité</Label>
                                      <Select
                                        value={link.quality}
                                        onValueChange={(v) => updateDownloadLink(index, "quality", v)}
                                      >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800">
                                          <SelectItem value="SD">SD</SelectItem>
                                          <SelectItem value="HD">HD</SelectItem>
                                          <SelectItem value="FHD">FHD</SelectItem>
                                          <SelectItem value="4K">4K</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Taille</Label>
                                      <Input
                                        placeholder="1.5 GB"
                                        value={link.file_size}
                                        onChange={(e) => updateDownloadLink(index, "file_size", e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Langue</Label>
                                      <Input
                                        placeholder="Ex: VF, VOSTFR, Multi"
                                        value={link.language}
                                        onChange={(e) => updateDownloadLink(index, "language", e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Nom de la release</Label>
                                      <Input
                                        placeholder="Ex: The.Movie.2023.1080p.BluRay.x265-GROUP"
                                        value={link.release_name}
                                        onChange={(e) => updateDownloadLink(index, "release_name", e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Resolution</Label>
                                      <Select
                                        value={link.resolution}
                                        onValueChange={(v) => updateDownloadLink(index, "resolution", v)}
                                      >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                          <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800">
                                          <SelectItem value="480p">480p</SelectItem>
                                          <SelectItem value="720p">720p</SelectItem>
                                          <SelectItem value="1080p">1080p</SelectItem>
                                          <SelectItem value="2160p">2160p (4K)</SelectItem>
                                          <SelectItem value="4320p">4320p (8K)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Codec Video</Label>
                                      <Select
                                        value={link.codec_video}
                                        onValueChange={(v) => updateDownloadLink(index, "codec_video", v)}
                                      >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                          <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800">
                                          <SelectItem value="x264">x264</SelectItem>
                                          <SelectItem value="x265">x265 / HEVC</SelectItem>
                                          <SelectItem value="AV1">AV1</SelectItem>
                                          <SelectItem value="VP9">VP9</SelectItem>
                                          <SelectItem value="MPEG-4">MPEG-4</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Codec Audio</Label>
                                      <Select
                                        value={link.codec_audio}
                                        onValueChange={(v) => updateDownloadLink(index, "codec_audio", v)}
                                      >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                          <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800">
                                          <SelectItem value="AAC">AAC</SelectItem>
                                          <SelectItem value="AC3">AC3 / Dolby Digital</SelectItem>
                                          <SelectItem value="DTS">DTS</SelectItem>
                                          <SelectItem value="DTS-HD MA">DTS-HD MA</SelectItem>
                                          <SelectItem value="TrueHD">TrueHD</SelectItem>
                                          <SelectItem value="Atmos">Dolby Atmos</SelectItem>
                                          <SelectItem value="FLAC">FLAC</SelectItem>
                                          <SelectItem value="MP3">MP3</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Sous-titres</Label>
                                      <Input
                                        placeholder="Ex: FR, EN, Multi"
                                        value={link.subtitle}
                                        onChange={(e) => updateDownloadLink(index, "subtitle", e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-6">
                                      <Checkbox
                                        id={`ad-${index}`}
                                        checked={link.has_audio_description}
                                        onCheckedChange={(checked) =>
                                          updateDownloadLink(index, "has_audio_description", !!checked)
                                        }
                                      />
                                      <label htmlFor={`ad-${index}`} className="text-sm font-medium">
                                        Audio Description (AD)
                                      </label>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>NFO (optionnel)</Label>
                                    <Textarea
                                      placeholder="Coller le contenu du fichier NFO ici..."
                                      value={link.nfo}
                                      onChange={(e) => updateDownloadLink(index, "nfo", e.target.value)}
                                      rows={2}
                                      className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                    />
                                  </div>
                                </div>
                              ))}

                              {/* Bouton pour ajouter un lien */}
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-transparent border-zinc-700 hover:bg-zinc-900/50"
                                onClick={addDownloadLink}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter un autre lien
                              </Button>
                            </div>
                          )}

                          {success && <p className="text-sm text-green-400">{success}</p>}
                          {error && <p className="text-sm text-red-400">{error}</p>}

                          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                            {loading
                              ? "Ajout en cours..."
                              : bulkMode
                                ? `Ajouter ${bulkUrls.split("\n").filter((u) => u.trim()).length} liens`
                                : `Ajouter ${downloadLinks.length} lien(s)`}
                          </Button>
                        </form>
                      </>
                    )}

                    {/* Link Type Tabs - Only show if not in download mode */}
                    {mode !== "download" && (
                      <div className="space-y-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            2
                          </div>
                          Type de lien
                        </Label>
                        <Tabs defaultValue="streaming">
                          <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1">
                            <TabsTrigger
                              value="streaming"
                              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Streaming
                            </TabsTrigger>
                            <TabsTrigger
                              value="download"
                              className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Telechargement
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="streaming" className="space-y-4 mt-4">
                            <form
                              onSubmit={handleStreamingSubmit}
                              className="space-y-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Nom de la source</Label>
                                  <Input
                                    placeholder="Ex: VidCloud"
                                    value={streamingData.source_name}
                                    onChange={(e) =>
                                      setStreamingData({ ...streamingData, source_name: e.target.value })
                                    }
                                    required
                                    className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Qualite</Label>
                                  <Select
                                    value={streamingData.quality}
                                    onValueChange={(v) => setStreamingData({ ...streamingData, quality: v })}
                                  >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700">
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
                                  className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Langue</Label>
                                <Select
                                  value={streamingData.language}
                                  onValueChange={(v) => setStreamingData({ ...streamingData, language: v })}
                                >
                                  <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-700">
                                    <SelectItem value="vf">VF (Francais)</SelectItem>
                                    <SelectItem value="vostfr">VOSTFR</SelectItem>
                                    <SelectItem value="vo">VO</SelectItem>
                                    <SelectItem value="multi">Multi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {success && <p className="text-sm text-green-400">{success}</p>}
                              {error && <p className="text-sm text-red-400">{error}</p>}
                              <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90"
                                disabled={loading}
                              >
                                {loading ? "Ajout en cours..." : "Ajouter le lien streaming"}
                              </Button>
                            </form>
                          </TabsContent>

                          <TabsContent value="download" className="space-y-4 mt-4">
                            {mediaType === "tv" && (
                              <div className="space-y-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                <div className="flex items-center gap-4">
                                  <div className="space-y-2">
                                    <Label>Saison</Label>
                                    <Input
                                      placeholder="N°"
                                      value={seasonNumber}
                                      onChange={(e) => setSeasonNumber(e.target.value)}
                                      type="number"
                                      min="0"
                                      className="w-20 bg-zinc-900 border-zinc-700 focus:border-primary"
                                    />
                                  </div>
                                  {!fullSeasonMode && !bulkMode && (
                                    <div className="space-y-2">
                                      <Label>Episode</Label>
                                      <Input
                                        placeholder="N°"
                                        value={episodeNumber}
                                        onChange={(e) => setEpisodeNumber(e.target.value)}
                                        type="number"
                                        min="1"
                                        className="w-20 bg-zinc-900 border-zinc-700 focus:border-primary"
                                        disabled={!seasonNumber}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="fullSeasonTab"
                                      checked={fullSeasonMode}
                                      onCheckedChange={(checked) => {
                                        setFullSeasonMode(!!checked)
                                        if (checked) {
                                          setBulkMode(false)
                                          setEpisodeNumber("")
                                        }
                                      }}
                                      disabled={!seasonNumber}
                                    />
                                    <label htmlFor="fullSeasonTab" className="text-sm font-medium">
                                      Saison complète
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="bulkModeTab"
                                      checked={bulkMode}
                                      onCheckedChange={(checked) => {
                                        setBulkMode(!!checked)
                                        if (checked) {
                                          setFullSeasonMode(false)
                                          setEpisodeNumber("")
                                        }
                                      }}
                                      disabled={!seasonNumber}
                                    />
                                    <label htmlFor="bulkModeTab" className="text-sm font-medium">
                                      Mode multi-épisodes (1 URL par ligne)
                                    </label>
                                  </div>
                                </div>

                                {bulkMode && (
                                  <div className="space-y-2">
                                    <Label>Épisode de départ</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={startEpisode}
                                      onChange={(e) => setStartEpisode(e.target.value)}
                                      className="w-24 bg-zinc-900 border-zinc-700 focus:border-primary"
                                    />
                                    <p className="text-xs text-zinc-400">
                                      Le premier lien sera E{startEpisode.padStart(2, "0")}, le suivant E
                                      {String(Number.parseInt(startEpisode) + 1).padStart(2, "0")}, etc.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            <form
                              onSubmit={handleDownloadSubmit}
                              className="space-y-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
                            >
                              {/* Infos communes */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Nom de la source</Label>
                                  <Input
                                    placeholder="Ex: 1fichier"
                                    value={downloadLinks[0].source_name}
                                    onChange={(e) => updateDownloadLink(0, "source_name", e.target.value)}
                                    required
                                    className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Type de lien</Label>
                                  <Select
                                    value={downloadLinks[0].link_type}
                                    onValueChange={(v) => updateDownloadLink(0, "link_type", v)}
                                  >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700">
                                      <SelectItem value="direct">Direct</SelectItem>
                                      <SelectItem value="torrent">Torrent</SelectItem>
                                      <SelectItem value="magnet">Magnet</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {bulkMode ? (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>URLs (une par ligne)</Label>
                                    <Textarea
                                      placeholder={
                                        "https://exemple.com/episode1\nhttps://exemple.com/episode2\nhttps://exemple.com/episode3"
                                      }
                                      value={bulkUrls}
                                      onChange={(e) => setBulkUrls(e.target.value)}
                                      rows={8}
                                      required
                                      className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                    />
                                    <p className="text-xs text-zinc-400">
                                      {bulkUrls.split("\n").filter((u) => u.trim()).length} URL(s) détectée(s)
                                    </p>
                                  </div>
                                  {/* Infos communes pour le mode bulk */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>Qualité</Label>
                                      <Select
                                        value={downloadLinks[0].quality}
                                        onValueChange={(v) => updateDownloadLink(0, "quality", v)}
                                      >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                          <SelectItem value="SD">SD</SelectItem>
                                          <SelectItem value="HD">HD</SelectItem>
                                          <SelectItem value="FHD">FHD</SelectItem>
                                          <SelectItem value="4K">4K</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Langue</Label>
                                      <Select
                                        value={downloadLinks[0].language}
                                        onValueChange={(v) => updateDownloadLink(0, "language", v)}
                                      >
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                          <SelectItem value="vf">VF</SelectItem>
                                          <SelectItem value="vostfr">VOSTFR</SelectItem>
                                          <SelectItem value="vo">VO</SelectItem>
                                          <SelectItem value="multi">Multi</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Resolution</Label>
                                      <Input
                                        placeholder="Ex: 1080p"
                                        value={downloadLinks[0].resolution}
                                        onChange={(e) => updateDownloadLink(0, "resolution", e.target.value)}
                                        className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Codec Video</Label>
                                      <Input
                                        placeholder="Ex: x264, x265"
                                        value={downloadLinks[0].codec_video}
                                        onChange={(e) => updateDownloadLink(0, "codec_video", e.target.value)}
                                        className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Codec Audio</Label>
                                      <Input
                                        placeholder="Ex: DTS, AC3"
                                        value={downloadLinks[0].codec_audio}
                                        onChange={(e) => updateDownloadLink(0, "codec_audio", e.target.value)}
                                        className="bg-zinc-900 border-zinc-700 focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Mode normal: liste de liens avec bouton ajouter */
                                <div className="space-y-4">
                                  {downloadLinks.map((link, index) => (
                                    <div key={index} className="p-4 border rounded-xl bg-zinc-900 space-y-4 relative">
                                      {downloadLinks.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-400"
                                          onClick={() => removeDownloadLink(index)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}

                                      {downloadLinks.length > 1 && (
                                        <p className="text-sm font-medium text-zinc-400">Lien #{index + 1}</p>
                                      )}

                                      <div className="space-y-2">
                                        <Label>URL du téléchargement</Label>
                                        <Input
                                          placeholder="https://..."
                                          value={link.source_url}
                                          onChange={(e) => updateDownloadLink(index, "source_url", e.target.value)}
                                          required
                                          className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                        />
                                      </div>

                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                          <Label>Qualité</Label>
                                          <Select
                                            value={link.quality}
                                            onValueChange={(v) => updateDownloadLink(index, "quality", v)}
                                          >
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-950 border-zinc-800">
                                              <SelectItem value="SD">SD</SelectItem>
                                              <SelectItem value="HD">HD</SelectItem>
                                              <SelectItem value="FHD">FHD</SelectItem>
                                              <SelectItem value="4K">4K</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Taille</Label>
                                          <Input
                                            placeholder="1.5 GB"
                                            value={link.file_size}
                                            onChange={(e) => updateDownloadLink(index, "file_size", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Langue</Label>
                                          <Input
                                            placeholder="Ex: VF, VOSTFR, Multi"
                                            value={link.language}
                                            onChange={(e) => updateDownloadLink(index, "language", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Nom de la release</Label>
                                          <Input
                                            placeholder="Ex: Movie.2023.1080p.BluRay"
                                            value={link.release_name}
                                            onChange={(e) => updateDownloadLink(index, "release_name", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Codec Video</Label>
                                          <Input
                                            placeholder="Ex: x264, x265"
                                            value={link.codec_video}
                                            onChange={(e) => updateDownloadLink(index, "codec_video", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Codec Audio</Label>
                                          <Input
                                            placeholder="Ex: DTS-HD MA, AC3"
                                            value={link.codec_audio}
                                            onChange={(e) => updateDownloadLink(index, "codec_audio", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Resolution</Label>
                                          <Input
                                            placeholder="Ex: 1080p, 2160p"
                                            value={link.resolution}
                                            onChange={(e) => updateDownloadLink(index, "resolution", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Sous-titres</Label>
                                          <Input
                                            placeholder="Ex: FR, EN, Multi"
                                            value={link.subtitle}
                                            onChange={(e) => updateDownloadLink(index, "subtitle", e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                          />
                                        </div>
                                        <div className="flex items-center space-x-2 pt-6">
                                          <Checkbox
                                            id={`audioDesc-${index}`}
                                            checked={link.has_audio_description}
                                            onCheckedChange={(checked) =>
                                              updateDownloadLink(index, "has_audio_description", !!checked)
                                            }
                                          />
                                          <label htmlFor={`audioDesc-${index}`} className="text-sm font-medium">
                                            Audio Description (AD)
                                          </label>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>NFO (optionnel)</Label>
                                        <Textarea
                                          placeholder="Coller le contenu NFO..."
                                          value={link.nfo}
                                          onChange={(e) => updateDownloadLink(index, "nfo", e.target.value)}
                                          rows={2}
                                          className="bg-zinc-950 border-zinc-800 focus:border-primary"
                                        />
                                      </div>
                                    </div>
                                  ))}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full bg-transparent border-zinc-700 hover:bg-zinc-900/50"
                                    onClick={addDownloadLink}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Ajouter un autre lien
                                  </Button>
                                </div>
                              )}

                              {success && <p className="text-sm text-green-400">{success}</p>}
                              {error && <p className="text-sm text-red-400">{error}</p>}

                              <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90"
                                disabled={loading}
                              >
                                {loading
                                  ? "Ajout en cours..."
                                  : bulkMode
                                    ? `Ajouter ${bulkUrls.split("\n").filter((u) => u.trim()).length} liens`
                                    : `Ajouter ${downloadLinks.length} lien(s)`}
                              </Button>
                            </form>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {(mainTab === "livetv" || mode === "livetv") && (
              <div className="space-y-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                {!isChannelPrefilled && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={liveTvMode === "new" ? "default" : "outline"}
                      size="sm"
                      className={liveTvMode === "new" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                      onClick={() => setLiveTvMode("new")}
                    >
                      Nouvelle chaine
                    </Button>
                    <Button
                      variant={liveTvMode === "existing" ? "default" : "outline"}
                      size="sm"
                      className={liveTvMode === "existing" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
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
                          className="bg-zinc-950 border-zinc-800 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categorie</Label>
                        <Select
                          value={liveTvData.category}
                          onValueChange={(v) => setLiveTvData({ ...liveTvData, category: v })}
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800">
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
                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL du flux</Label>
                      <Input
                        placeholder="https://... ou m3u8"
                        value={liveTvData.stream_url}
                        onChange={(e) => setLiveTvData({ ...liveTvData, stream_url: e.target.value })}
                        required
                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pays</Label>
                        <Select
                          value={liveTvData.country}
                          onValueChange={(v) => setLiveTvData({ ...liveTvData, country: v })}
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800">
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
                          <SelectTrigger className="bg-zinc-950 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800">
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
                          <SelectTrigger className="bg-zinc-950 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800">
                            <SelectItem value="SD">SD</SelectItem>
                            <SelectItem value="HD">HD</SelectItem>
                            <SelectItem value="FHD">FHD</SelectItem>
                            <SelectItem value="4K">4K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {success && <p className="text-sm text-green-400">{success}</p>}
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                      {loading ? "Ajout en cours..." : "Ajouter la chaine TV"}
                    </Button>
                  </form>
                ) : liveTvMode === "existing" && !isChannelPrefilled ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rechercher une chaine</Label>
                      <Input
                        placeholder="Rechercher..."
                        value={channelSearchQuery}
                        onChange={(e) => setChannelSearchQuery(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-zinc-800 rounded-md bg-zinc-950">
                      {filteredChannels.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${
                            selectedChannelId === channel.id
                              ? "bg-primary/20 hover:bg-primary/30 text-primary"
                              : "hover:bg-zinc-800"
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
                        <p className="p-4 text-center text-zinc-500">Aucune chaine trouvee</p>
                      )}
                    </div>

                    {selectedChannelId && (
                      <form
                        onSubmit={handleLiveTvSourceSubmit}
                        className="space-y-4 mt-4 pt-4 border-t border-zinc-800"
                      >
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-600">
                            3
                          </div>
                          URL du flux
                        </Label>
                        <Input
                          placeholder="https://... ou m3u8"
                          value={liveTvSourceData.stream_url}
                          onChange={(e) => setLiveTvSourceData({ ...liveTvSourceData, stream_url: e.target.value })}
                          required
                          className="bg-zinc-950 border-zinc-800 focus:border-primary"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Qualite</Label>
                            <Select
                              value={liveTvSourceData.quality}
                              onValueChange={(v) => setLiveTvSourceData({ ...liveTvSourceData, quality: v })}
                            >
                              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-zinc-800">
                                <SelectItem value="SD">SD</SelectItem>
                                <SelectItem value="HD">HD</SelectItem>
                                <SelectItem value="FHD">FHD</SelectItem>
                                <SelectItem value="4K">4K</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Langue</Label>
                            <Select
                              value={liveTvSourceData.language}
                              onValueChange={(v) => setLiveTvSourceData({ ...liveTvSourceData, language: v })}
                            >
                              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-zinc-800">
                                <SelectItem value="fr">Francais</SelectItem>
                                <SelectItem value="en">Anglais</SelectItem>
                                <SelectItem value="multi">Multi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {success && <p className="text-sm text-green-400">{success}</p>}
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                          {loading ? "Ajout en cours..." : "Ajouter la source"}
                        </Button>
                      </form>
                    )}
                  </div>
                ) : isChannelPrefilled ? (
                  <form onSubmit={handleLiveTvSourceSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL du flux</Label>
                      <Input
                        placeholder="https://... ou m3u8"
                        value={liveTvSourceData.stream_url}
                        onChange={(e) => setLiveTvSourceData({ ...liveTvSourceData, stream_url: e.target.value })}
                        required
                        className="bg-zinc-950 border-zinc-800 focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Qualite</Label>
                        <Select
                          value={liveTvSourceData.quality}
                          onValueChange={(v) => setLiveTvSourceData({ ...liveTvSourceData, quality: v })}
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800">
                            <SelectItem value="SD">SD</SelectItem>
                            <SelectItem value="HD">HD</SelectItem>
                            <SelectItem value="FHD">FHD</SelectItem>
                            <SelectItem value="4K">4K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Langue</Label>
                        <Select
                          value={liveTvSourceData.language}
                          onValueChange={(v) => setLiveTvSourceData({ ...liveTvSourceData, language: v })}
                        >
                          <SelectTrigger className="bg-zinc-950 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800">
                            <SelectItem value="fr">Francais</SelectItem>
                            <SelectItem value="en">Anglais</SelectItem>
                            <SelectItem value="multi">Multi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {success && <p className="text-sm text-green-400">{success}</p>}
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                      {loading ? "Ajout en cours..." : "Ajouter la source"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-zinc-400">Veuillez selectionner une chaine ou creer une nouvelle.</p>
                  </div>
                )}
              </div>
            )}

            {(mainTab === "digital" || mode === "digital") && (
              <div className="space-y-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={digitalMode === "new" ? "default" : "outline"}
                    size="sm"
                    className={
                      digitalMode === "new"
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                    }
                    onClick={() => setDigitalMode("new")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau contenu
                  </Button>
                  <Button
                    variant={digitalMode === "existing" ? "default" : "outline"}
                    size="sm"
                    className={
                      digitalMode === "existing"
                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                    }
                    onClick={() => setDigitalMode("existing")}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Ajouter un lien
                  </Button>
                </div>
                {/* Content Type Selection - Always visible */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-600/20 flex items-center justify-center text-xs font-bold text-amber-600">
                      1
                    </div>
                    Type de contenu
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DIGITAL_CONTENT_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant={digitalContentType === type.value ? "default" : "outline"}
                          className={`flex flex-col h-20 gap-1 transition-colors ${
                            digitalContentType === type.value
                              ? "bg-amber-600 text-white hover:bg-amber-500"
                              : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                          }`}
                          onClick={() => {
                            setDigitalContentType(type.value as typeof digitalContentType)
                            setSelectedDigitalContentId("")
                          }}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {digitalMode === "existing" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-xs font-bold text-purple-600">
                          2
                        </div>
                        Selectionner un contenu existant
                      </Label>
                      <Input
                        placeholder="Rechercher un contenu..."
                        value={digitalSearchQuery}
                        onChange={(e) => setDigitalSearchQuery(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 focus:border-purple-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-lg bg-zinc-950/50">
                      {filteredDigitalContents.length > 0 ? (
                        filteredDigitalContents.map((content) => (
                          <button
                            key={content.id}
                            type="button"
                            className={`w-full flex items-center gap-3 p-3 text-left transition-all border-b border-zinc-800/50 last:border-0 ${
                              selectedDigitalContentId === content.id
                                ? "bg-purple-600/20 text-purple-400"
                                : "hover:bg-zinc-800/50"
                            }`}
                            onClick={() => setSelectedDigitalContentId(content.id)}
                          >
                            {content.cover_url ? (
                              <img
                                src={content.cover_url || "/placeholder.svg"}
                                alt={content.title}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-zinc-800 rounded flex items-center justify-center">
                                {digitalContentType === "ebook" && <Book className="w-5 h-5 text-zinc-500" />}
                                {digitalContentType === "music" && <Music className="w-5 h-5 text-zinc-500" />}
                                {digitalContentType === "software" && <Package className="w-5 h-5 text-zinc-500" />}
                                {digitalContentType === "game" && <Gamepad2 className="w-5 h-5 text-zinc-500" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{content.title}</p>
                              {content.author && <p className="text-xs text-zinc-400 truncate">{content.author}</p>}
                            </div>
                            {selectedDigitalContentId === content.id && (
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="text-center py-6 text-zinc-500">
                          Aucun contenu de type "
                          {DIGITAL_CONTENT_TYPES.find((t) => t.value === digitalContentType)?.label}" trouve
                        </p>
                      )}
                    </div>

                    {selectedDigitalContentId && (
                      <form onSubmit={handleDigitalLinkSubmit} className="space-y-4 mt-4 pt-4 border-t border-zinc-800">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-600">
                            3
                          </div>
                          Informations du lien
                        </Label>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nom de la source *</Label>
                            <Input
                              placeholder="Ex: Mega, 1fichier"
                              value={digitalLinkData.source_name}
                              onChange={(e) => setDigitalLinkData({ ...digitalLinkData, source_name: e.target.value })}
                              required
                              className="bg-zinc-950 border-zinc-800 focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <Input
                              placeholder={getFormatSuggestions()}
                              value={digitalLinkData.file_format}
                              onChange={(e) => setDigitalLinkData({ ...digitalLinkData, file_format: e.target.value })}
                              className="bg-zinc-950 border-zinc-800 focus:border-blue-500"
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
                            className="bg-zinc-950 border-zinc-800 focus:border-blue-500"
                          />
                        </div>

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
                              className="bg-zinc-950 border-zinc-800 focus:border-blue-500"
                            />
                            <p className="text-xs text-zinc-500">
                              {digitalContentType === "ebook"
                                ? "URL pour lire le PDF en ligne"
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
                              className="bg-zinc-950 border-zinc-800 focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Qualite</Label>
                            <Input
                              placeholder={digitalContentType === "music" ? "320kbps" : "HD"}
                              value={digitalLinkData.quality}
                              onChange={(e) => setDigitalLinkData({ ...digitalLinkData, quality: e.target.value })}
                              className="bg-zinc-950 border-zinc-800 focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Langue</Label>
                            <Select
                              value={digitalLinkData.language}
                              onValueChange={(v) => setDigitalLinkData({ ...digitalLinkData, language: v })}
                            >
                              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-700">
                                <SelectItem value="fr">Francais</SelectItem>
                                <SelectItem value="en">Anglais</SelectItem>
                                <SelectItem value="multi">Multi</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {success && <p className="text-sm text-green-400">{success}</p>}
                        {error && <p className="text-sm text-red-400">{error}</p>}

                        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500" disabled={loading}>
                          {loading ? "Ajout en cours..." : "Ajouter le lien"}
                        </Button>
                      </form>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Content Info - Only for new content */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          2
                        </div>
                        Informations du contenu
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Titre *</Label>
                          <Input
                            placeholder="Titre du contenu"
                            value={digitalContentData.title}
                            onChange={(e) => setDigitalContentData({ ...digitalContentData, title: e.target.value })}
                            required
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{getAuthorLabel()}</Label>
                          <Input
                            placeholder={getAuthorLabel()}
                            value={digitalContentData.author}
                            onChange={(e) => setDigitalContentData({ ...digitalContentData, author: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Description du contenu (optionnel)"
                          value={digitalContentData.description}
                          onChange={(e) =>
                            setDigitalContentData({ ...digitalContentData, description: e.target.value })
                          }
                          rows={2}
                          className="bg-zinc-950 border-zinc-800 focus:border-primary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>URL de la couverture</Label>
                          <Input
                            placeholder="https://..."
                            value={digitalContentData.cover_url}
                            onChange={(e) =>
                              setDigitalContentData({ ...digitalContentData, cover_url: e.target.value })
                            }
                            type="url"
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Version</Label>
                          <Input
                            placeholder="Ex: 1.0, 2024"
                            value={digitalContentData.version}
                            onChange={(e) => setDigitalContentData({ ...digitalContentData, version: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Link Info */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-600">
                          3
                        </div>
                        Lien de telechargement
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom de la source *</Label>
                          <Input
                            placeholder="Ex: Mega, 1fichier"
                            value={digitalLinkData.source_name}
                            onChange={(e) => setDigitalLinkData({ ...digitalLinkData, source_name: e.target.value })}
                            required
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Format</Label>
                          <Input
                            placeholder={getFormatSuggestions()}
                            value={digitalLinkData.file_format}
                            onChange={(e) => setDigitalLinkData({ ...digitalLinkData, file_format: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
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
                          className="bg-zinc-950 border-zinc-800 focus:border-primary"
                        />
                      </div>
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
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                          <p className="text-xs text-zinc-500">
                            {digitalContentType === "ebook"
                              ? "URL pour lire le PDF en ligne"
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
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Qualite</Label>
                          <Input
                            placeholder={digitalContentType === "music" ? "320kbps" : "HD"}
                            value={digitalLinkData.quality}
                            onChange={(e) => setDigitalLinkData({ ...digitalLinkData, quality: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Langue</Label>
                          <Select
                            value={digitalLinkData.language}
                            onValueChange={(v) => setDigitalLinkData({ ...digitalLinkData, language: v })}
                          >
                            <SelectTrigger className="bg-zinc-950 border-zinc-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                              <SelectItem value="fr">Francais</SelectItem>
                              <SelectItem value="en">Anglais</SelectItem>
                              <SelectItem value="multi">Multi</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {success && <p className="text-sm text-green-400">{success}</p>}
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button
                      type="button"
                      className="w-full bg-amber-600 hover:bg-amber-500"
                      disabled={loading}
                      onClick={handleDigitalSubmit}
                    >
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
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
