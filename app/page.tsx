"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { EmbedUrls } from "@/components/embed-urls"
import { DigitalEmbedUrls } from "@/components/digital-embed-urls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPosterUrl, getBackdropUrl, getStillUrl, type TMDBSearchResult } from "@/lib/tmdb"
import { AddLinkModal } from "@/components/add-link-modal"
import { AddDigitalContentModal } from "@/components/add-digital-content-modal"
import { Plus, Book, Music, Monitor, Gamepad2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PlatformStats } from "@/components/platform-stats"
import type {
  StreamingLink,
  DownloadLink as DLLink,
  TMDBMovie,
  TMDBTVShow,
  TMDBEpisode,
  LiveTVChannel,
  DigitalContent,
  DigitalContentType,
} from "@/lib/types"

interface MediaResult {
  tmdbData: TMDBMovie | TMDBTVShow | null
  episodeData?: TMDBEpisode | null
  streamingLinks: StreamingLink[]
  downloadLinks: DLLink[]
  wwId: string
  seasonNumber?: number | null
  episodeNumber?: number | null
}

interface DigitalResult {
  content: DigitalContent
  links: any[]
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"media" | "live" | "digital">("media")

  const [searchMode, setSearchMode] = useState<"id" | "title">("id")
  const [tmdbId, setTmdbId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie")
  const [seasonNumber, setSeasonNumber] = useState("")
  const [episodeNumber, setEpisodeNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [result, setResult] = useState<MediaResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [channels, setChannels] = useState<LiveTVChannel[]>([])
  const [channelSearch, setChannelSearch] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<LiveTVChannel | null>(null)
  const [loadingChannels, setLoadingChannels] = useState(false)

  const [digitalContentType, setDigitalContentType] = useState<DigitalContentType>("ebook")
  const [digitalContents, setDigitalContents] = useState<DigitalContent[]>([])
  const [digitalSearch, setDigitalSearch] = useState("")
  const [selectedDigital, setSelectedDigital] = useState<DigitalContent | null>(null)
  const [loadingDigital, setLoadingDigital] = useState(false)

  useEffect(() => {
    if (activeTab === "live") {
      fetchChannels()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "digital") {
      fetchDigitalContent()
    }
  }, [activeTab, digitalContentType])

  const fetchChannels = async () => {
    setLoadingChannels(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("live_tv_channels")
        .select("*")
        .eq("is_active", true)
        .eq("status", "approved")
        .order("channel_name")
      setChannels(data || [])
    } catch (e) {
      console.error("Error fetching channels:", e)
    } finally {
      setLoadingChannels(false)
    }
  }

  const fetchDigitalContent = async () => {
    setLoadingDigital(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("digital_content")
        .select("*")
        .eq("content_type", digitalContentType)
        .eq("is_active", true)
        .eq("status", "approved")
        .order("title")
      setDigitalContents(data || [])
    } catch (e) {
      console.error("Error fetching digital content:", e)
    } finally {
      setLoadingDigital(false)
    }
  }

  const handleTitleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setShowResults(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch (e) {
      console.error("Search error:", e)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSelectResult = (item: TMDBSearchResult) => {
    setTmdbId(item.id.toString())
    setMediaType(item.media_type)
    setSearchQuery("")
    setShowResults(false)
    setSearchResults([])
    setSearchMode("id")
    handleSearchById(item.id.toString(), item.media_type)
  }

  const handleSearchById = async (id?: string, type?: "movie" | "tv") => {
    const searchId = id || tmdbId
    const searchType = type || mediaType

    if (!searchId) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let url = `/api/media/${searchType}/${searchId}`
      const params = new URLSearchParams()
      if (searchType === "tv" && seasonNumber) {
        params.set("season", seasonNumber)
        if (episodeNumber) {
          params.set("episode", episodeNumber)
        }
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error("Media non trouve")
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => handleSearchById()

  const getTitle = () => {
    if (!result?.tmdbData) return ""
    const mainTitle = "title" in result.tmdbData ? result.tmdbData.title : result.tmdbData.name
    if (result.episodeData) {
      return `${mainTitle} - S${result.seasonNumber}E${result.episodeNumber}: ${result.episodeData.name}`
    }
    if (result.seasonNumber) {
      return `${mainTitle} - Saison ${result.seasonNumber}`
    }
    return mainTitle
  }

  const getPoster = () => {
    if (result?.episodeData?.still_path) {
      return getStillUrl(result.episodeData.still_path)
    }
    if (!result?.tmdbData) return undefined
    return getBackdropUrl(result.tmdbData.backdrop_path)
  }

  const getMediaPoster = () => {
    if (!result?.tmdbData) return undefined
    return getPosterUrl(result.tmdbData.poster_path, "w200") || undefined
  }

  const getSeasons = () => {
    if (!result?.tmdbData) return undefined
    return "number_of_seasons" in result.tmdbData ? result.tmdbData.number_of_seasons : undefined
  }

  const filteredChannels = channels.filter(
    (ch) =>
      ch.channel_name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      ch.category.toLowerCase().includes(channelSearch.toLowerCase()) ||
      ch.country.toLowerCase().includes(channelSearch.toLowerCase()),
  )

  const filteredDigitalContents = digitalContents.filter(
    (c) =>
      c.title.toLowerCase().includes(digitalSearch.toLowerCase()) ||
      (c.author && c.author.toLowerCase().includes(digitalSearch.toLowerCase())),
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            <span className="text-primary">WW</span>Embed
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Agregateur de liens streaming et telechargement. Integrez facilement un lecteur ou des liens sur votre site
            via nos APIs.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-card rounded-lg border border-border p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "media" | "live" | "digital")}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="media">Films & Series</TabsTrigger>
                <TabsTrigger value="live">TV Live</TabsTrigger>
                <TabsTrigger value="digital">Digital</TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={searchMode === "id" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchMode("id")}
                  >
                    Par ID TMDB
                  </Button>
                  <Button
                    variant={searchMode === "title" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchMode("title")}
                  >
                    Par Titre
                  </Button>
                </div>

                {searchMode === "title" ? (
                  <div className="relative">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Rechercher un film ou une serie..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTitleSearch()}
                        className="flex-1"
                      />
                      <Button onClick={handleTitleSearch} disabled={searchLoading || !searchQuery.trim()}>
                        {searchLoading ? "..." : "Rechercher"}
                      </Button>
                    </div>

                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        {searchResults.map((item) => (
                          <button
                            key={`${item.media_type}-${item.id}`}
                            onClick={() => handleSelectResult(item)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                          >
                            <img
                              src={getPosterUrl(item.poster_path, "w92") || "/placeholder.svg"}
                              alt={item.title || item.name}
                              className="w-12 h-16 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{item.title || item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.media_type === "movie" ? "Film" : "Serie"} -{" "}
                                {(item.release_date || item.first_air_date)?.split("-")[0] || "N/A"}
                              </p>
                            </div>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              {item.vote_average.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showResults && searchResults.length === 0 && !searchLoading && (
                      <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg p-4 text-center text-muted-foreground">
                        Aucun resultat trouve
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Input
                      placeholder="ID TMDB (ex: 617120)"
                      value={tmdbId}
                      onChange={(e) => setTmdbId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="flex-1 min-w-[150px]"
                      type="number"
                    />
                    <Select
                      value={mediaType}
                      onValueChange={(v) => {
                        setMediaType(v as "movie" | "tv")
                        if (v === "movie") {
                          setSeasonNumber("")
                          setEpisodeNumber("")
                        }
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
                    {mediaType === "tv" && (
                      <>
                        <Input
                          placeholder="Saison"
                          value={seasonNumber}
                          onChange={(e) => setSeasonNumber(e.target.value)}
                          className="w-24"
                          type="number"
                          min="0"
                        />
                        <Input
                          placeholder="Episode"
                          value={episodeNumber}
                          onChange={(e) => setEpisodeNumber(e.target.value)}
                          className="w-24"
                          type="number"
                          min="1"
                          disabled={!seasonNumber}
                        />
                      </>
                    )}
                    <Button onClick={handleSearch} disabled={loading || !tmdbId}>
                      {loading ? "Chargement..." : "Rechercher"}
                    </Button>
                  </div>
                )}

                {mediaType === "tv" && searchMode === "id" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Laissez saison/episode vides pour voir la serie complete, ou specifiez pour un episode precis.
                  </p>
                )}
                {error && <p className="text-destructive text-sm mt-3">{error}</p>}
              </TabsContent>

              <TabsContent value="live" className="space-y-4">
                <Input
                  placeholder="Rechercher une chaine par nom, categorie ou pays..."
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                />

                {loadingChannels ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement des chaines...</div>
                ) : filteredChannels.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {channels.length === 0 ? "Aucune chaine disponible" : "Aucune chaine trouvee"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto">
                    {filteredChannels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          selectedChannel?.id === channel.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted"
                        }`}
                      >
                        {channel.channel_logo ? (
                          <img
                            src={channel.channel_logo || "/placeholder.svg"}
                            alt={channel.channel_name}
                            className="w-full h-12 object-contain mb-2"
                          />
                        ) : (
                          <div className="w-full h-12 bg-muted rounded flex items-center justify-center mb-2">
                            <span className="text-xs text-muted-foreground">No Logo</span>
                          </div>
                        )}
                        <p className="font-medium text-sm text-foreground truncate">{channel.channel_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.category} - {channel.country}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="digital" className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={digitalContentType === "ebook" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDigitalContentType("ebook")
                      setSelectedDigital(null)
                    }}
                    className="gap-2"
                  >
                    <Book className="w-4 h-4" />
                    Ebooks
                  </Button>
                  <Button
                    variant={digitalContentType === "music" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDigitalContentType("music")
                      setSelectedDigital(null)
                    }}
                    className="gap-2"
                  >
                    <Music className="w-4 h-4" />
                    Musique
                  </Button>
                  <Button
                    variant={digitalContentType === "software" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDigitalContentType("software")
                      setSelectedDigital(null)
                    }}
                    className="gap-2"
                  >
                    <Monitor className="w-4 h-4" />
                    Logiciels
                  </Button>
                  <Button
                    variant={digitalContentType === "game" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDigitalContentType("game")
                      setSelectedDigital(null)
                    }}
                    className="gap-2"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Jeux
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Input
                    placeholder="Rechercher par titre ou auteur..."
                    value={digitalSearch}
                    onChange={(e) => setDigitalSearch(e.target.value)}
                    className="flex-1"
                  />
                  <AddDigitalContentModal
                    buttonVariant="outline"
                    buttonText="Ajouter"
                    onSuccess={fetchDigitalContent}
                  />
                </div>

                {loadingDigital ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                ) : filteredDigitalContents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {digitalContents.length === 0 ? "Aucun contenu disponible" : "Aucun resultat"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto">
                    {filteredDigitalContents.map((content) => (
                      <button
                        key={content.id}
                        onClick={() => setSelectedDigital(content)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          selectedDigital?.id === content.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {content.cover_url ? (
                          <img
                            src={content.cover_url || "/placeholder.svg"}
                            alt={content.title}
                            className="w-full h-20 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-20 bg-secondary rounded mb-2 flex items-center justify-content-center">
                            {digitalContentType === "ebook" && (
                              <Book className="w-8 h-8 text-muted-foreground mx-auto" />
                            )}
                            {digitalContentType === "music" && (
                              <Music className="w-8 h-8 text-muted-foreground mx-auto" />
                            )}
                            {digitalContentType === "software" && (
                              <Monitor className="w-8 h-8 text-muted-foreground mx-auto" />
                            )}
                            {digitalContentType === "game" && (
                              <Gamepad2 className="w-8 h-8 text-muted-foreground mx-auto" />
                            )}
                          </div>
                        )}
                        <p className="text-sm font-medium truncate">{content.title}</p>
                        {content.author && <p className="text-xs text-muted-foreground truncate">{content.author}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Live TV Results Section */}
        {activeTab === "live" && selectedChannel && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-4">
                  {selectedChannel.channel_logo && (
                    <img
                      src={selectedChannel.channel_logo || "/placeholder.svg"}
                      alt={selectedChannel.channel_name}
                      className="w-16 h-16 object-contain"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{selectedChannel.channel_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedChannel.category} - {selectedChannel.country} - {selectedChannel.quality}
                    </p>
                  </div>
                </div>
                <AddLinkModal
                  prefilledChannel={selectedChannel}
                  buttonVariant="outline"
                  buttonText="Ajouter une source"
                  buttonIcon={<Plus className="w-4 h-4 mr-2" />}
                  onSuccess={fetchChannels}
                />
              </div>

              <div className="bg-muted rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">URL Embed Lecteur:</p>
                <code className="text-xs text-primary break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/live/ww-live-{selectedChannel.id}
                </code>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`/api/v1/live/ww-live-${selectedChannel.id}`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          </div>
        )}

        {/* Media Results Section */}
        {activeTab === "media" && result && (
          <div className="space-y-8">
            {/* Media Info */}
            {result.tmdbData && (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url(${getPoster()})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
                <div className="p-6 flex gap-6 -mt-20 relative">
                  <img
                    src={getPosterUrl(result.tmdbData.poster_path, "w200") || "/placeholder.svg"}
                    alt={getTitle()}
                    className="w-32 h-48 object-cover rounded-lg shadow-lg"
                  />
                  <div className="pt-16 flex-1">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">{getTitle()}</h2>
                        <p className="text-muted-foreground text-sm mt-2 line-clamp-3">
                          {result.episodeData?.overview || result.tmdbData.overview}
                        </p>
                      </div>
                      <AddLinkModal
                        prefilledTmdbId={Number.parseInt(tmdbId)}
                        prefilledMediaType={mediaType}
                        prefilledTitle={getTitle()}
                        prefilledPoster={getMediaPoster()}
                        prefilledSeasonNumber={result.seasonNumber}
                        prefilledEpisodeNumber={result.episodeNumber}
                        prefilledSeasons={getSeasons()}
                        buttonVariant="outline"
                        buttonText="Ajouter un lien"
                        onSuccess={handleSearch}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Embed URLs */}
            <EmbedUrls wwId={result.wwId} />

            {/* Streaming & Download Test */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-primary">●</span> Lecteur Streaming
                </h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={`/api/v1/streaming/${result.wwId}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-primary">↓</span> Telechargements
                </h3>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <iframe src={`/api/v1/download/${result.wwId}`} className="w-full h-full border-0" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Digital Content Results Section */}
        {activeTab === "digital" && selectedDigital && (
          <div className="space-y-6">
            {/* Digital Content Info */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex gap-4">
                {selectedDigital.cover_url ? (
                  <img
                    src={selectedDigital.cover_url || "/placeholder.svg"}
                    alt={selectedDigital.title}
                    className="w-24 h-32 object-cover rounded"
                  />
                ) : (
                  <div className="w-24 h-32 bg-secondary rounded flex items-center justify-center">
                    {digitalContentType === "ebook" && <Book className="w-10 h-10 text-muted-foreground" />}
                    {digitalContentType === "music" && <Music className="w-10 h-10 text-muted-foreground" />}
                    {digitalContentType === "software" && <Monitor className="w-10 h-10 text-muted-foreground" />}
                    {digitalContentType === "game" && <Gamepad2 className="w-10 h-10 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedDigital.title}</h2>
                  {selectedDigital.author && <p className="text-muted-foreground">{selectedDigital.author}</p>}
                  {selectedDigital.version && (
                    <p className="text-sm text-muted-foreground">Version: {selectedDigital.version}</p>
                  )}
                  {selectedDigital.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{selectedDigital.description}</p>
                  )}
                  <span className="inline-block mt-2 bg-primary/20 text-primary text-xs px-2 py-1 rounded capitalize">
                    {digitalContentType}
                  </span>
                </div>
              </div>
            </div>

            {/* Digital Embed URLs */}
            <DigitalEmbedUrls
              wwId={selectedDigital.ww_id}
              contentType={selectedDigital.content_type}
              title={selectedDigital.title}
            />

            {/* Digital Content Preview */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Show player preview only for ebook and music */}
              {(digitalContentType === "ebook" || digitalContentType === "music") && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-primary">●</span>{" "}
                    {digitalContentType === "ebook" ? "Lecteur Ebook" : "Lecteur Audio"}
                  </h3>
                  <div
                    className={`bg-black rounded-lg overflow-hidden ${digitalContentType === "music" ? "h-[400px]" : "aspect-video"}`}
                  >
                    <iframe
                      src={
                        digitalContentType === "ebook"
                          ? `/api/v1/ebook/${selectedDigital.ww_id}`
                          : `/api/v1/music/${selectedDigital.ww_id}`
                      }
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              )}
              <div className={digitalContentType === "ebook" || digitalContentType === "music" ? "" : "md:col-span-2"}>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-primary">↓</span> Téléchargements
                </h3>
                <div
                  className={`bg-muted rounded-lg overflow-hidden ${digitalContentType === "ebook" || digitalContentType === "music" ? "aspect-video" : "h-[400px]"}`}
                >
                  <iframe src={`/api/v1/download/${selectedDigital.ww_id}`} className="w-full h-full border-0" />
                </div>
              </div>
            </div>

            <AddDigitalContentModal
              buttonVariant="outline"
              buttonText="Ajouter un lien"
              onSuccess={fetchDigitalContent}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4">
          {/* Platform stats section above footer text */}
          <div className="mb-8">
            <h3 className="text-center text-lg font-semibold text-foreground mb-4">Statistiques de la Plateforme</h3>
            <PlatformStats />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            <span className="text-primary font-semibold">WW</span>Embed par{" "}
            <a href="https://wavewatch.xyz" className="text-primary hover:underline">
              wavewatch.xyz
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
