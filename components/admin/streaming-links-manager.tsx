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
import { Pencil, Film, Tv, User } from "lucide-react"
import Image from "next/image"
import type { StreamingLink } from "@/lib/types"

interface LinkWithMedia extends StreamingLink {
  mediaInfo?: {
    title: string
    poster: string
  }
  username?: string
}

export function StreamingLinksManager() {
  const [links, setLinks] = useState<LinkWithMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingLink, setEditingLink] = useState<StreamingLink | null>(null)
  const [editData, setEditData] = useState({
    source_name: "",
    source_url: "",
    quality: "HD",
    language: "vf",
  })

  useEffect(() => {
    loadLinks()
  }, [])

  const loadLinks = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("streaming_links")
      .select("*, profiles:user_id(username)")
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      const linksWithMedia = await Promise.all(
        data.map(async (link) => {
          let mediaInfo = { title: "Inconnu", poster: "" }
          if (link.tmdb_id) {
            try {
              const res = await fetch(`/api/tmdb-info?id=${link.tmdb_id}&type=${link.media_type}`)
              if (res.ok) {
                mediaInfo = await res.json()
              }
            } catch {}
          }
          return {
            ...link,
            mediaInfo,
            username: (link.profiles as any)?.username || null,
          }
        }),
      )
      setLinks(linksWithMedia)
    }
    setLoading(false)
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
  }

  const openEdit = (link: StreamingLink) => {
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

  const filteredLinks = links.filter(
    (l) =>
      l.source_name.toLowerCase().includes(search.toLowerCase()) ||
      l.ww_id.toLowerCase().includes(search.toLowerCase()) ||
      l.mediaInfo?.title.toLowerCase().includes(search.toLowerCase()) ||
      String(l.tmdb_id).includes(search),
  )

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Liens Streaming</h2>
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le lien streaming</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la source</Label>
              <Input
                value={editData.source_name}
                onChange={(e) => setEditData({ ...editData, source_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={editData.source_url}
                onChange={(e) => setEditData({ ...editData, source_url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qualite</Label>
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
              <div className="space-y-2">
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingLink(null)}>
                Annuler
              </Button>
              <Button onClick={saveEdit}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {filteredLinks.map((link) => (
          <Card key={link.id} className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-secondary">
                    {link.mediaInfo?.poster ? (
                      <Image
                        src={link.mediaInfo.poster || "/placeholder.svg"}
                        alt={link.mediaInfo.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {link.media_type === "movie" ? (
                          <Film className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <Tv className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{link.mediaInfo?.title || "Inconnu"}</h3>
                      <Badge variant={link.media_type === "movie" ? "default" : "secondary"}>
                        {link.media_type === "movie" ? "Film" : "Série"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge variant="outline">{link.source_name}</Badge>
                      <Badge variant="secondary">{link.quality}</Badge>
                      <Badge variant="outline">{link.language?.toUpperCase()}</Badge>
                      {link.is_verified && <Badge className="bg-green-600">Vérifié</Badge>}
                      {link.is_auto_generated && <Badge variant="outline">Auto</Badge>}
                    </div>
                    {link.username && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>
                          Ajouté par <span className="font-medium text-foreground">{link.username}</span>
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(link.created_at).toLocaleDateString("fr-FR")} à{" "}
                      {new Date(link.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1 items-end">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      Actif
                      <Switch checked={link.is_active} onCheckedChange={() => toggleActive(link.id, link.is_active)} />
                    </label>
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      Vérifié
                      <Switch
                        checked={link.is_verified}
                        onCheckedChange={() => toggleVerified(link.id, link.is_verified)}
                      />
                    </label>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(link)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteLink(link.id)}>
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredLinks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Aucun lien streaming trouvé</div>
        )}
      </div>
    </div>
  )
}
