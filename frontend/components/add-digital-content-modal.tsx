"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Loader2, Book, Music, Monitor, Gamepad2 } from "lucide-react"
import type { DigitalContentType, DigitalContent } from "@/lib/types"

const CONTENT_TYPES: { value: DigitalContentType; label: string; icon: React.ReactNode }[] = [
  { value: "ebook", label: "Ebook", icon: <Book className="w-4 h-4" /> },
  { value: "music", label: "Musique", icon: <Music className="w-4 h-4" /> },
  { value: "software", label: "Logiciel", icon: <Monitor className="w-4 h-4" /> },
  { value: "game", label: "Jeu", icon: <Gamepad2 className="w-4 h-4" /> },
]

const FILE_FORMATS: Record<DigitalContentType, string[]> = {
  ebook: ["PDF", "EPUB", "MOBI", "AZW3", "FB2", "TXT"],
  music: ["MP3", "FLAC", "WAV", "AAC", "OGG", "M4A"],
  software: ["EXE", "MSI", "DMG", "AppImage", "DEB", "ZIP", "RAR", "ISO"],
  game: ["EXE", "ISO", "NSP", "XCI", "PKG", "ZIP", "RAR"],
}

interface AddDigitalContentModalProps {
  buttonVariant?: "default" | "outline" | "secondary" | "ghost"
  buttonText?: string
  buttonClassName?: string
  onSuccess?: () => void
}

export function AddDigitalContentModal({
  buttonVariant = "default",
  buttonText = "Ajouter contenu digital",
  buttonClassName,
  onSuccess,
}: AddDigitalContentModalProps) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "uploader" | "member">("member")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [activeTab, setActiveTab] = useState<"content" | "link">("content")
  const [contentType, setContentType] = useState<DigitalContentType>("ebook")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // For creating new content
  const [contentData, setContentData] = useState({
    title: "",
    description: "",
    cover_url: "",
    author: "",
    version: "",
    file_size: "",
  })

  // For adding links to existing content
  const [existingContent, setExistingContent] = useState<DigitalContent[]>([])
  const [selectedContentId, setSelectedContentId] = useState<string>("")
  const [selectedWwId, setSelectedWwId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  const [linkData, setLinkData] = useState({
    source_name: "",
    source_url: "",
    reader_url: "",
    link_type: "direct" as "direct" | "torrent" | "magnet" | "stream",
    file_format: "",
    file_size: "",
    language: "multi",
  })

  // Check auth
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

  // Fetch existing content when adding links
  useEffect(() => {
    const fetchContent = async () => {
      if (open && activeTab === "link") {
        const supabase = createClient()
        const { data } = await supabase
          .from("digital_content")
          .select("*")
          .eq("content_type", contentType)
          .eq("status", "approved")
          .order("title")
        setExistingContent(data || [])
      }
    }
    fetchContent()
  }, [open, activeTab, contentType])

  const generateWwId = () => {
    const uuid = crypto.randomUUID().split("-")[0]
    return `ww-${contentType}-${uuid}`
  }

  const getLinkStatus = () => {
    return userRole === "admin" || userRole === "uploader" ? "approved" : "pending"
  }

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const wwId = generateWwId()
    const status = getLinkStatus()

    const { data, error: insertError } = await supabase
      .from("digital_content")
      .insert({
        ww_id: wwId,
        content_type: contentType,
        title: contentData.title,
        description: contentData.description || null,
        cover_url: contentData.cover_url || null,
        author: contentData.author || null,
        version: contentData.version || null,
        file_size: contentData.file_size || null,
        submitted_by: userId,
        status: status,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      const message = status === "pending" ? "Contenu soumis - En attente de validation" : "Contenu ajoute avec succes!"
      setSuccess(message + ` (WW ID: ${wwId})`)
      setContentData({
        title: "",
        description: "",
        cover_url: "",
        author: "",
        version: "",
        file_size: "",
      })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 2000)
    }
    setLoading(false)
  }

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !selectedContentId || !selectedWwId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const status = getLinkStatus()

    const { error: insertError } = await supabase.from("digital_download_links").insert({
      content_id: selectedContentId,
      ww_id: selectedWwId,
      source_name: linkData.source_name,
      source_url: linkData.source_url,
      reader_url: linkData.reader_url || null,
      link_type: linkData.link_type,
      file_format: linkData.file_format || null,
      file_size: linkData.file_size || null,
      language: linkData.language,
      submitted_by: userId,
      status: status,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      const message = status === "pending" ? "Lien soumis - En attente de validation" : "Lien ajoute avec succes!"
      setSuccess(message)
      setLinkData({
        source_name: "",
        source_url: "",
        reader_url: "",
        link_type: "direct",
        file_format: "",
        file_size: "",
        language: "multi",
      })
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        onSuccess?.()
      }, 1500)
    }
    setLoading(false)
  }

  const filteredContent = existingContent.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const selectedContent = existingContent.find((c) => c.id === selectedContentId)

  const showReaderUrl = contentType === "ebook" || contentType === "music"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={buttonClassName}>
          <Plus className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter du contenu digital</DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Vous devez etre connecte pour ajouter du contenu</p>
            <Button asChild>
              <a href="/auth/login">Se connecter</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {userRole === "member" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-500">
                En tant que membre, vos soumissions seront validees par un administrateur.
              </div>
            )}

            {/* Content Type Selector */}
            <div className="space-y-2">
              <Label>Type de contenu</Label>
              <div className="flex gap-2 flex-wrap">
                {CONTENT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={contentType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setContentType(type.value)
                      setSelectedContentId("")
                      setSelectedWwId("")
                    }}
                    className="gap-2"
                  >
                    {type.icon}
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "content" | "link")}>
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">
                  Nouveau contenu
                </TabsTrigger>
                <TabsTrigger value="link" className="flex-1">
                  Ajouter un lien
                </TabsTrigger>
              </TabsList>

              {/* New Content Tab */}
              <TabsContent value="content" className="space-y-4 mt-4">
                <form onSubmit={handleContentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titre *</Label>
                    <Input
                      value={contentData.title}
                      onChange={(e) => setContentData({ ...contentData, title: e.target.value })}
                      placeholder={
                        contentType === "ebook"
                          ? "Nom du livre"
                          : contentType === "music"
                            ? "Titre de l'album/morceau"
                            : contentType === "software"
                              ? "Nom du logiciel"
                              : "Nom du jeu"
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {contentType === "ebook" || contentType === "music" ? "Auteur/Artiste" : "Developpeur/Editeur"}
                    </Label>
                    <Input
                      value={contentData.author}
                      onChange={(e) => setContentData({ ...contentData, author: e.target.value })}
                      placeholder={
                        contentType === "ebook"
                          ? "Nom de l'auteur"
                          : contentType === "music"
                            ? "Nom de l'artiste"
                            : "Nom du developpeur"
                      }
                    />
                  </div>

                  {(contentType === "software" || contentType === "game") && (
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input
                        value={contentData.version}
                        onChange={(e) => setContentData({ ...contentData, version: e.target.value })}
                        placeholder="ex: 1.0.0, 2024"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={contentData.description}
                      onChange={(e) => setContentData({ ...contentData, description: e.target.value })}
                      placeholder="Description du contenu..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>URL de la couverture</Label>
                      <Input
                        value={contentData.cover_url}
                        onChange={(e) => setContentData({ ...contentData, cover_url: e.target.value })}
                        placeholder="https://..."
                        type="url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Taille totale</Label>
                      <Input
                        value={contentData.file_size}
                        onChange={(e) => setContentData({ ...contentData, file_size: e.target.value })}
                        placeholder="ex: 1.5 GB, 350 MB"
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {success && <p className="text-sm text-green-500">{success}</p>}

                  <Button type="submit" disabled={loading || !contentData.title} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Creer le contenu
                  </Button>
                </form>
              </TabsContent>

              {/* Add Link Tab */}
              <TabsContent value="link" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selectionner le contenu</Label>
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {filteredContent.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3">Aucun contenu trouve</p>
                    ) : (
                      filteredContent.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedContentId(c.id)
                            setSelectedWwId(c.ww_id)
                          }}
                          className={`w-full text-left p-3 hover:bg-secondary/50 transition-colors border-b last:border-b-0 ${
                            selectedContentId === c.id ? "bg-secondary" : ""
                          }`}
                        >
                          <p className="font-medium text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.ww_id}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {selectedContent && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="font-medium">{selectedContent.title}</p>
                    <p className="text-sm text-muted-foreground">WW ID: {selectedContent.ww_id}</p>
                  </div>
                )}

                <form onSubmit={handleLinkSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom de la source *</Label>
                    <Input
                      value={linkData.source_name}
                      onChange={(e) => setLinkData({ ...linkData, source_name: e.target.value })}
                      placeholder="ex: Source principale, Mega, MediaFire..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>URL de telechargement *</Label>
                    <Input
                      value={linkData.source_url}
                      onChange={(e) => setLinkData({ ...linkData, source_url: e.target.value })}
                      placeholder="https://..."
                      type="url"
                      required
                    />
                  </div>

                  {showReaderUrl && (
                    <div className="space-y-2">
                      <Label>
                        {contentType === "ebook"
                          ? "URL du lecteur PDF (optionnel)"
                          : "URL de streaming audio (optionnel)"}
                      </Label>
                      <Input
                        value={linkData.reader_url}
                        onChange={(e) => setLinkData({ ...linkData, reader_url: e.target.value })}
                        placeholder={
                          contentType === "ebook" ? "URL pour lire le PDF en ligne" : "URL pour ecouter en streaming"
                        }
                        type="url"
                      />
                      <p className="text-xs text-muted-foreground">
                        {contentType === "ebook"
                          ? "Si fourni, les utilisateurs pourront lire le document directement"
                          : "Si fourni, les utilisateurs pourront ecouter directement"}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de lien</Label>
                      <Select
                        value={linkData.link_type}
                        onValueChange={(v) => setLinkData({ ...linkData, link_type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="torrent">Torrent</SelectItem>
                          <SelectItem value="magnet">Magnet</SelectItem>
                          <SelectItem value="stream">Stream</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Format de fichier</Label>
                      <Select
                        value={linkData.file_format}
                        onValueChange={(v) => setLinkData({ ...linkData, file_format: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          {FILE_FORMATS[contentType].map((format) => (
                            <SelectItem key={format} value={format}>
                              {format}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Taille du fichier</Label>
                      <Input
                        value={linkData.file_size}
                        onChange={(e) => setLinkData({ ...linkData, file_size: e.target.value })}
                        placeholder="ex: 500 MB"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Langue</Label>
                      <Select
                        value={linkData.language}
                        onValueChange={(v) => setLinkData({ ...linkData, language: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multi">Multi</SelectItem>
                          <SelectItem value="fr">Francais</SelectItem>
                          <SelectItem value="en">Anglais</SelectItem>
                          <SelectItem value="es">Espagnol</SelectItem>
                          <SelectItem value="de">Allemand</SelectItem>
                          <SelectItem value="vostfr">VOSTFR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {success && <p className="text-sm text-green-500">{success}</p>}

                  <Button
                    type="submit"
                    disabled={loading || !selectedContentId || !linkData.source_name || !linkData.source_url}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Ajouter le lien
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
