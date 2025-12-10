"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  User,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
} from "lucide-react"
import type { DownloadLink } from "@/lib/types"

interface DownloadLinkWithProfile extends DownloadLink {
  profiles?: { username: string } | null
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

  useEffect(() => {
    loadLinks()
    loadUsers()
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

  const checkLinkValidity = async (linkId: string, url: string) => {
    setCheckingLinkId(linkId)
    try {
      const response = await fetch("/api/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, linkType: "download", url }),
      })
      const result = await response.json()

      // Update local state
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

  const checkAllLinks = async () => {
    for (const link of links) {
      if (link.source_url) {
        await checkLinkValidity(link.id, link.source_url)
      }
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Liens Download</h2>
          <Badge variant="secondary">{totalCount} liens</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={checkAllLinks} disabled={checkingLinkId !== null}>
          <RefreshCw className={`w-4 h-4 mr-2 ${checkingLinkId ? "animate-spin" : ""}`} />
          Vérifier tous les liens
        </Button>
      </div>

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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">{totalCount} liens au total</div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filteredLinks.map((link) => (
          <Card key={link.id} className="border-zinc-800">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{link.source_name}</span>
                    {link.quality && <Badge variant="outline">{link.quality}</Badge>}
                    {link.language && <Badge variant="secondary">{link.language}</Badge>}
                    {getValidityBadge(link)}
                    {link.profiles && (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                        <User className="w-3 h-3 mr-1" />
                        {link.profiles.username}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    WW: {link.ww_id} | TMDB: {link.tmdb_id} | Type: {link.media_type}
                  </div>
                  {link.last_checked && (
                    <div className="text-xs text-muted-foreground">
                      Vérifié: {new Date(link.last_checked).toLocaleString("fr-FR")}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(link.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => link.source_url && checkLinkValidity(link.id, link.source_url)}
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
                    X
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Modal d'édition */}
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
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de lien</Label>
                <Select
                  value={editData.link_type}
                  onValueChange={(v) => setEditData({ ...editData, link_type: v as "direct" | "torrent" | "magnet" })}
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
              <div>
                <Label>Taille</Label>
                <Input
                  value={editData.file_size}
                  onChange={(e) => setEditData({ ...editData, file_size: e.target.value })}
                  placeholder="ex: 1.5 GB"
                />
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
