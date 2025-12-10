"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddLinkModal } from "@/components/add-link-modal"
import { ProfileSettings } from "@/components/dashboard/profile-settings"
import { Separator } from "@/components/ui/separator"
import {
  Play,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Tv,
  Book,
  Music,
  Gamepad2,
  Package,
  Settings,
  Loader2,
  Bug,
  Plus,
  LayoutDashboard,
  Link2,
  Sparkles,
  BarChart3,
  Calendar,
  Award,
  Target,
  Zap,
  ChevronRight,
  ExternalLink,
  Trash2,
} from "lucide-react"
import type {
  Profile,
  StreamingLink,
  DownloadLink,
  LiveTVChannel,
  LiveTVSource,
  DigitalContent,
  DigitalDownloadLink,
} from "@/lib/types"
import Link from "next/link"

interface MediaInfo {
  title: string
  poster: string | null
}

interface StreamingLinkWithViews extends StreamingLink {
  view_count: number
}

interface DownloadLinkWithViews extends DownloadLink {
  view_count: number
}

interface DigitalContentWithViews extends DigitalContent {
  view_count: number
}

interface BugReport {
  id: string
  ww_id: string
  title: string
  source_name: string
  message: string
  status: "pending" | "fixed" | "impossible"
  admin_note?: string
  embed_type: string
  created_at: string
}

interface DashboardContentProps {
  profile: Profile
  streamingLinks: StreamingLinkWithViews[]
  downloadLinks: DownloadLinkWithViews[]
  liveTvChannels: LiveTVChannel[]
  liveTvSources: LiveTVSource[]
  digitalContents: DigitalContentWithViews[]
  digitalLinks: DigitalDownloadLink[]
  stats: {
    totalStreaming: number
    totalDownload: number
    totalLiveTv: number
    totalDigital: number
    verifiedStreaming: number
    verifiedDownload: number
    verifiedLiveTv: number
    verifiedDigital: number
    pendingCount: number
    rejectedCount: number
    totalViews: number
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approuve
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Clock className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Rejete
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getDigitalTypeIcon(type: string) {
  switch (type) {
    case "ebook":
      return <Book className="w-4 h-4" />
    case "music":
      return <Music className="w-4 h-4" />
    case "software":
      return <Package className="w-4 h-4" />
    case "game":
      return <Gamepad2 className="w-4 h-4" />
    default:
      return null
  }
}

function getBugStatusBadge(status: string) {
  switch (status) {
    case "fixed":
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Corrige
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Clock className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      )
    case "impossible":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Impossible
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  trend,
}: {
  icon: any
  label: string
  value: number | string
  subValue?: string
  color: string
  trend?: "up" | "down" | "neutral"
}) {
  const colorClasses: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 border-primary/30 text-primary",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
  }

  return (
    <Card
      className={`bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-background/50 ${colorClasses[color].split(" ")[3]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NavItem({
  icon: Icon,
  label,
  value,
  isActive,
  onClick,
  badge,
}: {
  icon: any
  label: string
  value: string
  isActive: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/20"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && badge > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {badge}
          </Badge>
        )}
        <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90" : ""}`} />
      </div>
    </button>
  )
}

export function DashboardContent({
  profile,
  streamingLinks,
  downloadLinks,
  liveTvChannels,
  liveTvSources,
  digitalContents,
  digitalLinks,
  stats,
}: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [mediaInfoCache, setMediaInfoCache] = useState<Record<string, MediaInfo>>({})
  const [requestingUploader, setRequestingUploader] = useState(false)
  const [uploaderRequestResult, setUploaderRequestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [loadingBugReports, setLoadingBugReports] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = createClient()

  const handleDeleteStreamingLink = async (linkId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lien streaming ?")) return
    setDeletingId(linkId)
    const supabase = createClient()
    const { error } = await supabase.from("streaming_links").delete().eq("id", linkId)
    if (!error) {
      window.location.reload()
    } else {
      alert("Erreur lors de la suppression")
    }
    setDeletingId(null)
  }

  const handleDeleteDownloadLink = async (linkId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lien téléchargement ?")) return
    setDeletingId(linkId)
    const supabase = createClient()
    const { error } = await supabase.from("download_links").delete().eq("id", linkId)
    if (!error) {
      window.location.reload()
    } else {
      alert("Erreur lors de la suppression")
    }
    setDeletingId(null)
  }

  const handleDeleteDigitalLink = async (linkId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lien digital ?")) return
    setDeletingId(linkId)
    const supabase = createClient()
    const { error } = await supabase.from("digital_download_links").delete().eq("id", linkId)
    if (!error) {
      window.location.reload()
    } else {
      alert("Erreur lors de la suppression")
    }
    setDeletingId(null)
  }

  useEffect(() => {
    const fetchMediaInfo = async () => {
      const allLinks = [...streamingLinks, ...downloadLinks]
      const uniqueMedia = new Map<string, { tmdb_id: number; media_type: string }>()

      allLinks.forEach((link) => {
        if (link.tmdb_id) {
          const key = `${link.media_type}-${link.tmdb_id}`
          if (!uniqueMedia.has(key)) {
            uniqueMedia.set(key, { tmdb_id: link.tmdb_id, media_type: link.media_type })
          }
        }
      })

      const newCache: Record<string, MediaInfo> = {}

      await Promise.all(
        Array.from(uniqueMedia.entries()).map(async ([key, { tmdb_id, media_type }]) => {
          try {
            const res = await fetch(`/api/tmdb/${media_type}/${tmdb_id}`)
            if (res.ok) {
              const data = await res.json()
              newCache[key] = {
                title: data.title || data.name || "Sans titre",
                poster: data.poster || null,
              }
            }
          } catch (e) {
            console.error(`Failed to fetch TMDB info for ${key}`, e)
          }
        }),
      )

      setMediaInfoCache(newCache)
    }

    if (streamingLinks.length > 0 || downloadLinks.length > 0) {
      fetchMediaInfo()
    }
  }, [streamingLinks, downloadLinks])

  const getMediaInfo = (link: StreamingLink | DownloadLink) => {
    const key = `${link.media_type}-${link.tmdb_id}`
    return mediaInfoCache[key] || { title: link.ww_id, poster: null }
  }

  const formatEpisodeInfo = (link: StreamingLink | DownloadLink) => {
    if (link.media_type === "tv" && link.season_number !== null) {
      const season = `S${String(link.season_number).padStart(2, "0")}`
      const episode = link.episode_number !== null ? `E${String(link.episode_number).padStart(2, "0")}` : ""
      return `${season}${episode}`
    }
    return null
  }

  const totalApprovedLinks =
    stats.verifiedStreaming + stats.verifiedDownload + stats.verifiedLiveTv + stats.verifiedDigital
  const accountAge = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const canRequestUploader = profile.role === "member" && totalApprovedLinks >= 500 && accountAge >= 30
  const showUploaderSection = profile.role === "member"

  useEffect(() => {
    async function fetchBugReports() {
      setLoadingBugReports(true)
      try {
        const res = await fetch(`/api/bug-reports/user`)
        if (res.ok) {
          const data = await res.json()
          setBugReports(data)
        }
      } catch (error) {
        console.error("Failed to fetch bug reports:", error)
      }
      setLoadingBugReports(false)
    }
    fetchBugReports()
  }, [])

  async function handleRequestUploader() {
    setRequestingUploader(true)
    setUploaderRequestResult(null)

    try {
      if (totalApprovedLinks < 500) {
        setUploaderRequestResult({
          success: false,
          message: `Vous avez ${totalApprovedLinks}/500 liens valides requis`,
        })
        setRequestingUploader(false)
        return
      }
      if (accountAge < 30) {
        setUploaderRequestResult({ success: false, message: `Votre compte a ${accountAge}/30 jours requis` })
        setRequestingUploader(false)
        return
      }

      const { error } = await supabase.from("profiles").update({ role: "uploader" }).eq("id", profile.id)

      if (error) throw error

      setUploaderRequestResult({ success: true, message: "Félicitations ! Vous êtes maintenant Uploader !" })
      setTimeout(() => window.location.reload(), 2000)
    } catch (err: any) {
      setUploaderRequestResult({ success: false, message: err.message || "Une erreur est survenue" })
    }

    setRequestingUploader(false)
  }

  const getRoleBadge = () => {
    switch (profile.role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Administrateur</Badge>
      case "uploader":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Uploader</Badge>
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Membre</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border border-primary/20 p-6 md:p-8">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/25">
                {(profile.username || profile.email)[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {profile.username || profile.email.split("@")[0]}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge()}
                <span className="text-sm text-muted-foreground">
                  Membre depuis {new Date(profile.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddLinkModal
              onSuccess={() => window.location.reload()}
              buttonClassName="bg-gradient-to-r from-primary to-cyan-400 hover:from-primary/90 hover:to-cyan-400/90 shadow-lg shadow-primary/25"
              buttonIcon={<Plus className="w-4 h-4 mr-2" />}
              buttonText="Ajouter un lien"
            />
            {profile.username && (
              <Link href={`/profile/${profile.username}`} target="_blank">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <ExternalLink className="w-4 h-4" />
                  Mon profil public
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={Play} label="Streaming" value={stats.totalStreaming} color="primary" />
        <StatCard icon={Download} label="Download" value={stats.totalDownload} color="blue" />
        <StatCard icon={Tv} label="TV Live" value={stats.totalLiveTv} color="purple" />
        <StatCard icon={Book} label="Digital" value={stats.totalDigital} color="amber" />
        <StatCard icon={CheckCircle} label="Approuves" value={totalApprovedLinks} color="emerald" />
        <StatCard icon={Clock} label="En attente" value={stats.pendingCount} color="orange" />
        <StatCard icon={Eye} label="Vues" value={stats.totalViews.toLocaleString()} color="cyan" />
      </div>

      {/* Uploader Section */}
      {showUploaderSection && (
        <Card
          className={`border-2 overflow-hidden ${canRequestUploader ? "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10" : "border-border"}`}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${canRequestUploader ? "bg-amber-500/20" : "bg-muted"}`}>
                <Award className={`w-6 h-6 ${canRequestUploader ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Devenir Uploader</CardTitle>
                <CardDescription>Debloquez des fonctionnalites avancees</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className={`p-4 rounded-xl border-2 ${totalApprovedLinks >= 500 ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-muted/30"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Liens valides</span>
                  </div>
                  {totalApprovedLinks >= 500 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {Math.round((totalApprovedLinks / 500) * 100)}%
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-2">{totalApprovedLinks} / 500</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${totalApprovedLinks >= 500 ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (totalApprovedLinks / 500) * 100)}%` }}
                  />
                </div>
              </div>
              <div
                className={`p-4 rounded-xl border-2 ${accountAge >= 30 ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-muted/30"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Anciennete</span>
                  </div>
                  {accountAge >= 30 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{Math.round((accountAge / 30) * 100)}%</span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-2">{accountAge} / 30 jours</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${accountAge >= 30 ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (accountAge / 30) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleRequestUploader}
              disabled={!canRequestUploader || requestingUploader}
              className={`w-full sm:w-auto ${canRequestUploader ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : ""}`}
            >
              {requestingUploader ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verification...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Demander le grade Uploader
                </>
              )}
            </Button>
            {uploaderRequestResult && (
              <p className={`text-sm ${uploaderRequestResult.success ? "text-emerald-500" : "text-red-500"}`}>
                {uploaderRequestResult.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content with Tabs */}
      <Card className="border-border overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border bg-muted/30 p-1">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Apercu</span>
              </TabsTrigger>
              <TabsTrigger
                value="streaming"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Streaming</span>
                {stats.totalStreaming > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {stats.totalStreaming}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="download"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
                {stats.totalDownload > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {stats.totalDownload}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="livetv"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Tv className="h-4 w-4" />
                <span className="hidden sm:inline">TV</span>
              </TabsTrigger>
              <TabsTrigger
                value="digital"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Digital</span>
              </TabsTrigger>
              <TabsTrigger
                value="bugs"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Bug className="h-4 w-4" />
                <span className="hidden sm:inline">Rapports</span>
                {bugReports.filter((r) => r.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {bugReports.filter((r) => r.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="add"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 md:p-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Activity */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Activite recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...streamingLinks, ...downloadLinks].slice(0, 5).map((link, i) => {
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
                                <p className="text-xs text-muted-foreground">
                                  {new Date(link.created_at).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(link.status)}
                          </div>
                        )
                      })}
                      {streamingLinks.length === 0 && downloadLinks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucune activite recente</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Statistiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Taux d'approbation</span>
                        <span className="text-sm font-bold text-emerald-500">
                          {stats.totalStreaming + stats.totalDownload > 0
                            ? Math.round(
                                ((stats.verifiedStreaming + stats.verifiedDownload) /
                                  (stats.totalStreaming + stats.totalDownload)) *
                                  100,
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          style={{
                            width: `${
                              stats.totalStreaming + stats.totalDownload > 0
                                ? (
                                    (stats.verifiedStreaming + stats.verifiedDownload) /
                                      (stats.totalStreaming + stats.totalDownload)
                                  ) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <Separator className="bg-zinc-800" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                          <p className="text-2xl font-bold text-primary">{stats.totalViews}</p>
                          <p className="text-xs text-muted-foreground">Vues totales</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                          <p className="text-2xl font-bold text-amber-500">{stats.pendingCount}</p>
                          <p className="text-xs text-muted-foreground">En attente</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Streaming Tab */}
            <TabsContent value="streaming" className="mt-0">
              {streamingLinks.length === 0 ? (
                <div className="text-center py-12">
                  <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun lien streaming soumis</p>
                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    buttonText="Ajouter un lien streaming"
                    mode="streaming"
                  />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Media</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Qualite</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Langue</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Vues</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                        {/* CHANGE: Added Actions column */}
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streamingLinks.map((link) => {
                        const mediaInfo = getMediaInfo(link)
                        const episodeInfo = formatEpisodeInfo(link)
                        return (
                          <tr key={link.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {mediaInfo.poster ? (
                                  <img
                                    src={mediaInfo.poster || "/placeholder.svg"}
                                    alt={mediaInfo.title}
                                    className="w-10 h-14 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium line-clamp-1">{mediaInfo.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-xs">
                                      {link.media_type === "movie" ? "Film" : "Serie"}
                                    </Badge>
                                    {episodeInfo && <span className="text-primary font-mono">{episodeInfo}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{link.source_name}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{link.quality}</Badge>
                            </td>
                            <td className="py-3 px-4">{link.language}</td>
                            <td className="py-3 px-4">{getStatusBadge(link.status)}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 text-orange-500">
                                <Eye className="w-3 h-3" />
                                <span>{link.view_count}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(link.created_at).toLocaleDateString("fr-FR")}
                            </td>
                            {/* CHANGE: Added delete button */}
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleDeleteStreamingLink(link.id)}
                                disabled={deletingId === link.id}
                              >
                                {deletingId === link.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Download Tab */}
            <TabsContent value="download" className="mt-0">
              {downloadLinks.length === 0 && digitalLinks.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun lien telechargement soumis</p>
                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    buttonText="Ajouter un lien download"
                    mode="download"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {downloadLinks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Download className="w-4 h-4 text-blue-500" />
                        Films & Series ({downloadLinks.length})
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Media</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Vues</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {downloadLinks.map((link) => {
                              const mediaInfo = getMediaInfo(link)
                              const episodeInfo = formatEpisodeInfo(link)
                              return (
                                <tr
                                  key={link.id}
                                  className="border-t border-border hover:bg-muted/30 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      {mediaInfo.poster ? (
                                        <img
                                          src={mediaInfo.poster || "/placeholder.svg"}
                                          alt={mediaInfo.title}
                                          className="w-10 h-14 object-cover rounded"
                                        />
                                      ) : (
                                        <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                          <Download className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium line-clamp-1">{mediaInfo.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Badge variant="outline" className="text-xs">
                                            {link.media_type === "movie" ? "Film" : "Serie"}
                                          </Badge>
                                          {episodeInfo && <span className="text-primary font-mono">{episodeInfo}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-medium">{link.source_name}</td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline">{link.link_type}</Badge>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline">{link.quality}</Badge>
                                  </td>
                                  <td className="py-3 px-4">{getStatusBadge(link.status)}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1 text-orange-500">
                                      <Eye className="w-3 h-3" />
                                      <span>{link.view_count}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {new Date(link.created_at).toLocaleDateString("fr-FR")}
                                  </td>
                                  {/* CHANGE: Added delete button */}
                                  <td className="py-3 px-4">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => handleDeleteDownloadLink(link.id)}
                                      disabled={deletingId === link.id}
                                    >
                                      {deletingId === link.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {digitalLinks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500" />
                        Contenu Digital ({digitalLinks.length})
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contenu</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                              {/* CHANGE: Added Actions column */}
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {digitalLinks.map((link) => {
                              const digitalContent = digitalContents.find((dc) => dc.id === link.content_id)
                              return (
                                <tr
                                  key={link.id}
                                  className="border-t border-border hover:bg-muted/30 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      {digitalContent?.cover_url ? (
                                        <img
                                          src={digitalContent.cover_url || "/placeholder.svg"}
                                          alt={digitalContent?.title || "Digital"}
                                          className="w-10 h-14 object-cover rounded"
                                        />
                                      ) : (
                                        <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                          <Package className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium line-clamp-1">
                                          {digitalContent?.title || link.ww_id}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                          {digitalContent?.type === "ebook" && "Ebook"}
                                          {digitalContent?.type === "music" && "Musique"}
                                          {digitalContent?.type === "software" && "Logiciel"}
                                          {digitalContent?.type === "game" && "Jeu"}
                                          {!digitalContent?.type && "Digital"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-medium">{link.source_name}</td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline">{link.quality || "N/A"}</Badge>
                                  </td>
                                  <td className="py-3 px-4">{getStatusBadge(link.status)}</td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {new Date(link.created_at).toLocaleDateString("fr-FR")}
                                  </td>
                                  {/* CHANGE: Added delete button */}
                                  <td className="py-3 px-4">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => handleDeleteDigitalLink(link.id)}
                                      disabled={deletingId === link.id}
                                    >
                                      {deletingId === link.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Live TV Tab */}
            <TabsContent value="livetv" className="mt-0">
              {liveTvChannels.length === 0 && liveTvSources.length === 0 ? (
                <div className="text-center py-12">
                  <Tv className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucune chaine ou source TV soumise</p>
                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    buttonText="Ajouter une chaine TV"
                    mode="livetv"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {liveTvChannels.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Tv className="w-4 h-4 text-purple-500" />
                        Chaines creees ({liveTvChannels.length})
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Chaine</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Categorie</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Pays</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveTvChannels.map((channel) => (
                              <tr
                                key={channel.id}
                                className="border-t border-border hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    {channel.channel_logo && (
                                      <img
                                        src={channel.channel_logo || "/placeholder.svg"}
                                        alt={channel.channel_name}
                                        className="w-8 h-8 object-contain rounded"
                                      />
                                    )}
                                    <span className="font-medium">{channel.channel_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">{channel.category}</td>
                                <td className="py-3 px-4">{channel.country}</td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline">{channel.quality}</Badge>
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(channel.status)}</td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {new Date(channel.created_at).toLocaleDateString("fr-FR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {liveTvSources.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-purple-500" />
                        Sources ajoutees ({liveTvSources.length})
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveTvSources.map((source) => (
                              <tr
                                key={source.id}
                                className="border-t border-border hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-3 px-4 font-medium">{source.source_name}</td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline">{source.quality}</Badge>
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(source.status)}</td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {new Date(source.created_at).toLocaleDateString("fr-FR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Digital Tab */}
            <TabsContent value="digital" className="mt-0">
              {digitalContents.length === 0 ? (
                <div className="text-center py-12">
                  <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun contenu digital soumis</p>
                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    buttonText="Ajouter un contenu digital"
                    mode="digital"
                  />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Titre</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">WW ID</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Vues</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {digitalContents.map((content) => (
                        <tr key={content.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {content.cover_url && (
                                <img
                                  src={content.cover_url || "/placeholder.svg"}
                                  alt={content.title}
                                  className="w-8 h-10 object-cover rounded"
                                />
                              )}
                              <span className="font-medium">{content.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {getDigitalTypeIcon(content.content_type)}
                              {content.content_type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-primary">{content.ww_id}</td>
                          <td className="py-3 px-4">{getStatusBadge(content.status)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Eye className="w-3 h-3" />
                              <span>{content.view_count}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Bug Reports Tab */}
            <TabsContent value="bugs" className="mt-0">
              {loadingBugReports ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : bugReports.length === 0 ? (
                <div className="text-center py-12">
                  <Bug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun rapport de bug soumis</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Utilisez le bouton rouge dans les lecteurs pour signaler un probleme
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">WW ID</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Titre</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Message</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bugReports.map((report) => (
                        <tr key={report.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-primary">{report.ww_id}</td>
                          <td className="py-3 px-4 font-medium max-w-[150px] truncate">{report.title || "-"}</td>
                          <td className="py-3 px-4">{report.source_name || "-"}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{report.embed_type}</Badge>
                          </td>
                          <td className="py-3 px-4 max-w-[200px]">
                            <p className="truncate text-muted-foreground" title={report.message}>
                              {report.message}
                            </p>
                            {report.admin_note && (
                              <p className="text-xs text-amber-500 mt-1 truncate" title={report.admin_note}>
                                Admin: {report.admin_note}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">{getBugStatusBadge(report.status)}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Add Tab - Same as main page */}
            <TabsContent value="add" className="mt-0">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 mb-4">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Ajouter un nouveau lien</h2>
                  <p className="text-muted-foreground">Choisissez le type de contenu que vous souhaitez ajouter</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    trigger={
                      <Card className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                        <CardContent className="pt-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                            <Play className="w-7 h-7 text-primary" />
                          </div>
                          <h3 className="font-semibold mb-1">Streaming</h3>
                          <p className="text-sm text-muted-foreground">Film ou Serie</p>
                        </CardContent>
                      </Card>
                    }
                    mode="streaming"
                  />

                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    trigger={
                      <Card className="cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
                        <CardContent className="pt-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/20 transition-colors">
                            <Tv className="w-7 h-7 text-purple-500" />
                          </div>
                          <h3 className="font-semibold mb-1">TV Live</h3>
                          <p className="text-sm text-muted-foreground">Chaine en direct</p>
                        </CardContent>
                      </Card>
                    }
                    mode="livetv"
                  />

                  <AddLinkModal
                    onSuccess={() => window.location.reload()}
                    trigger={
                      <Card className="cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group">
                        <CardContent className="pt-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500/20 transition-colors">
                            <Book className="w-7 h-7 text-amber-500" />
                          </div>
                          <h3 className="font-semibold mb-1">Digital</h3>
                          <p className="text-sm text-muted-foreground">Ebook, Musique...</p>
                        </CardContent>
                      </Card>
                    }
                    mode="digital"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-0">
              <ProfileSettings userId={profile.id} username={profile.username || ""} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  )
}
