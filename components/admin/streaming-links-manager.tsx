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
  Pencil,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  AlertTriangle,
  Trash2,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react"
import type { StreamingLink } from "@/lib/types"

interface StreamingLinkWithProfile extends StreamingLink {
  profiles?: { username: string } | null
}

interface InvalidLinkWithMedia extends StreamingLinkWithProfile {
  mediaTitle?: string
  mediaPoster?: string
}

export function StreamingLinksManager() {
  const [links, setLinks] = useState<StreamingLinkWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [users, setUsers] = useState<{ id: string; username: string }[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 100
  const [editingLink, setEditingLink] = useState<StreamingLinkWithProfile | null>(null)
  const [editData, setEditData] = useState({
    source_name: "",
    source_url: "",
    quality: "HD",
    language: "vf",
  })
  const [checkingLinkId, setCheckingLinkId] = useState<string | null>(null)

  const [isCheckingAll, setIsCheckingAll] = useState(false)
  const [checkProgress, setCheckProgress] = useState(0)
  const [checkTotal, setCheckTotal] = useState(0)
  const [invalidLinks, setInvalidLinks] = useState<InvalidLinkWithMedia[]>([])
  const [loadingInvalid, setLoadingInvalid] = useState(false)
  const [showInvalidSection, setShowInvalidSection] = useState(true)

  useEffect(() => {
    loadLinks()
    loadUsers()
    loadInvalidLinks()
  }, [page, userFilter, statusFilter])

  const loadUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("profiles").select("id, username").order("username")
    setUsers(data || [])
  }

  const loadLinks = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase.from("streaming_links").select("*, profiles:submitted_by(username)", { count: "exact" })

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

  const fetchAllLinks = async () => {
    const supabase = createClient()
    const allLinks: any[] = []
    let page = 0
    const pageSize = 100
    let hasMore = true

    while (hasMore) {
      const { data } = await supabase
        .from("streaming_links")
        .select("id, source_url")
        .not("source_url", "is", null)
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

  const loadInvalidLinks = async () => {
    setLoadingInvalid(true)
    const supabase = createClient()

    const allLinks: any[] = []
    let page = 0
    const pageSize = 100
    let hasMore = true

    while (hasMore) {
      const { data } = await supabase
        .from("streaming_links")
        .select("*, profiles:submitted_by(username)")
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

    // Fetch TMDB info for links
    const invalidWithMedia: InvalidLinkWithMedia[] = []

    for (const link of allLinks) {
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
      })
    }

    setInvalidLinks(invalidWithMedia)
    setLoadingInvalid(false)
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("streaming_links").update({ is_active: !currentState }).eq("id", id)
    loadLinks()
  }

  const toggleVerified = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("streaming_links").update({ is_verified: !currentState }).eq("id", id)
    loadLinks()
  }

  const deleteLink = async (id: string) => {
    if (!confirm("Supprimer ce lien?")) return
    const supabase = createClient()
    await supabase.from("streaming_links").delete().eq("id", id)
    loadLinks()
    loadInvalidLinks()
  }

  const openEdit = (link: StreamingLinkWithProfile) => {
    setEditingLink(link)
    setEditData({
      source_name: link.source_name,
      source_url: link.source_url,
      quality: link.quality || "HD",
      language: link.language || "vf",
    })
  }

  const saveEdit = async () => {
    if (!editingLink) return
    const supabase = createClient()
    await supabase
      .from("streaming_links")
      .update({
        source_name: editData.source_name,
        source_url: editData.source_url,
        quality: editData.quality,
        language: editData.language,
      })
      .eq("id", editingLink.id)
    setEditingLink(null)
    loadLinks()
  }

  const checkLinkValidity = async (linkId: string, url: string) => {
    setCheckingLinkId(linkId)
    try {
      const response = await fetch("/api/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, linkType: "streaming", url }),
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

  const checkAllLinksInDatabase = async () => {
    setIsCheckingAll(true)
    setCheckProgress(0)

    const allLinks = await fetchAllLinks()
    setCheckTotal(allLinks.length)

    for (let i = 0; i < allLinks.length; i++) {
      const link = allLinks[i]
      try {
        await fetch("/api/check-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId: link.id,
            linkType: "streaming",
            url: link.source_url,
          }),
        })
      } catch (e) {
        console.error("Error checking link:", e)
      }
      setCheckProgress(i + 1)
    }

    setIsCheckingAll(false)
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
          linkType: "streaming",
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
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="cursor-pointer" onClick={() => setShowInvalidSection(!showInvalidSection)}>
          <CardTitle className="flex items-center justify-between text-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Liens Streaming Invalides ({invalidLinks.length})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  checkAllLinksInDatabase()
                }}
                disabled={isCheckingAll}
                className="text-amber-400 border-amber-400/30"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingAll ? "animate-spin" : ""}`} />
                Vérifier TOUS les liens
              </Button>
              {showInvalidSection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardTitle>
        </CardHeader>

        {showInvalidSection && (
          <CardContent>
            {isCheckingAll && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Vérification en cours...</span>
                  <span>
                    {checkProgress} / {checkTotal}
                  </span>
                </div>
                <Progress value={(checkProgress / checkTotal) * 100} className="h-2" />
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
                        <Badge variant="outline" className="text-purple-400">
                          {link.media_type === "movie" ? "Film" : "Série"}
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
                      <Button size="sm" variant="destructive" onClick={() => deleteLink(link.id)}>
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
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkLinkValidity(link.id, link.source_url)}
                  disabled={checkingLinkId === link.id}
                >
                  <RefreshCw className={`h-4 w-4 ${checkingLinkId === link.id ? "animate-spin" : ""}`} />
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Actif</Label>
                  <Switch checked={link.is_active} onCheckedChange={() => toggleActive(link.id, link.is_active)} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Vérifié</Label>
                  <Switch
                    checked={link.is_verified}
                    onCheckedChange={() => toggleVerified(link.id, link.is_verified)}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(link)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteLink(link.id)}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page + 1} sur {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal d'édition */}
      <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le lien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source</Label>
              <Input
                value={editData.source_name}
                onChange={(e) => setEditData({ ...editData, source_name: e.target.value })}
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={editData.source_url}
                onChange={(e) => setEditData({ ...editData, source_url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qualité</Label>
                <Select value={editData.quality} onValueChange={(v) => setEditData({ ...editData, quality: v })}>
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
                <Label>Langue</Label>
                <Select value={editData.language} onValueChange={(v) => setEditData({ ...editData, language: v })}>
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
