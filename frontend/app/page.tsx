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
import { Plus, Book, Music, Monitor, Gamepad2, Search, Hash, Film, Tv, Radio, Sparkles, Loader2 } from "lucide-react"
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"media" | "live" | "digital">("media")

  const [searchMode, setSearchMode] = useState<"id" | "title">("title")
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
    if (activeTab === "live") fetchChannels()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "digital") fetchDigitalContent()
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
        if (episodeNumber) params.set("episode", episodeNumber)
      }
      if (params.toString()) url += `?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Media non trouvé")
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
    if (result.episodeData) return `${mainTitle} - S${result.seasonNumber}E${result.episodeNumber}: ${result.episodeData.name}`
    if (result.seasonNumber) return `${mainTitle} - Saison ${result.seasonNumber}`
    return mainTitle
  }

  const getPoster = () => {
    if (result?.episodeData?.still_path) return getStillUrl(result.episodeData.still_path)
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

  const dtBtn = (val: DigitalContentType, Icon: any, label: string) => (
    <button
      key={val}
      data-testid={`dtype-${val}`}
      onClick={() => {
        setDigitalContentType(val)
        setSelectedDigital(null)
      }}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        digitalContentType === val
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          : "glass-subtle text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="orb w-[520px] h-[520px] -top-40 -left-32 bg-primary/30" />
      <div className="orb w-[460px] h-[460px] top-[10%] right-[-160px] bg-cyan-500/20" style={{ animationDelay: "-5s" }} />
      <div className="orb w-[480px] h-[480px] top-[60%] left-[40%] bg-violet-500/15" style={{ animationDelay: "-10s" }} />

      <Header />

      <main className="relative container mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* HERO */}
        <section className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full glass-subtle text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            Agrégateur de liens streaming, téléchargement & live
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.95]">
            <span className="text-gradient-primary">WW</span>
            <span className="text-foreground">Embed</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-2xl mx-auto leading-relaxed">
            Intégrez en un clic un lecteur premium ou des liens vérifiés sur votre site —
            <span className="text-foreground"> films, séries, TV live, ebooks, musique, logiciels, jeux</span>.
          </p>
        </section>

        {/* SEARCH SHELL */}
        <section className="max-w-3xl mx-auto mb-14 fade-up-delay-1">
          <div className="glass-strong rounded-2xl p-4 sm:p-6 ring-glow">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList
                className="grid w-full grid-cols-3 mb-6 h-11 p-1 bg-background/40 border border-white/5"
                data-testid="main-tabs"
              >
                <TabsTrigger value="media" data-testid="tab-media" className="rounded-md gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Film className="w-3.5 h-3.5" /> Films & Séries
                </TabsTrigger>
                <TabsTrigger value="live" data-testid="tab-live" className="rounded-md gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Tv className="w-3.5 h-3.5" /> TV Live
                </TabsTrigger>
                <TabsTrigger value="digital" data-testid="tab-digital" className="rounded-md gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Sparkles className="w-3.5 h-3.5" /> Digital
                </TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="space-y-4">
                <div className="flex gap-2 mb-1">
                  <Button
                    type="button"
                    data-testid="mode-title"
                    variant={searchMode === "title" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchMode("title")}
                    className={searchMode === "title" ? "rounded-full shadow shadow-primary/20" : "rounded-full"}
                  >
                    <Search className="w-3.5 h-3.5 mr-1.5" /> Par titre
                  </Button>
                  <Button
                    type="button"
                    data-testid="mode-id"
                    variant={searchMode === "id" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSearchMode("id")}
                    className={searchMode === "id" ? "rounded-full shadow shadow-primary/20" : "rounded-full"}
                  >
                    <Hash className="w-3.5 h-3.5 mr-1.5" /> Par ID TMDB
                  </Button>
                </div>

                {searchMode === "title" ? (
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          data-testid="title-search-input"
                          placeholder="Rechercher un film ou une série..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleTitleSearch()}
                          className="pl-10 h-11 bg-background/40 border-white/10"
                        />
                      </div>
                      <Button
                        data-testid="title-search-btn"
                        onClick={handleTitleSearch}
                        disabled={searchLoading || !searchQuery.trim()}
                        className="h-11 rounded-xl px-5"
                      >
                        {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rechercher"}
                      </Button>
                    </div>

                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 glass-strong rounded-xl shadow-2xl max-h-80 overflow-y-auto scrollbar-thin">
                        {searchResults.map((item) => (
                          <button
                            key={`${item.media_type}-${item.id}`}
                            data-testid={`search-result-${item.id}`}
                            onClick={() => handleSelectResult(item)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                          >
                            <img
                              src={getPosterUrl(item.poster_path, "w92") || "/placeholder.svg"}
                              alt={item.title || item.name}
                              className="w-12 h-16 object-cover rounded-md ring-1 ring-white/5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{item.title || item.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                {item.media_type === "movie" ? (
                                  <Film className="w-3 h-3" />
                                ) : (
                                  <Tv className="w-3 h-3" />
                                )}
                                {item.media_type === "movie" ? "Film" : "Série"} ·{" "}
                                {(item.release_date || item.first_air_date)?.split("-")[0] || "N/A"}
                              </p>
                            </div>
                            <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-md font-medium border border-primary/20">
                              ★ {item.vote_average.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showResults && searchResults.length === 0 && !searchLoading && (
                      <div className="absolute z-50 w-full mt-2 glass-strong rounded-xl p-6 text-center text-muted-foreground text-sm">
                        Aucun résultat trouvé
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      data-testid="tmdb-id-input"
                      placeholder="ID TMDB (ex: 617120)"
                      value={tmdbId}
                      onChange={(e) => setTmdbId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="flex-1 min-w-[150px] h-11 bg-background/40 border-white/10"
                      type="number"
                    />
                    <Select
                      value={mediaType}
                      onValueChange={(v) => {
                        setMediaType(v as any)
                        if (v === "movie") {
                          setSeasonNumber("")
                          setEpisodeNumber("")
                        }
                      }}
                    >
                      <SelectTrigger className="w-32 h-11 bg-background/40 border-white/10" data-testid="media-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">Film</SelectItem>
                        <SelectItem value="tv">Série</SelectItem>
                      </SelectContent>
                    </Select>
                    {mediaType === "tv" && (
                      <>
                        <Input
                          data-testid="season-input"
                          placeholder="Saison"
                          value={seasonNumber}
                          onChange={(e) => setSeasonNumber(e.target.value)}
                          className="w-24 h-11 bg-background/40 border-white/10"
                          type="number"
                          min="0"
                        />
                        <Input
                          data-testid="episode-input"
                          placeholder="Episode"
                          value={episodeNumber}
                          onChange={(e) => setEpisodeNumber(e.target.value)}
                          className="w-24 h-11 bg-background/40 border-white/10"
                          type="number"
                          min="1"
                          disabled={!seasonNumber}
                        />
                      </>
                    )}
                    <Button
                      data-testid="id-search-btn"
                      onClick={handleSearch}
                      disabled={loading || !tmdbId}
                      className="h-11 rounded-xl px-5"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rechercher"}
                    </Button>
                  </div>
                )}

                {mediaType === "tv" && searchMode === "id" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Laissez saison/épisode vides pour la série complète, ou précisez pour un épisode spécifique.
                  </p>
                )}
                {error && (
                  <p data-testid="media-error" className="text-destructive text-sm mt-2">
                    {error}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="live" className="space-y-4">
                <div className="relative">
                  <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="live-search-input"
                    placeholder="Rechercher une chaîne par nom, catégorie ou pays..."
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="pl-10 h-11 bg-background/40 border-white/10"
                  />
                </div>

                {loadingChannels ? (
                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Chargement des chaînes...
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {channels.length === 0 ? "Aucune chaîne disponible" : "Aucune chaîne trouvée"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                    {filteredChannels.map((channel) => (
                      <button
                        key={channel.id}
                        data-testid={`channel-${channel.id}`}
                        onClick={() => setSelectedChannel(channel)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedChannel?.id === channel.id
                            ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                            : "border-white/5 hover:border-primary/30 hover:bg-white/5"
                        }`}
                      >
                        {channel.channel_logo ? (
                          <img
                            src={channel.channel_logo}
                            alt={channel.channel_name}
                            className="w-full h-12 object-contain mb-2"
                          />
                        ) : (
                          <div className="w-full h-12 bg-white/5 rounded flex items-center justify-center mb-2">
                            <Tv className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <p className="font-medium text-sm text-foreground truncate">{channel.channel_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.category} · {channel.country}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="digital" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {dtBtn("ebook", Book, "Ebooks")}
                  {dtBtn("music", Music, "Musique")}
                  {dtBtn("software", Monitor, "Logiciels")}
                  {dtBtn("game", Gamepad2, "Jeux")}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="digital-search-input"
                    placeholder="Rechercher par titre ou auteur..."
                    value={digitalSearch}
                    onChange={(e) => setDigitalSearch(e.target.value)}
                    className="pl-10 h-11 bg-background/40 border-white/10"
                  />
                </div>

                {loadingDigital ? (
                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Chargement...
                  </div>
                ) : filteredDigitalContents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {digitalContents.length === 0 ? "Aucun contenu disponible" : "Aucun résultat"}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                    {filteredDigitalContents.map((content) => (
                      <button
                        key={content.id}
                        data-testid={`digital-${content.id}`}
                        onClick={() => setSelectedDigital(content)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedDigital?.id === content.id
                            ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                            : "border-white/5 hover:border-primary/30 hover:bg-white/5"
                        }`}
                      >
                        {content.cover_url ? (
                          <img
                            src={content.cover_url}
                            alt={content.title}
                            className="w-full h-20 object-cover rounded-md mb-2 ring-1 ring-white/5"
                          />
                        ) : (
                          <div className="w-full h-20 bg-white/5 rounded-md mb-2 flex items-center justify-center">
                            {digitalContentType === "ebook" && <Book className="w-7 h-7 text-muted-foreground" />}
                            {digitalContentType === "music" && <Music className="w-7 h-7 text-muted-foreground" />}
                            {digitalContentType === "software" && <Monitor className="w-7 h-7 text-muted-foreground" />}
                            {digitalContentType === "game" && <Gamepad2 className="w-7 h-7 text-muted-foreground" />}
                          </div>
                        )}
                        <p className="text-sm font-medium truncate">{content.title}</p>
                        {content.author && (
                          <p className="text-xs text-muted-foreground truncate">{content.author}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* RESULTS — LIVE TV */}
        {activeTab === "live" && selectedChannel && (
          <section className="max-w-4xl mx-auto space-y-6 fade-up-delay-2">
            <div className="glass-strong rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <div className="flex items-center gap-4">
                  {selectedChannel.channel_logo ? (
                    <img
                      src={selectedChannel.channel_logo}
                      alt={selectedChannel.channel_name}
                      className="w-16 h-16 object-contain rounded-lg ring-1 ring-white/5 bg-background/30 p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-lg grid place-items-center">
                      <Tv className="w-7 h-7 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{selectedChannel.channel_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedChannel.category} · {selectedChannel.country} · {selectedChannel.quality}
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

              <div className="bg-background/40 border border-white/5 rounded-xl p-3 mb-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">URL Embed Lecteur</p>
                <code data-testid="live-embed-url" className="text-xs text-primary break-all font-mono">
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/live/ww-live-{selectedChannel.id}
                </code>
              </div>

              <div className="aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-white/5">
                <iframe
                  src={`/api/v1/live/ww-live-${selectedChannel.id}`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          </section>
        )}

        {/* RESULTS — MEDIA */}
        {activeTab === "media" && result && (
          <section className="space-y-8 fade-up-delay-2">
            {result.tmdbData && (
              <div className="glass-strong rounded-2xl overflow-hidden">
                <div
                  className="h-48 sm:h-56 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${getPoster()})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                </div>
                <div className="p-5 sm:p-6 flex gap-5 sm:gap-6 -mt-20 relative">
                  <img
                    src={getPosterUrl(result.tmdbData.poster_path, "w200") || "/placeholder.svg"}
                    alt={getTitle()}
                    className="w-24 sm:w-32 h-36 sm:h-48 object-cover rounded-xl shadow-2xl ring-1 ring-white/10"
                  />
                  <div className="pt-12 sm:pt-16 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{getTitle()}</h2>
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

            <EmbedUrls wwId={result.wwId} />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Lecteur Streaming
                </h3>
                <div className="aspect-video bg-black rounded-xl overflow-hidden ring-1 ring-white/5">
                  <iframe
                    src={`/api/v1/streaming/${result.wwId}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-primary">↓</span> Téléchargements
                </h3>
                <div className="aspect-video bg-white/5 rounded-xl overflow-hidden ring-1 ring-white/5">
                  <iframe src={`/api/v1/download/${result.wwId}`} className="w-full h-full border-0" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RESULTS — DIGITAL */}
        {activeTab === "digital" && selectedDigital && (
          <section className="space-y-6 fade-up-delay-2">
            <div className="glass-strong rounded-2xl p-5 sm:p-6">
              <div className="flex gap-4">
                {selectedDigital.cover_url ? (
                  <img
                    src={selectedDigital.cover_url}
                    alt={selectedDigital.title}
                    className="w-24 h-32 object-cover rounded-lg ring-1 ring-white/5"
                  />
                ) : (
                  <div className="w-24 h-32 bg-white/5 rounded-lg flex items-center justify-center">
                    {digitalContentType === "ebook" && <Book className="w-10 h-10 text-muted-foreground" />}
                    {digitalContentType === "music" && <Music className="w-10 h-10 text-muted-foreground" />}
                    {digitalContentType === "software" && <Monitor className="w-10 h-10 text-muted-foreground" />}
                    {digitalContentType === "game" && <Gamepad2 className="w-10 h-10 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{selectedDigital.title}</h2>
                  {selectedDigital.author && <p className="text-muted-foreground">{selectedDigital.author}</p>}
                  {selectedDigital.version && (
                    <p className="text-sm text-muted-foreground">Version: {selectedDigital.version}</p>
                  )}
                  {selectedDigital.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{selectedDigital.description}</p>
                  )}
                  <span className="inline-block mt-3 bg-primary/15 text-primary text-xs px-2.5 py-1 rounded-md capitalize border border-primary/20 font-medium">
                    {digitalContentType}
                  </span>
                </div>
              </div>
            </div>

            <DigitalEmbedUrls
              wwId={selectedDigital.ww_id}
              contentType={selectedDigital.content_type}
              title={selectedDigital.title}
            />

            <div className="grid md:grid-cols-2 gap-6">
              {(digitalContentType === "ebook" || digitalContentType === "music") && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />{" "}
                    {digitalContentType === "ebook" ? "Lecteur Ebook" : "Lecteur Audio"}
                  </h3>
                  <div
                    className={`bg-black rounded-xl overflow-hidden ring-1 ring-white/5 ${
                      digitalContentType === "music" ? "h-[400px]" : "aspect-video"
                    }`}
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
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-primary">↓</span> Téléchargements
                </h3>
                <div
                  className={`bg-white/5 rounded-xl overflow-hidden ring-1 ring-white/5 ${
                    digitalContentType === "ebook" || digitalContentType === "music" ? "aspect-video" : "h-[400px]"
                  }`}
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
          </section>
        )}
      </main>

      <footer className="relative border-t border-white/5 mt-20">
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <div className="mb-10">
            <h3 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground mb-6">
              Statistiques de la plateforme
            </h3>
            <PlatformStats />
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <span className="text-gradient-primary font-semibold">WW</span>
            <span className="font-semibold">Embed</span> par{" "}
            <a href="https://wavewatch.top" className="text-primary hover:underline underline-offset-4">
              wavewatch.top
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
