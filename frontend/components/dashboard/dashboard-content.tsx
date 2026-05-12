"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddLinkModal } from "@/components/add-link-modal"
import { ProfileSettings } from "@/components/dashboard/profile-settings"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Search,
  Pencil,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  Film,
  FileDown,
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
  is_valid?: boolean | null
  last_checked?: string | null
}

interface DownloadLinkWithViews extends DownloadLink {
  view_count: number
  is_valid?: boolean | null
  last_checked?: string | null
}

interface DigitalContentWithViews extends DigitalContent {
  view_count: number
  is_valid?: boolean | null
  last_checked?: string | null
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
  streamingLinks: initialStreamingLinks,
  downloadLinks: initialDownloadLinks,
  liveTvChannels,
  liveTvSources,
  digitalContents: initialDigitalContents,
  digitalLinks: initialDigitalLinks,
  stats,
}: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [mediaInfoCache, setMediaInfoCache] = useState<Record<string, MediaInfo>>({})
  const [requestingUploader, setRequestingUploader] = useState(false)
  const [uploaderRequestResult, setUploaderRequestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [loadingBugReports, setLoadingBugReports] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [checkingLinkId, setCheckingLinkId] = useState<string | null>(null)
  const [isTestingAll, setIsTestingAll] = useState(false)
  const [testProgress, setTestProgress] = useState<{ checked: number; total: number; valid: number; invalid: number } | null>(null)

  const [editingStreamingLink, setEditingStreamingLink] = useState<StreamingLinkWithViews | null>(null)
  const [editingDownloadLink, setEditingDownloadLink] = useState<DownloadLinkWithViews | null>(null)
  const [editingDigitalLink, setEditingDigitalLink] = useState<DigitalDownloadLink | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    source_name: "",
    source_url: "",
    quality: "",
    language: "",
    link_type: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const [streamingSearch, setStreamingSearch] = useState("")
  const [streamingStatusFilter, setStreamingStatusFilter] = useState<string>("all")
  const [streamingTypeFilter, setStreamingTypeFilter] = useState<string>("all")
  const [streamingQualityFilter, setStreamingQualityFilter] = useState<string>("all")

  const [downloadSearch, setDownloadSearch] = useState("")
  const [downloadStatusFilter, setDownloadStatusFilter] = useState<string>("all")
  const [downloadTypeFilter, setDownloadTypeFilter] = useState<string>("all")
  const [downloadQualityFilter, setDownloadQualityFilter] = useState<string>("all")

  const supabase = createClient()

  const canEdit = profile.role === "uploader" || profile.role === "admin"

  const [streamingLinks, setStreamingLinks] = useState(initialStreamingLinks || [])
  const [downloadLinks, setDownloadLinks] = useState(initialDownloadLinks || [])
  const [digitalLinks, setDigitalLinks] = useState(initialDigitalLinks || [])
  const [digitalContents, setDigitalContents] = useState(initialDigitalContents || [])

  // Use local state for downloadLinks and digitalLinks to manage is_valid and last_checked
  const [localDownloadLinks, setLocalDownloadLinks] = useState(initialDownloadLinks || [])
  const [localDigitalLinks, setLocalDigitalLinks] = useState(initialDigitalLinks || [])

  const handleDeleteStreamingLink = async (linkId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lien streaming ?")) return
    setDeletingId(linkId)
    const supabase = createClient()
    const { error } = await supabase.from("streaming_links").delete().eq("id", linkId)
    if (!error) {
      setStreamingLinks(streamingLinks.filter((link) => link.id !== linkId))
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
      setDownloadLinks(downloadLinks.filter((link) => link.id !== linkId))
      setLocalDownloadLinks(localDownloadLinks.filter((link) => link.id !== linkId)) // Update local state
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
      setDigitalLinks(digitalLinks.filter((link) => link.id !== linkId))
      setLocalDigitalLinks(localDigitalLinks.filter((link) => link.id !== linkId)) // Update local state
    } else {
      alert("Erreur lors de la suppression")
    }
    setDeletingId(null)
  }

  const handleDeleteDigitalContent = async (contentId: string, wwId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce contenu digital ET tous ses liens associés ? Cette action est irréversible.",
      )
    )
      return
    setDeletingId(contentId)
    const supabase = createClient()

    // First delete all associated links
    await supabase.from("digital_download_links").delete().eq("content_id", contentId)

    // Then delete the content itself
    const { error } = await supabase.from("digital_content").delete().eq("id", contentId)

    if (!error) {
      setDigitalContents(digitalContents.filter((content) => content.id !== contentId))
      // Also remove any links that were associated with this content
      setDigitalLinks(digitalLinks.filter((link) => link.content_id !== contentId))
      setLocalDigitalLinks(localDigitalLinks.filter((link) => link.content_id !== contentId))
    } else {
      alert("Erreur lors de la suppression du contenu")
    }
    setDeletingId(null)
  }

  const handleEditStreamingLink = (link: StreamingLinkWithViews) => {
    setEditingStreamingLink(link)
    setEditingDownloadLink(null)
    setEditingDigitalLink(null)
    setEditForm({
      source_name: link.source_name,
      source_url: link.source_url,
      quality: link.quality,
      language: link.language,
      link_type: "",
    })
    setIsEditModalOpen(true)
  }

  const handleEditDownloadLink = (link: DownloadLinkWithViews) => {
    setEditingDownloadLink(link)
    setEditingStreamingLink(null)
    setEditingDigitalLink(null)
    setEditForm({
      source_name: link.source_name,
      source_url: link.source_url,
      quality: link.quality,
      language: link.language,
      link_type: link.link_type || "",
    })
    setIsEditModalOpen(true)
  }

  const handleEditDigitalLink = (link: DigitalDownloadLink) => {
    setEditingDigitalLink(link)
    setEditingStreamingLink(null)
    setEditingDownloadLink(null)
    setEditForm({
      source_name: link.source_name,
      source_url: link.source_url,
      quality: link.quality,
      language: "",
      link_type: "",
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      if (editingStreamingLink) {
        const { error } = await supabase
          .from("streaming_links")
          .update({
            source_name: editForm.source_name,
            source_url: editForm.source_url,
            quality: editForm.quality,
            language: editForm.language,
          })
          .eq("id", editingStreamingLink.id)

        if (error) throw error

        setStreamingLinks((prev) =>
          prev.map((link) => (link.id === editingStreamingLink.id ? { ...link, ...editForm } : link)),
        )
      } else if (editingDownloadLink) {
        const { error } = await supabase
          .from("download_links")
          .update({
            source_name: editForm.source_name,
            source_url: editForm.source_url,
            quality: editForm.quality,
            language: editForm.language,
            link_type: editForm.link_type,
          })
          .eq("id", editingDownloadLink.id)

        if (error) throw error

        setDownloadLinks((prev) =>
          prev.map((link) => (link.id === editingDownloadLink.id ? { ...link, ...editForm } : link)),
        )
        // Update local state as well
        setLocalDownloadLinks((prev) =>
          prev.map((link) => (link.id === editingDownloadLink.id ? { ...link, ...editForm } : link)),
        )
      } else if (editingDigitalLink) {
        const { error } = await supabase
          .from("digital_download_links")
          .update({
            source_name: editForm.source_name,
            source_url: editForm.source_url,
            quality: editForm.quality,
          })
          .eq("id", editingDigitalLink.id)

        if (error) throw error

        setDigitalLinks((prev) =>
          prev.map((link) =>
            link.id === editingDigitalLink.id
              ? {
                  ...link,
                  source_name: editForm.source_name,
                  source_url: editForm.source_url,
                  quality: editForm.quality,
                }
              : link,
          ),
        )
        // Update local state as well
        setLocalDigitalLinks((prev) =>
          prev.map((link) =>
            link.id === editingDigitalLink.id
              ? {
                  ...link,
                  source_name: editForm.source_name,
                  source_url: editForm.source_url,
                  quality: editForm.quality,
                }
              : link,
          ),
        )
      }

      setIsEditModalOpen(false)
      // Capture the edited link's identity BEFORE clearing the editing state,
      // so we can auto-revalidate the new URL once the modal is closed.
      const justEdited: { id: string; url: string; type: "download" | "digital" | "streaming" } | null =
        editingDownloadLink
          ? { id: editingDownloadLink.id, url: editForm.source_url, type: "download" }
          : editingDigitalLink
          ? { id: editingDigitalLink.id, url: editForm.source_url, type: "digital" }
          : editingStreamingLink
          ? { id: editingStreamingLink.id, url: editForm.source_url, type: "streaming" }
          : null
      setEditingStreamingLink(null)
      setEditingDownloadLink(null)
      setEditingDigitalLink(null)
      setEditForm({ source_name: "", source_url: "", quality: "", language: "", link_type: "" })

      // Fire-and-forget revalidation so the row leaves the "Liens Invalides"
      // bucket immediately if the new URL actually works.
      if (justEdited && justEdited.url) {
        checkLinkValidity(justEdited.id, justEdited.url, justEdited.type).catch(() => {})
      }
    } catch (error) {
      console.error("Error updating link:", error)
      alert("Erreur lors de la modification du lien")
    } finally {
      setIsSaving(false)
    }
  }

  const checkLinkValidity = async (linkId: string, url: string, linkType: "download" | "digital" | "streaming") => {
    setCheckingLinkId(linkId)
    try {
      const response = await fetch("/api/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, linkType, url }),
      })
      const result = await response.json()

      // Update local state
      if (linkType === "download") {
        setLocalDownloadLinks((prev) =>
          prev.map((l) =>
            l.id === linkId ? { ...l, is_valid: result.isValid, last_checked: new Date().toISOString() } : l,
          ),
        )
      } else if (linkType === "digital") {
        setLocalDigitalLinks((prev) =>
          prev.map((l) =>
            l.id === linkId ? { ...l, is_valid: result.isValid, last_checked: new Date().toISOString() } : l,
          ),
        )
      }

      return result
    } catch (error) {
      console.error("Error checking link:", error)
    } finally {
      setCheckingLinkId(null)
    }
  }

  /**
   * Bulk-revalidate every download + digital link owned by the current user.
   * Calls /api/check-link sequentially (one URL at a time) to avoid hammering
   * remote hosts and to keep the per-link progress feedback meaningful.
   */
  const handleTestAllLinks = async () => {
    if (isTestingAll) return

    const targets: Array<{ id: string; url: string; linkType: "download" | "digital" }> = []
    for (const l of localDownloadLinks) {
      if (l.source_url) targets.push({ id: l.id, url: l.source_url, linkType: "download" })
    }
    for (const l of localDigitalLinks) {
      if (l.source_url) targets.push({ id: l.id, url: l.source_url, linkType: "digital" })
    }

    if (targets.length === 0) {
      alert("Aucun lien à tester pour le moment.")
      return
    }

    setIsTestingAll(true)
    let valid = 0
    let invalid = 0
    setTestProgress({ checked: 0, total: targets.length, valid: 0, invalid: 0 })

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i]
      try {
        const response = await fetch("/api/check-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId: t.id, linkType: t.linkType, url: t.url }),
        })
        const result = await response.json()
        const isValid = !!result.isValid
        if (isValid) valid++
        else invalid++

        if (t.linkType === "download") {
          setLocalDownloadLinks((prev) =>
            prev.map((l) =>
              l.id === t.id ? { ...l, is_valid: isValid, last_checked: new Date().toISOString() } : l,
            ),
          )
        } else {
          setLocalDigitalLinks((prev) =>
            prev.map((l) =>
              l.id === t.id ? { ...l, is_valid: isValid, last_checked: new Date().toISOString() } : l,
            ),
          )
        }
      } catch (e) {
        invalid++
      }
      setTestProgress({ checked: i + 1, total: targets.length, valid, invalid })
    }

    setIsTestingAll(false)
    // Keep the final summary on screen until the user clicks elsewhere; auto-clear
    // after 8s so it doesn't stay forever.
    setTimeout(() => setTestProgress(null), 8000)
  }

  const getValidityBadge = (link: { is_valid?: boolean | null; last_checked?: string | null }) => {
    if (link.is_valid === null || link.is_valid === undefined) {
      return (
        <Badge variant="outline" className="text-gray-400 border-gray-600">
          <ShieldQuestion className="w-3 h-3 mr-1" />
          Non vérifié
        </Badge>
      )
    }
    if (link.is_valid) {
      return (
        <Badge variant="outline" className="text-emerald-500 border-emerald-500">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Valide
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-red-500 border-red-500">
        <ShieldX className="w-3 h-3 mr-1" />
        Invalide
      </Badge>
    )
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

  const filteredStreamingLinks = streamingLinks.filter((link) => {
    const mediaInfo = getMediaInfo(link)
    const matchesSearch =
      streamingSearch === "" ||
      mediaInfo.title.toLowerCase().includes(streamingSearch.toLowerCase()) ||
      link.source_name.toLowerCase().includes(streamingSearch.toLowerCase())
    const matchesStatus = streamingStatusFilter === "all" || link.status === streamingStatusFilter
    const matchesType = streamingTypeFilter === "all" || link.media_type === streamingTypeFilter
    const matchesQuality = streamingQualityFilter === "all" || link.quality === streamingQualityFilter
    return matchesSearch && matchesStatus && matchesType && matchesQuality
  })

  const filteredDownloadLinks = localDownloadLinks.filter((link) => {
    // Use localDownloadLinks for filtering
    const mediaInfo = getMediaInfo(link)
    const matchesSearch =
      downloadSearch === "" ||
      mediaInfo.title.toLowerCase().includes(downloadSearch.toLowerCase()) ||
      link.source_name.toLowerCase().includes(downloadSearch.toLowerCase())
    const matchesStatus = downloadStatusFilter === "all" || link.status === downloadStatusFilter
    const matchesType = downloadTypeFilter === "all" || link.media_type === downloadTypeFilter
    const matchesQuality = downloadQualityFilter === "all" || link.quality === downloadQualityFilter
    return matchesSearch && matchesStatus && matchesType && matchesQuality
  })

  const filteredDigitalLinks = localDigitalLinks.filter((link) => {
    // Use localDigitalLinks for filtering
    const content = digitalContents.find((c) => c.id === link.content_id)
    const title = content?.title || ""
    const matchesSearch =
      downloadSearch === "" ||
      title.toLowerCase().includes(downloadSearch.toLowerCase()) ||
      link.source_name.toLowerCase().includes(downloadSearch.toLowerCase())
    const matchesStatus = downloadStatusFilter === "all" || link.status === downloadStatusFilter
    return matchesSearch && matchesStatus
  })

  const streamingQualities = [...new Set(streamingLinks.map((l) => l.quality))].filter(Boolean)
  const downloadQualities = [...new Set(localDownloadLinks.map((l) => l.quality))].filter(Boolean) // Use localDownloadLinks

  // Edit modal handlers and state management
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingStreamingLink(null)
    setEditingDownloadLink(null)
    setEditingDigitalLink(null)
    setEditForm({ source_name: "", source_url: "", quality: "", language: "", link_type: "" })
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
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
                <CardDescription>Debloquez des fonctionnalites ancees</CardDescription>
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
                <BookOpen className="h-4 w-4" />
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
              {(() => {
                const invalidDownloadLinks = localDownloadLinks.filter((l) => l.is_valid === false)
                const invalidDigitalLinks = localDigitalLinks.filter((l) => l.is_valid === false)
                const totalInvalidLinks = invalidDownloadLinks.length + invalidDigitalLinks.length
                const totalUserLinks = localDownloadLinks.length + localDigitalLinks.length

                const testAllButton = totalUserLinks > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestAllLinks}
                    disabled={isTestingAll}
                    data-testid="test-all-links-btn"
                    className="text-primary border-primary/40 hover:bg-primary/10 bg-transparent gap-2"
                  >
                    {isTestingAll ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Test en cours… {testProgress ? `${testProgress.checked}/${testProgress.total}` : ""}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tester mes liens
                      </>
                    )}
                  </Button>
                ) : null

                const progressBanner =
                  testProgress && !isTestingAll ? (
                    <div
                      data-testid="test-progress-summary"
                      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Test terminé&nbsp;: {testProgress.checked} vérifiés —{" "}
                      <span className="text-emerald-400">{testProgress.valid} valides</span> ·{" "}
                      <span className="text-red-400">{testProgress.invalid} invalides</span>.
                    </div>
                  ) : null

                if (totalInvalidLinks === 0) {
                  if (!testAllButton && !progressBanner) return null
                  return (
                    <Card className="border-zinc-800 bg-zinc-900/50">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Tous tes liens semblent OK
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tu peux relancer une vérification complète à tout moment.
                          </p>
                        </div>
                        {testAllButton}
                      </CardHeader>
                      {progressBanner && <CardContent className="pt-0">{progressBanner}</CardContent>}
                    </Card>
                  )
                }

                return (
                  <Card className="border-red-800/50 bg-red-950/20">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2 text-red-400">
                          <ShieldX className="w-4 h-4" />
                          Liens Invalides ({totalInvalidLinks})
                        </CardTitle>
                        <p className="text-xs text-red-400/70 mt-1">
                          Ces liens ne fonctionnent plus. Mets-les à jour, supprime-les ou retente une validation.
                        </p>
                      </div>
                      {testAllButton}
                    </CardHeader>
                    <CardContent>
                      {progressBanner && <div className="mb-3">{progressBanner}</div>}
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {invalidDownloadLinks.map((link) => {
                          const mediaInfo = getMediaInfo(link)
                          const episodeInfo = formatEpisodeInfo(link)
                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-red-800/30"
                            >
                              <div className="flex items-center gap-3">
                                {mediaInfo.poster ? (
                                  <img
                                    src={mediaInfo.poster || "/placeholder.svg"}
                                    alt={mediaInfo.title}
                                    className="w-12 h-16 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-16 bg-zinc-800 rounded flex items-center justify-center">
                                    <Film className="w-5 h-5 text-zinc-600" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium">
                                    {mediaInfo.title} {episodeInfo}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{link.source_name}</p>
                                  <Badge variant="outline" className="text-xs mt-1 text-blue-400 border-blue-600">
                                    Download
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {(profile.role === "uploader" || profile.role === "admin") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-400 border-blue-600 hover:bg-blue-600/20 bg-transparent"
                                    onClick={() => handleEditDownloadLink(link)}
                                    data-testid={`invalid-download-edit-${link.id}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-400 border-emerald-600 hover:bg-emerald-600/20 bg-transparent"
                                  onClick={() => checkLinkValidity(link.id, link.source_url, "download")}
                                  disabled={checkingLinkId === link.id || isTestingAll}
                                  data-testid={`invalid-download-revalidate-${link.id}`}
                                  title="Revalider ce lien"
                                >
                                  {checkingLinkId === link.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-400 border-red-600 hover:bg-red-600/20 bg-transparent"
                                  onClick={() => handleDeleteDownloadLink(link.id)}
                                  disabled={deletingId === link.id}
                                  data-testid={`invalid-download-delete-${link.id}`}
                                >
                                  {deletingId === link.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                        {invalidDigitalLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-red-800/30"
                          >
                            <div className="flex items-center gap-3">
                              {link.digital_content?.cover_url ? (
                                <img
                                  src={link.digital_content.cover_url || "/placeholder.svg"}
                                  alt={link.digital_content?.title || "Digital"}
                                  className="w-12 h-16 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-16 bg-zinc-800 rounded flex items-center justify-center">
                                  <FileDown className="w-5 h-5 text-zinc-600" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium">
                                  {link.digital_content?.title || "Contenu digital"}
                                </p>
                                <p className="text-xs text-muted-foreground">{link.source_name}</p>
                                <Badge variant="outline" className="text-xs mt-1 text-amber-400 border-amber-600">
                                  Digital
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(profile.role === "uploader" || profile.role === "admin") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-400 border-blue-600 hover:bg-blue-600/20 bg-transparent"
                                  onClick={() => handleEditDigitalLink(link)}
                                  data-testid={`invalid-digital-edit-${link.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-400 border-emerald-600 hover:bg-emerald-600/20 bg-transparent"
                                onClick={() => checkLinkValidity(link.id, link.source_url, "digital")}
                                disabled={checkingLinkId === link.id || isTestingAll}
                                data-testid={`invalid-digital-revalidate-${link.id}`}
                                title="Revalider ce lien"
                              >
                                {checkingLinkId === link.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-400 border-red-600 hover:bg-red-600/20 bg-transparent"
                                onClick={() => handleDeleteDigitalLink(link.id)}
                                disabled={deletingId === link.id}
                                data-testid={`invalid-digital-delete-${link.id}`}
                              >
                                {deletingId === link.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
              {/* End Invalid Links Section */}

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
                      {[
                        ...streamingLinks.map((link) => ({ ...link, linkType: "streaming" as const })),
                        ...downloadLinks.map((link) => ({ ...link, linkType: "download" as const })),
                      ]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5)
                        .map((link, i) => {
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
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(link.created_at).toLocaleDateString("fr-FR")}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        link.linkType === "streaming"
                                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                          : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                                      }`}
                                    >
                                      {link.linkType === "streaming" ? "Streaming" : "Téléchargement"}
                                    </Badge>
                                  </div>
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
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par titre ou source..."
                        value={streamingSearch}
                        onChange={(e) => setStreamingSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select value={streamingStatusFilter} onValueChange={setStreamingStatusFilter}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous statuts</SelectItem>
                          <SelectItem value="approved">Approuve</SelectItem>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="rejected">Rejete</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={streamingTypeFilter} onValueChange={setStreamingTypeFilter}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous types</SelectItem>
                          <SelectItem value="movie">Film</SelectItem>
                          <SelectItem value="tv">Serie</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={streamingQualityFilter} onValueChange={setStreamingQualityFilter}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Qualite" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes qualites</SelectItem>
                          {streamingQualities.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {filteredStreamingLinks.length} lien(s) sur {streamingLinks.length}
                  </div>

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
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStreamingLinks.map((link) => {
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
                                <Link
                                  href={`/embed/${link.ww_id}/stats`}
                                  target="_blank"
                                  className="flex items-center gap-1 text-orange-500 hover:text-orange-400 hover:underline underline-offset-2"
                                  title="Voir les stats détaillées"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{link.view_count}</span>
                                  <BarChart3 className="w-3 h-3 opacity-50" />
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {new Date(link.created_at).toLocaleDateString("fr-FR")}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                      onClick={() => handleEditStreamingLink(link)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
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
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {filteredStreamingLinks.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                              Aucun resultat trouve
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Download Tab */}
            <TabsContent value="download" className="mt-0">
              {localDownloadLinks.length === 0 && localDigitalLinks.length === 0 ? (
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
                  <div className="flex flex-col md:flex-row gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par titre ou source..."
                        value={downloadSearch}
                        onChange={(e) => setDownloadSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select value={downloadStatusFilter} onValueChange={setDownloadStatusFilter}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous statuts</SelectItem>
                          <SelectItem value="approved">Approuve</SelectItem>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="rejected">Rejete</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={downloadTypeFilter} onValueChange={setDownloadTypeFilter}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous types</SelectItem>
                          <SelectItem value="movie">Film</SelectItem>
                          <SelectItem value="tv">Serie</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={downloadQualityFilter} onValueChange={setDownloadQualityFilter}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Qualite" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes qualites</SelectItem>
                          {downloadQualities.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {filteredDownloadLinks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Download className="w-4 h-4 text-blue-500" />
                        Films & Series ({filteredDownloadLinks.length} sur {localDownloadLinks.length})
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
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Validite</th>{" "}
                              {/* Added Validity Header */}
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Vues</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDownloadLinks.map((link) => {
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
                                    {/* Validity Column */}
                                    {checkingLinkId === link.id ? (
                                      <div className="flex items-center gap-1 text-blue-500">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                                      </div>
                                    ) : (
                                      getValidityBadge(link)
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <Link
                                      href={`/embed/${link.ww_id}/stats`}
                                      target="_blank"
                                      className="flex items-center gap-1 text-orange-500 hover:text-orange-400 hover:underline underline-offset-2"
                                      title="Voir les stats détaillées"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{link.view_count}</span>
                                      <BarChart3 className="w-3 h-3 opacity-50" />
                                    </Link>
                                  </td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {new Date(link.created_at).toLocaleDateString("fr-FR")}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1">
                                      {canEdit && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                          onClick={() => handleEditDownloadLink(link)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                        onClick={() => checkLinkValidity(link.id, link.source_url, "download")}
                                        disabled={checkingLinkId !== null}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
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
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                            {filteredDownloadLinks.length === 0 && localDownloadLinks.length > 0 && (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                                  {" "}
                                  {/* Increased colSpan */}
                                  Aucun resultat trouve
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {localDigitalLinks.length > 0 && ( // Use localDigitalLinks
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        Contenu Digital ({localDigitalLinks.filter((l) => l.status === "approved").length} valides /{" "}
                        {localDigitalLinks.length} soumis)
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contenu</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Source</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Validite</th>{" "}
                              {/* Added Validity Header */}
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {localDigitalLinks.map((link) => {
                              // Iterate over localDigitalLinks
                              const content = digitalContents.find((c) => c.id === link.content_id)
                              const getContentTypeIcon = (type: string) => {
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
                                    return <Package className="w-4 h-4" />
                                }
                              }
                              return (
                                <tr
                                  key={link.id}
                                  className="border-t border-border hover:bg-muted/30 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      {content?.cover_url ? (
                                        <img
                                          src={content.cover_url || "/placeholder.svg"}
                                          alt={content?.title}
                                          className="w-10 h-14 object-cover rounded"
                                        />
                                      ) : (
                                        <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                          {getContentTypeIcon(content?.content_type || "")}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium line-clamp-1">{content?.title || "Inconnu"}</p>
                                        <p className="text-xs text-muted-foreground">{content?.creator}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline" className="capitalize">
                                      {content?.content_type || "digital"}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 font-medium">{link.source_name}</td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline">{link.quality}</Badge>
                                  </td>
                                  <td className="py-3 px-4">{getStatusBadge(link.status)}</td>
                                  <td className="py-3 px-4">
                                    {/* Validity Column */}
                                    {checkingLinkId === link.id ? (
                                      <div className="flex items-center gap-1 text-blue-500">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                                      </div>
                                    ) : (
                                      getValidityBadge(link)
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {new Date(link.created_at).toLocaleDateString("fr-FR")}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1">
                                      {canEdit && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                          onClick={() => handleEditDigitalLink(link)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                        onClick={() => checkLinkValidity(link.id, link.source_url, "digital")}
                                        disabled={checkingLinkId !== null}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
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
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                            {localDigitalLinks.length === 0 && digitalLinks.length > 0 && (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                  Aucun resultat trouve
                                </td>
                              </tr>
                            )}
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
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
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
                            <Link
                              href={`/embed/${content.ww_id}/stats`}
                              target="_blank"
                              className="flex items-center gap-1 text-orange-500 hover:text-orange-400 hover:underline underline-offset-2"
                              title="Voir les stats détaillées"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{content.view_count}</span>
                              <BarChart3 className="w-3 h-3 opacity-50" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                  onClick={() => handleEditDigitalLink(content)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleDeleteDigitalLink(content.id)}
                                disabled={deletingId === content.id}
                                title="Supprimer le lien"
                              >
                                {deletingId === content.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                  onClick={() =>
                                    handleDeleteDigitalContent(
                                      content.digital_content?.id || content.content_id,
                                      content.ww_id,
                                    )
                                  }
                                  disabled={deletingId === content.id}
                                  title="Supprimer le contenu + tous les liens"
                                >
                                  {deletingId === content.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Package className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
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
                            <BookOpen className="w-7 h-7 text-amber-500" />
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

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier le lien</DialogTitle>
              <DialogDescription>
                Modifiez les informations du lien. Les champs marques * sont obligatoires.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-source-name">Nom de la source *</Label>
                <Input
                  id="edit-source-name"
                  value={editForm.source_name}
                  onChange={(e) => setEditForm({ ...editForm, source_name: e.target.value })}
                  placeholder="Ex: Uptobox, 1Fichier..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-source-url">URL du lien *</Label>
                <Input
                  id="edit-source-url"
                  value={editForm.source_url}
                  onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-quality">Qualite *</Label>
                <Select
                  value={editForm.quality}
                  onValueChange={(value) => setEditForm({ ...editForm, quality: value })}
                >
                  <SelectTrigger id="edit-quality">
                    <SelectValue placeholder="Selectionnez une qualite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAM">CAM</SelectItem>
                    <SelectItem value="TS">TS</SelectItem>
                    <SelectItem value="DVDSCR">DVDSCR</SelectItem>
                    <SelectItem value="HDTS">HDTS</SelectItem>
                    <SelectItem value="WEBRip">WEBRip</SelectItem>
                    <SelectItem value="HDRip">HDRip</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="2160p">2160p (4K)</SelectItem>
                    <SelectItem value="REMUX">REMUX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(editingStreamingLink || editingDownloadLink) && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-language">Langue</Label>
                  <Select
                    value={editForm.language}
                    onValueChange={(value) => setEditForm({ ...editForm, language: value })}
                  >
                    <SelectTrigger id="edit-language">
                      <SelectValue placeholder="Selectionnez une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VF">VF (Francais)</SelectItem>
                      <SelectItem value="VOSTFR">VOSTFR</SelectItem>
                      <SelectItem value="VO">VO</SelectItem>
                      <SelectItem value="MULTI">MULTI</SelectItem>
                      <SelectItem value="TRUEFRENCH">TRUEFRENCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingDownloadLink && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-link-type">Type de lien</Label>
                  <Select
                    value={editForm.link_type}
                    onValueChange={(value) => setEditForm({ ...editForm, link_type: value })}
                  >
                    <SelectTrigger id="edit-link-type">
                      <SelectValue placeholder="Selectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="torrent">Torrent</SelectItem>
                      <SelectItem value="magnet">Magnet</SelectItem>
                      <SelectItem value="ddl">DDL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving || !editForm.source_name || !editForm.source_url}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  )
}
