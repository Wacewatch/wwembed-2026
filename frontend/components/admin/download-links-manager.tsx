"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  User,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  AlertTriangle,
  Trash2,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  SkipForward,
} from "lucide-react"
import type { DownloadLink } from "@/lib/types"

interface DownloadLinkWithProfile extends DownloadLink {
  profiles?: { username: string } | null
}

interface InvalidLinkWithMedia extends DownloadLinkWithProfile {
  mediaTitle?: string
  mediaPoster?: string
  isDigital?: boolean
}

export function DownloadLinksManager() {
  const [links, setLinks] = useState<DownloadLinkWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [users, setUsers] = useState<{ id: string; username: string }[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 100
  const [editingLink, setEditingLink] = useState<DownloadLinkWithProfile | null>(null)
  const [editData, setEditData] = useState({
    source_name: "",
    source_url: "",
    quality: "HD",
    link_type: "direct" as "direct" | "torrent" | "magnet",
    file_size: "",
    language: "vf",
  })
  const [checkingLinkId, setCheckingLinkId] = useState<string | null>(null)

  const [isCheckingAll, setIsCheckingAll] = useState(false)
  const [checkProgress, setCheckProgress] = useState(0)
  const [checkTotal, setCheckTotal] = useState(0)
  const [checkBatchStart, setCheckBatchStart] = useState(0)
  const [totalLinksToCheck, setTotalLinksToCheck] = useState(0)
  const BATCH_SIZE = 1000

  const [invalidLinks, setInvalidLinks] = useState<InvalidLinkWithMedia[]>([])
  const [loadingInvalid, setLoadingInvalid] = useState(false)
  const [showInvalidSection, setShowInvalidSection] = useState(true)

  const [isCheckingInvalid, setIsCheckingInvalid] = useState(false)
  const [invalidCheckProgress, setInvalidCheckProgress] = useState(0)

  useEffect(() => {
    loadLinks()
    loadUsers()
    loadInvalidLinks()
    countTotalLinks()
  }, [page, userFilter, statusFilter])

  const loadUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("profiles").select("id, username").order("username")
    setUsers(data || [])
  }

  const loadLinks = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase.from("download_links").select("*, profiles:submitted_by(username)", { count: "exact" })

    if (userFilter !== "all") {
      query = query.eq("submitted_by", userFilter)
    }

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    setLinks(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  const countTotalLinks = async () => {
    const supabase = createClient()
    const { count: downloadCount } = await supabase
      .from("download_links")
      .select("*", { count: "exact", head: true })
      .not("source_url", "is", null)
    const { count: digitalCount } = await supabase
      .from("digital_download_links")
      .select("*", { count: "exact", head: true })
      .not("source_url", "is", null)
    setTotalLinksToCheck((downloadCount || 0) + (digitalCount || 0))
  }

  const fetchLinksBatch = async (start: number, limit: number) => {
    const supabase = createClient()
    const allLinks: any[] = []

    // Fetch download links
    const { data: downloadData } = await supabase
      .from("download_links")
      .select("id, source_url")
      .not("source_url", "is", null)
      .order("created_at", { ascending: true })
      .range(start, start + limit - 1)

    if (downloadData) {
      allLinks.push(...downloadData.map((l) => ({ ...l, type: "download" })))
    }

    // If we need more links, fetch from digital
    if (allLinks.length < limit) {
      const digitalStart = Math.max(
        0,
        start -
          (
            await supabase
              .from("download_links")
              .select("*", { count: "exact", head: true })
              .not("source_url", "is", null)
          ).count!,
      )
      const digitalLimit = limit - allLinks.length

      const { data: digitalData } = await supabase
        .from("digital_download_links")
        .select("id, source_url")
        .not("source_url", "is", null)
        .order("created_at", { ascending: true })
        .range(digitalStart, digitalStart + digitalLimit - 1)

      if (digitalData) {
        allLinks.push(...digitalData.map((l) => ({ ...l, type: "digital" })))
      }
    }

    return allLinks
  }

  const loadInvalidLinks = async () => {
    setLoadingInvalid(true)
    const supabase = createClient()

    const fetchAllInvalidLinks = async (table: string, selectFields: string) => {
      const allLinks: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data } = await supabase
          .from(table)
          .select(selectFields)
          .eq("is_valid", false)
          .order("last_checked", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (data && data.length > 0) {
          allLinks.push(...data)
          hasMore = data.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      return allLinks
    }

    const downloadInvalid = await fetchAllInvalidLinks("download_links", "*, profiles:submitted_by(username)")
    const digitalInvalid = await fetchAllInvalidLinks(
      "digital_download_links",
      "*, profiles:submitted_by(username), digital_content(title, cover_url)",
    )

    // Fetch TMDB info for download links
    const invalidWithMedia: InvalidLinkWithMedia[] = []

    for (const link of downloadInvalid || []) {
      let mediaTitle = `${link.media_type === "movie" ? "Film" : "Série"} #${link.tmdb_id}`
      let mediaPoster = ""

      try {
        const tmdbRes = await fetch(`/api/tmdb-info?type=${link.media_type}&id=${link.tmdb_id}`)
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json()
          mediaTitle = tmdbData.title || tmdbData.name || mediaTitle
          mediaPoster = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w92${tmdbData.poster_path}` : ""
        }
      } catch (e) {
        // Ignore TMDB errors
      }

      invalidWithMedia.push({
        ...link,
        mediaTitle,
        mediaPoster,
        isDigital: false,
      })
    }

    // Add digital links
    for (const link of digitalInvalid || []) {
      invalidWithMedia.push({
        ...link,
        mediaTitle: (link as any).digital_content?.title || "Contenu Digital",
        mediaPoster: (link as any).digital_content?.cover_url || "",
        isDigital: true,
      })
    }

    setInvalidLinks(invalidWithMedia)
    setLoadingInvalid(false)
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("download_links").update({ is_active: !currentState }).eq("id", id)
    loadLinks()
  }

  const toggleVerified = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("download_links").update({ is_verified: !currentState }).eq("id", id)
    loadLinks()
  }

  const deleteLink = async (id: string) => {
    if (!confirm("Supprimer ce lien?")) return
    const supabase = createClient()
    await supabase.from("download_links").delete().eq("id", id)
    loadLinks()
    loadInvalidLinks()
  }

  const deleteInvalidLink = async (id: string, isDigital = false) => {
    if (!confirm("Supprimer ce lien invalide?")) return
    const supabase = createClient()
    const table = isDigital ? "digital_download_links" : "download_links"
    await supabase.from(table).delete().eq("id", id)
    loadInvalidLinks()
    loadLinks()
  }

  const openEdit = (link: DownloadLinkWithProfile) => {
    setEditingLink(link)
    setEditData({
      source_name: link.source_name,
      source_url: link.source_url,
      quality: link.quality || "HD",
      link_type: link.link_type || "direct",
      file_size: link.file_size || "",
      language: link.language || "vf",
    })
  }

  const saveEdit = async () => {
    if (!editingLink) return
    const supabase = createClient()
    await supabase
      .from("download_links")
      .update({
        source_name: editData.source_name,
        source_url: editData.source_url,
        quality: editData.quality,
        link_type: editData.link_type,
        file_size: editData.file_size,
        language: editData.language,
      })
      .eq("id", editingLink.id)
    setEditingLink(null)
    loadLinks()
  }

  const checkLinkValidity = async (linkId: string, url: string, linkType = "download") => {
    setCheckingLinkId(linkId)
    try {
      const response = await fetch("/api/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, linkType, url }),
      })
      const result = await response.json()

      setLinks((prev) =>
        prev.map((l) =>
          l.id === linkId ? { ...l, is_valid: result.isValid, last_checked: new Date().toISOString() } : l,
        ),
      )

      return result
    } catch (error) {
      console.error("Error checking link:", error)
    } finally {
      setCheckingLinkId(null)
    }
  }

  const checkLinksBatch = async () => {
    setIsCheckingAll(true)
    setCheckProgress(0)

    const supabase = createClient()

    // Fetch batch of download links
    const { data: downloadLinks } = await supabase
      .from("download_links")
      .select("id, source_url")
      .not("source_url", "is", null)
      .order("created_at", { ascending: true })
      .range(checkBatchStart, checkBatchStart + BATCH_SIZE - 1)

    const linksToCheck = (downloadLinks || []).map((l) => ({ ...l, type: "download" }))

    // If we have less than BATCH_SIZE, also get digital links
    if (linksToCheck.length < BATCH_SIZE) {
      const { count: downloadCount } = await supabase
        .from("download_links")
        .select("*", { count: "exact", head: true })
        .not("source_url", "is", null)

      const digitalStart = Math.max(0, checkBatchStart - (downloadCount || 0))
      const digitalLimit = BATCH_SIZE - linksToCheck.length

      const { data: digitalLinks } = await supabase
        .from("digital_download_links")
        .select("id, source_url")
        .not("source_url", "is", null)
        .order("created_at", { ascending: true })
        .range(digitalStart, digitalStart + digitalLimit - 1)

      if (digitalLinks) {
        linksToCheck.push(...digitalLinks.map((l) => ({ ...l, type: "digital" })))
      }
    }

    setCheckTotal(linksToCheck.length)

    for (let i = 0; i < linksToCheck.length; i++) {
      const link = linksToCheck[i]
      try {
        await fetch("/api/check-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId: link.id,
            linkType: link.type,
            url: link.source_url,
          }),
        })
      } catch (e) {
        console.error("Error checking link:", e)
      }
      setCheckProgress(i + 1)
    }

    setIsCheckingAll(false)
    setCheckBatchStart(checkBatchStart + BATCH_SIZE)
    loadInvalidLinks()
    loadLinks()
  }

  const checkAllInvalidLinks = async () => {
    setIsCheckingInvalid(true)
    setInvalidCheckProgress(0)

    for (let i = 0; i < invalidLinks.length; i++) {
      const link = invalidLinks[i]
      try {
        await fetch("/api/check-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId: link.id,
            linkType: link.isDigital ? "digital" : "download",
            url: link.source_url,
          }),
        })
      } catch (e) {
        console.error("Error checking link:", e)
      }
      setInvalidCheckProgress(i + 1)
    }

    setIsCheckingInvalid(false)
    loadInvalidLinks()
    loadLinks()
  }

  const recheckInvalidLink = async (link: InvalidLinkWithMedia) => {
    setCheckingLinkId(link.id)
    try {
      await fetch("/api/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: link.id,
          linkType: link.isDigital ? "digital" : "download",
          url: link.source_url,
        }),
      })
      loadInvalidLinks()
    } catch (e) {
      console.error("Error rechecking link:", e)
    } finally {
      setCheckingLinkId(null)
    }
  }

  const filteredLinks = links.filter(
    (l) =>
      l.source_name.toLowerCase().includes(search.toLowerCase()) ||
      l.ww_id.toLowerCase().includes(search.toLowerCase()) ||
      String(l.tmdb_id).includes(search) ||
      (l.profiles?.username || "").toLowerCase().includes(search.toLowerCase()),
  )

  const totalPages = Math.ceil(totalCount / pageSize)

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>
  }

  return (
    <div className="space-y-4">
      {/* Section Liens Invalides */}
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="cursor-pointer" onClick={() => setShowInvalidSection(!showInvalidSection)}>
          <CardTitle className="flex items-center justify-between text-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Liens Invalides ({invalidLinks.length})
            </div>
            <div className="flex items-center gap-2">
              {showInvalidSection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardTitle>
        </CardHeader>

        {showInvalidSection && (
          <CardContent>
            <div className="mb-4 p-4 bg-background/50 rounded-lg border border-border">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <div className="text-sm text-muted-foreground">
                  Total liens: <span className="font-bold text-foreground">{totalLinksToCheck}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Position: <span className="font-bold text-foreground">{checkBatchStart}</span> / {totalLinksToCheck}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkLinksBatch}
                  disabled={isCheckingAll || isCheckingInvalid}
                  className="text-amber-400 border-amber-400/30 bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingAll ? "animate-spin" : ""}`} />
                  Vérifier 1000 liens
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckBatchStart(checkBatchStart + BATCH_SIZE)}
                  disabled={isCheckingAll || checkBatchStart >= totalLinksToCheck}
                  className="text-blue-400 border-blue-400/30"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  1000 suivants
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckBatchStart(0)}
                  disabled={isCheckingAll}
                  className="text-gray-400 border-gray-400/30"
                >
                  Recommencer
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkAllInvalidLinks}
                  disabled={isCheckingAll || isCheckingInvalid || invalidLinks.length === 0}
                  className="text-red-400 border-red-400/30 bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingInvalid ? "animate-spin" : ""}`} />
                  Re-vérifier invalides ({invalidLinks.length})
                </Button>
              </div>
            </div>

            {isCheckingAll && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Vérification batch en cours...</span>
                  <span>
                    {checkProgress} / {checkTotal}
                  </span>
                </div>
                <Progress value={(checkProgress / checkTotal) * 100} className="h-2" />
              </div>
            )}

            {isCheckingInvalid && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Re-vérification des liens invalides...</span>
                  <span>
                    {invalidCheckProgress} / {invalidLinks.length}
                  </span>
                </div>
                <Progress value={(invalidCheckProgress / invalidLinks.length) * 100} className="h-2 bg-red-500/20" />
              </div>
            )}

            {loadingInvalid ? (
              <div className="text-center py-4 text-muted-foreground">Chargement des liens invalides...</div>
            ) : invalidLinks.length === 0 ? (
              <div className="text-center py-4 text-green-400">Aucun lien invalide détecté</div>
            ) : (
              <div className="grid gap-3 max-h-[500px] overflow-y-auto">
                {invalidLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-red-500/20"
                  >
                    {/* Poster */}
                    <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                      {link.mediaPoster ? (
                        <img
                          src={link.mediaPoster || "/placeholder.svg"}
                          alt={link.mediaTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{link.mediaTitle}</div>
                      <div className="text-sm text-muted-foreground truncate">{link.source_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={link.isDigital ? "text-amber-400" : "text-blue-400"}>
                          {link.isDigital ? "Digital" : link.media_type === "movie" ? "Film" : "Série"}
                        </Badge>
                        {link.profiles?.username && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {link.profiles.username}
                          </span>
                        )}
                        {link.last_checked && (
                          <span className="text-xs text-muted-foreground">
                            Vérifié: {new Date(link.last_checked).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => recheckInvalidLink(link)}
                        disabled={checkingLinkId === link.id}
                      >
                        <RefreshCw className={`h-4 w-4 ${checkingLinkId === link.id ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteInvalidLink(link.id, link.isDigital)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={userFilter}
          onValueChange={(v) => {
            setUserFilter(v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par utilisateur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">Total: {totalCount} liens</div>
      </div>

      {/* Liste des liens */}
      <div className="space-y-2">
        {filteredLinks.map((link) => (
          <Card key={link.id} className="p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{link.source_name}</span>
                  <Badge variant="outline">{link.media_type === "movie" ? "Film" : "Série"}</Badge>
                  <Badge variant="secondary">{link.quality}</Badge>
                  <Badge
                    className={
                      link.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : link.status === "pending"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                    }
                  >
                    {link.status === "approved" ? "Approuvé" : link.status === "pending" ? "En attente" : "Rejeté"}
                  </Badge>
                  {/* Validation badge */}
                  {link.is_valid === true && (
                    <Badge className="bg-green-500/20 text-green-400">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Valide
                    </Badge>
                  )}
                  {link.is_valid === false && (
                    <Badge className="bg-red-500/20 text-red-400">
                      <ShieldX className="h-3 w-3 mr-1" />
                      Invalide
                    </Badge>
                  )}
                  {link.is_valid === null && (
                    <Badge className="bg-gray-500/20 text-gray-400">
                      <ShieldQuestion className="h-3 w-3 mr-1" />
                      Non vérifié
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  WW: {link.ww_id} | TMDB: {link.tmdb_id}
                  {link.profiles?.username && (
                    <span className="text-green-400 ml-2">
                      <User className="h-3 w-3 inline mr-1" />
                      {link.profiles.username}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => checkLinkValidity(link.id, link.source_url, "download")}
                  disabled={checkingLinkId === link.id}
                  title="Vérifier le lien"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingLinkId === link.id ? "animate-spin" : ""}`} />
                </Button>

                <div className="flex items-center gap-1">
                  <Switch
                    id={`active-${link.id}`}
                    checked={link.is_active}
                    onCheckedChange={() => toggleActive(link.id, link.is_active)}
                  />
                  <Label htmlFor={`active-${link.id}`} className="text-xs">
                    Actif
                  </Label>
                </div>

                <div className="flex items-center gap-1">
                  <Switch
                    id={`verified-${link.id}`}
                    checked={link.is_verified}
                    onCheckedChange={() => toggleVerified(link.id, link.is_verified)}
                  />
                  <Label htmlFor={`verified-${link.id}`} className="text-xs">
                    Vérifié
                  </Label>
                </div>

                <Button size="sm" variant="ghost" onClick={() => openEdit(link)}>
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteLink(link.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page + 1} sur {totalPages || 1}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le lien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom de la source</Label>
              <Input
                value={editData.source_name}
                onChange={(e) => setEditData((d) => ({ ...d, source_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={editData.source_url}
                onChange={(e) => setEditData((d) => ({ ...d, source_url: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qualité</Label>
                <Select value={editData.quality} onValueChange={(v) => setEditData((d) => ({ ...d, quality: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAM">CAM</SelectItem>
                    <SelectItem value="TS">TS</SelectItem>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="HD">HD</SelectItem>
                    <SelectItem value="FHD">FHD</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={editData.link_type}
                  onValueChange={(v) => setEditData((d) => ({ ...d, link_type: v as any }))}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taille</Label>
                <Input
                  value={editData.file_size}
                  onChange={(e) => setEditData((d) => ({ ...d, file_size: e.target.value }))}
                  placeholder="Ex: 2.5 GB"
                />
              </div>
              <div>
                <Label>Langue</Label>
                <Select value={editData.language} onValueChange={(v) => setEditData((d) => ({ ...d, language: v }))}>
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
            <Button onClick={saveEdit} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
