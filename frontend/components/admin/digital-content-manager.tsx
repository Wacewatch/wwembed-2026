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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, Book, Music, Gamepad2, Package } from "lucide-react"

interface DigitalContent {
  id: string
  ww_id: string
  content_type: "ebook" | "music" | "software" | "game"
  title: string
  author?: string
  artist?: string
  developer?: string
  description?: string
  cover_image?: string
  release_year?: number
  genre?: string
  language?: string
  status: "pending" | "approved" | "rejected"
  submitted_by?: string
  created_at: string
}

interface DigitalDownloadLink {
  id: string
  digital_content_id: string
  ww_id: string
  source_name: string
  download_url: string
  file_format?: string
  file_size?: string
  quality?: string
  is_active: boolean
  is_verified: boolean
  status: "pending" | "approved" | "rejected"
  submitted_by?: string
  created_at: string
}

const CONTENT_TYPES = [
  { value: "ebook", label: "Ebooks", icon: Book },
  { value: "music", label: "Musique", icon: Music },
  { value: "software", label: "Logiciels", icon: Package },
  { value: "game", label: "Jeux", icon: Gamepad2 },
]

export function DigitalContentManager() {
  const [contents, setContents] = useState<DigitalContent[]>([])
  const [links, setLinks] = useState<DigitalDownloadLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [contentType, setContentType] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("contents")

  const [editingContent, setEditingContent] = useState<DigitalContent | null>(null)
  const [editingLink, setEditingLink] = useState<DigitalDownloadLink | null>(null)

  const [editContentData, setEditContentData] = useState({
    title: "",
    author: "",
    description: "",
    cover_image: "",
    genre: "",
    language: "fr",
  })

  const [editLinkData, setEditLinkData] = useState({
    source_name: "",
    download_url: "",
    stream_url: "",
    file_format: "",
    file_size: "",
    quality: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const [{ data: contentsData }, { data: linksData }] = await Promise.all([
      supabase.from("digital_content").select("*").order("created_at", { ascending: false }),
      supabase.from("digital_download_links").select("*").order("created_at", { ascending: false }),
    ])
    setContents(contentsData || [])
    setLinks(linksData || [])
    setLoading(false)
  }

  const updateContentStatus = async (id: string, status: "approved" | "rejected") => {
    const supabase = createClient()
    await supabase.from("digital_content").update({ status }).eq("id", id)
    loadData()
  }

  const deleteContent = async (id: string) => {
    if (!confirm("Supprimer ce contenu et tous ses liens?")) return
    const supabase = createClient()
    await supabase.from("digital_download_links").delete().eq("digital_content_id", id)
    await supabase.from("digital_content").delete().eq("id", id)
    loadData()
  }

  const toggleLinkActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("digital_download_links").update({ is_active: !currentState }).eq("id", id)
    loadData()
  }

  const toggleLinkVerified = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("digital_download_links").update({ is_verified: !currentState }).eq("id", id)
    loadData()
  }

  const updateLinkStatus = async (id: string, status: "approved" | "rejected") => {
    const supabase = createClient()
    await supabase.from("digital_download_links").update({ status }).eq("id", id)
    loadData()
  }

  const deleteLink = async (id: string) => {
    if (!confirm("Supprimer ce lien?")) return
    const supabase = createClient()
    await supabase.from("digital_download_links").delete().eq("id", id)
    loadData()
  }

  const openEditContent = (content: DigitalContent) => {
    setEditingContent(content)
    setEditContentData({
      title: content.title,
      author: content.author || content.artist || content.developer || "",
      description: content.description || "",
      cover_image: content.cover_image || "",
      genre: content.genre || "",
      language: content.language || "fr",
    })
  }

  const saveEditContent = async () => {
    if (!editingContent) return
    const supabase = createClient()

    const updateData: Record<string, string> = {
      title: editContentData.title,
      description: editContentData.description,
      cover_image: editContentData.cover_image,
      genre: editContentData.genre,
      language: editContentData.language,
    }

    if (editingContent.content_type === "ebook") {
      updateData.author = editContentData.author
    } else if (editingContent.content_type === "music") {
      updateData.artist = editContentData.author
    } else {
      updateData.developer = editContentData.author
    }

    await supabase.from("digital_content").update(updateData).eq("id", editingContent.id)
    setEditingContent(null)
    loadData()
  }

  const openEditLink = (link: DigitalDownloadLink) => {
    setEditingLink(link)
    setEditLinkData({
      source_name: link.source_name,
      download_url: link.download_url,
      stream_url: (link as any).stream_url || "",
      file_format: link.file_format || "",
      file_size: link.file_size || "",
      quality: link.quality || "",
    })
  }

  const saveEditLink = async () => {
    if (!editingLink) return
    const supabase = createClient()
    await supabase
      .from("digital_download_links")
      .update({
        source_name: editLinkData.source_name,
        download_url: editLinkData.download_url,
        stream_url: editLinkData.stream_url,
        file_format: editLinkData.file_format,
        file_size: editLinkData.file_size,
        quality: editLinkData.quality,
      })
      .eq("id", editingLink.id)
    setEditingLink(null)
    loadData()
  }

  const getTypeIcon = (type: string) => {
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

  const getCreator = (content: DigitalContent) => {
    return content.author || content.artist || content.developer || "Inconnu"
  }

  const filteredContents = contents.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) || c.ww_id.toLowerCase().includes(search.toLowerCase())
    const matchesType = contentType === "all" || c.content_type === contentType
    return matchesSearch && matchesType
  })

  const filteredLinks = links.filter(
    (l) =>
      l.source_name.toLowerCase().includes(search.toLowerCase()) ||
      l.ww_id.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-foreground">Contenu Digital</h2>
        <div className="flex gap-2">
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {CONTENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contents">Contenus ({contents.length})</TabsTrigger>
          <TabsTrigger value="links">Liens ({links.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contents" className="space-y-3 mt-4">
          {filteredContents.map((content) => (
            <Card key={content.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {content.cover_image && (
                      <img
                        src={content.cover_image || "/placeholder.svg"}
                        alt={content.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground">{content.title}</h3>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTypeIcon(content.content_type)}
                          {content.content_type}
                        </Badge>
                        <Badge
                          className={
                            content.status === "approved"
                              ? "bg-green-500/20 text-green-500"
                              : content.status === "rejected"
                                ? "bg-red-500/20 text-red-500"
                                : "bg-yellow-500/20 text-yellow-500"
                          }
                        >
                          {content.status === "approved"
                            ? "Approuve"
                            : content.status === "rejected"
                              ? "Rejete"
                              : "En attente"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Par: {getCreator(content)} | WW ID: {content.ww_id}
                      </p>
                      {content.genre && <p className="text-xs text-muted-foreground">Genre: {content.genre}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {content.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-500 bg-transparent"
                          onClick={() => updateContentStatus(content.id, "approved")}
                        >
                          Approuver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 bg-transparent"
                          onClick={() => updateContentStatus(content.id, "rejected")}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEditContent(content)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteContent(content.id)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredContents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Aucun contenu digital trouve</div>
          )}
        </TabsContent>

        <TabsContent value="links" className="space-y-3 mt-4">
          {filteredLinks.map((link) => (
            <Card key={link.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{link.source_name}</h3>
                      {link.file_format && <Badge variant="outline">{link.file_format}</Badge>}
                      {link.quality && <Badge variant="secondary">{link.quality}</Badge>}
                      {link.file_size && <span className="text-xs text-muted-foreground">{link.file_size}</span>}
                      {link.is_verified && <Badge className="bg-green-600">Verifie</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">WW ID: {link.ww_id}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-xl">
                      {link.download_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1 items-end">
                      <label className="text-xs text-muted-foreground flex items-center gap-2">
                        Actif
                        <Switch
                          checked={link.is_active}
                          onCheckedChange={() => toggleLinkActive(link.id, link.is_active)}
                        />
                      </label>
                      <label className="text-xs text-muted-foreground flex items-center gap-2">
                        Verifie
                        <Switch
                          checked={link.is_verified}
                          onCheckedChange={() => toggleLinkVerified(link.id, link.is_verified)}
                        />
                      </label>
                    </div>
                    {link.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-500 bg-transparent"
                          onClick={() => updateLinkStatus(link.id, "approved")}
                        >
                          Approuver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 bg-transparent"
                          onClick={() => updateLinkStatus(link.id, "rejected")}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEditLink(link)}>
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
            <div className="text-center py-8 text-muted-foreground">Aucun lien digital trouve</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Content Dialog */}
      <Dialog open={!!editingContent} onOpenChange={(open) => !open && setEditingContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le contenu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={editContentData.title}
                onChange={(e) => setEditContentData({ ...editContentData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {editingContent?.content_type === "ebook"
                  ? "Auteur"
                  : editingContent?.content_type === "music"
                    ? "Artiste"
                    : "Developpeur"}
              </Label>
              <Input
                value={editContentData.author}
                onChange={(e) => setEditContentData({ ...editContentData, author: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editContentData.description}
                onChange={(e) => setEditContentData({ ...editContentData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Image de couverture</Label>
                <Input
                  value={editContentData.cover_image}
                  onChange={(e) => setEditContentData({ ...editContentData, cover_image: e.target.value })}
                  placeholder="URL"
                />
              </div>
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input
                  value={editContentData.genre}
                  onChange={(e) => setEditContentData({ ...editContentData, genre: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingContent(null)}>
                Annuler
              </Button>
              <Button onClick={saveEditContent}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le lien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la source</Label>
              <Input
                value={editLinkData.source_name}
                onChange={(e) => setEditLinkData({ ...editLinkData, source_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL de telechargement</Label>
              <Input
                value={editLinkData.download_url}
                onChange={(e) => setEditLinkData({ ...editLinkData, download_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL de lecture (streaming)</Label>
              <Input
                value={editLinkData.stream_url}
                onChange={(e) => setEditLinkData({ ...editLinkData, stream_url: e.target.value })}
                placeholder="Pour ebooks et musique"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Input
                  value={editLinkData.file_format}
                  onChange={(e) => setEditLinkData({ ...editLinkData, file_format: e.target.value })}
                  placeholder="PDF, MP3..."
                />
              </div>
              <div className="space-y-2">
                <Label>Taille</Label>
                <Input
                  value={editLinkData.file_size}
                  onChange={(e) => setEditLinkData({ ...editLinkData, file_size: e.target.value })}
                  placeholder="100 MB"
                />
              </div>
              <div className="space-y-2">
                <Label>Qualite</Label>
                <Input
                  value={editLinkData.quality}
                  onChange={(e) => setEditLinkData({ ...editLinkData, quality: e.target.value })}
                  placeholder="320kbps"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingLink(null)}>
                Annuler
              </Button>
              <Button onClick={saveEditLink}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
