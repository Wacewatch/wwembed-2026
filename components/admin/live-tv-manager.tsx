"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Plus, Copy, Tv, Eye, ChevronDown, ChevronUp, Pencil, Search, Power } from "lucide-react"
import type { LiveTVChannel, LiveTVSource } from "@/lib/types"

const CATEGORIES = [
  { value: "general", label: "Generaliste" },
  { value: "sport", label: "Sport" },
  { value: "news", label: "Actualites" },
  { value: "entertainment", label: "Divertissement" },
  { value: "kids", label: "Enfants" },
  { value: "music", label: "Musique" },
  { value: "documentary", label: "Documentaire" },
  { value: "cinema", label: "Cinema" },
  { value: "other", label: "Autre" },
]

const COUNTRIES = [
  { value: "fr", label: "France" },
  { value: "us", label: "USA" },
  { value: "uk", label: "UK" },
  { value: "es", label: "Espagne" },
  { value: "de", label: "Allemagne" },
  { value: "it", label: "Italie" },
  { value: "pt", label: "Portugal" },
  { value: "be", label: "Belgique" },
  { value: "ch", label: "Suisse" },
  { value: "ca", label: "Canada" },
  { value: "other", label: "Autre" },
]

interface ChannelWithSources extends LiveTVChannel {
  sources?: LiveTVSource[]
}

export function LiveTVManager() {
  const [channels, setChannels] = useState<ChannelWithSources[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null)
  const [showSourceForm, setShowSourceForm] = useState<string | null>(null)
  const [editingChannel, setEditingChannel] = useState<LiveTVChannel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterCountry, setFilterCountry] = useState("all")
  const [editChannelData, setEditChannelData] = useState({
    channel_name: "",
    channel_logo: "",
    category: "general",
    country: "fr",
    language: "fr",
    quality: "HD",
  })
  const [editingSource, setEditingSource] = useState<LiveTVSource | null>(null)
  const [editSourceData, setEditSourceData] = useState({
    source_name: "",
    stream_url: "",
    quality: "HD",
  })
  const [formData, setFormData] = useState({
    channel_name: "",
    channel_logo: "",
    stream_url: "",
    category: "general",
    country: "fr",
    language: "fr",
    quality: "HD",
  })
  const [sourceFormData, setSourceFormData] = useState({
    source_name: "",
    stream_url: "",
    quality: "HD",
  })

  const fetchChannels = async () => {
    const supabase = createClient()

    const { data: channelsData } = await supabase
      .from("live_tv_channels")
      .select("*")
      .order("created_at", { ascending: false })

    if (channelsData) {
      const channelsWithSources = await Promise.all(
        channelsData.map(async (channel) => {
          const { data: sources } = await supabase
            .from("live_tv_sources")
            .select("*")
            .eq("channel_id", channel.id)
            .order("created_at", { ascending: true })

          return { ...channel, sources: sources || [] }
        }),
      )
      setChannels(channelsWithSources)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: channel, error } = await supabase
      .from("live_tv_channels")
      .insert({
        channel_name: formData.channel_name,
        channel_logo: formData.channel_logo,
        stream_url: formData.stream_url,
        category: formData.category,
        country: formData.country,
        language: formData.language,
        quality: formData.quality,
        submitted_by: user.id,
        status: "approved",
      })
      .select()
      .single()

    if (!error && channel) {
      if (formData.stream_url) {
        await supabase.from("live_tv_sources").insert({
          channel_id: channel.id,
          source_name: "Source #1",
          stream_url: formData.stream_url,
          quality: formData.quality,
          submitted_by: user.id,
          status: "approved",
        })
      }

      setFormData({
        channel_name: "",
        channel_logo: "",
        stream_url: "",
        category: "general",
        country: "fr",
        language: "fr",
        quality: "HD",
      })
      setShowForm(false)
      fetchChannels()
    }
  }

  const handleAddSource = async (channelId: string) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const channel = channels.find((c) => c.id === channelId)
    const sourceCount = channel?.sources?.length || 0

    const { error } = await supabase.from("live_tv_sources").insert({
      channel_id: channelId,
      source_name: sourceFormData.source_name || `Source #${sourceCount + 1}`,
      stream_url: sourceFormData.stream_url,
      quality: sourceFormData.quality,
      submitted_by: user.id,
      status: "approved",
    })

    if (!error) {
      setSourceFormData({ source_name: "", stream_url: "", quality: "HD" })
      setShowSourceForm(null)
      fetchChannels()
    }
  }

  const deleteSource = async (sourceId: string) => {
    if (!confirm("Supprimer cette source ?")) return
    const supabase = createClient()
    await supabase.from("live_tv_sources").delete().eq("id", sourceId)
    fetchChannels()
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("live_tv_channels").update({ is_active: !currentState }).eq("id", id)
    fetchChannels()
  }

  const deleteChannel = async (id: string) => {
    if (!confirm("Supprimer cette chaine et toutes ses sources ?")) return
    const supabase = createClient()
    await supabase.from("live_tv_channels").delete().eq("id", id)
    fetchChannels()
  }

  const openEditChannel = (channel: LiveTVChannel) => {
    setEditingChannel(channel)
    setEditChannelData({
      channel_name: channel.channel_name,
      channel_logo: channel.channel_logo || "",
      category: channel.category || "general",
      country: channel.country || "fr",
      language: channel.language || "fr",
      quality: channel.quality || "HD",
    })
  }

  const saveEditChannel = async () => {
    if (!editingChannel) return
    const supabase = createClient()
    await supabase.from("live_tv_channels").update(editChannelData).eq("id", editingChannel.id)
    setEditingChannel(null)
    fetchChannels()
  }

  const openEditSource = (source: LiveTVSource) => {
    setEditingSource(source)
    setEditSourceData({
      source_name: source.source_name || "",
      stream_url: source.stream_url,
      quality: source.quality || "HD",
    })
  }

  const saveEditSource = async () => {
    if (!editingSource) return
    const supabase = createClient()
    await supabase.from("live_tv_sources").update(editSourceData).eq("id", editingSource.id)
    setEditingSource(null)
    fetchChannels()
  }

  const getWWId = (id: string) => `ww-live-${id.substring(0, 8)}`

  const copyEmbedUrl = (id: string) => {
    const url = `${window.location.origin}/api/v1/live/${getWWId(id)}`
    navigator.clipboard.writeText(url)
  }

  const toggleSourceActive = async (sourceId: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("live_tv_sources").update({ is_active: !currentState }).eq("id", sourceId)
    fetchChannels()
  }

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const matchesSearch = searchQuery === "" || channel.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === "all" || channel.category === filterCategory
      const matchesCountry = filterCountry === "all" || channel.country === filterCountry
      return matchesSearch && matchesCategory && matchesCountry
    })
  }, [channels, searchQuery, filterCategory, filterCountry])

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>
  }

  return (
    <>
      <Dialog open={!!editingChannel} onOpenChange={(open) => !open && setEditingChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la chaine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la chaine</Label>
              <Input
                value={editChannelData.channel_name}
                onChange={(e) => setEditChannelData({ ...editChannelData, channel_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL du logo</Label>
              <Input
                value={editChannelData.channel_logo}
                onChange={(e) => setEditChannelData({ ...editChannelData, channel_logo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select
                  value={editChannelData.category}
                  onValueChange={(v) => setEditChannelData({ ...editChannelData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select
                  value={editChannelData.country}
                  onValueChange={(v) => setEditChannelData({ ...editChannelData, country: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qualite</Label>
                <Select
                  value={editChannelData.quality}
                  onValueChange={(v) => setEditChannelData({ ...editChannelData, quality: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="HD">HD</SelectItem>
                    <SelectItem value="FHD">FHD</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select
                  value={editChannelData.language}
                  onValueChange={(v) => setEditChannelData({ ...editChannelData, language: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Francais</SelectItem>
                    <SelectItem value="en">Anglais</SelectItem>
                    <SelectItem value="es">Espagnol</SelectItem>
                    <SelectItem value="multi">Multi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingChannel(null)}>
                Annuler
              </Button>
              <Button onClick={saveEditChannel}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSource} onOpenChange={(open) => !open && setEditingSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la source</Label>
              <Input
                value={editSourceData.source_name}
                onChange={(e) => setEditSourceData({ ...editSourceData, source_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL du flux (m3u8 ou iframe)</Label>
              <Input
                value={editSourceData.stream_url}
                onChange={(e) => setEditSourceData({ ...editSourceData, stream_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Qualite</Label>
              <Select
                value={editSourceData.quality}
                onValueChange={(v) => setEditSourceData({ ...editSourceData, quality: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="HD">HD</SelectItem>
                  <SelectItem value="FHD">FHD</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingSource(null)}>
                Annuler
              </Button>
              <Button onClick={saveEditSource}>Sauvegarder</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            Chaines TV Live
          </CardTitle>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une chaine
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une chaine..."
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous pays</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-secondary/50 rounded-lg space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de la chaine *</Label>
                  <Input
                    value={formData.channel_name}
                    onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                    placeholder="TF1, France 2, BeIN Sports..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL du logo</Label>
                  <Input
                    value={formData.channel_logo}
                    onChange={(e) => setFormData({ ...formData, channel_logo: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>URL du flux (m3u8 ou iframe) *</Label>
                  <Input
                    value={formData.stream_url}
                    onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                    placeholder="https://... m3u8 ou iframe URL"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Qualite</Label>
                  <Select value={formData.quality} onValueChange={(v) => setFormData({ ...formData, quality: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SD">SD</SelectItem>
                      <SelectItem value="HD">HD</SelectItem>
                      <SelectItem value="FHD">Full HD</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Francais</SelectItem>
                      <SelectItem value="en">Anglais</SelectItem>
                      <SelectItem value="es">Espagnol</SelectItem>
                      <SelectItem value="de">Allemand</SelectItem>
                      <SelectItem value="multi">Multi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Ajouter</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

          {(searchQuery || filterCategory !== "all" || filterCountry !== "all") && (
            <p className="text-sm text-muted-foreground">
              {filteredChannels.length} chaine(s) trouvee(s) sur {channels.length}
            </p>
          )}

          {filteredChannels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {channels.length === 0 ? "Aucune chaine TV live" : "Aucun resultat pour cette recherche"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredChannels.map((channel) => (
                <div key={channel.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 bg-secondary/30 cursor-pointer hover:bg-secondary/50"
                    onClick={() => setExpandedChannel(expandedChannel === channel.id ? null : channel.id)}
                  >
                    <div className="flex items-center gap-3">
                      {channel.channel_logo ? (
                        <img
                          src={channel.channel_logo || "/placeholder.svg"}
                          alt={channel.channel_name}
                          className="w-10 h-10 object-contain rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center">
                          <Tv className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium">{channel.channel_name}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{CATEGORIES.find((c) => c.value === channel.category)?.label}</span>
                          <span>-</span>
                          <span className="uppercase">{channel.country}</span>
                          <span>-</span>
                          <span>{channel.sources?.length || 0} source(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        {channel.view_count}
                      </div>
                      <Badge variant={channel.is_active ? "default" : "secondary"}>
                        {channel.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyEmbedUrl(channel.id)
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditChannel(channel)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleActive(channel.id, channel.is_active)
                        }}
                      >
                        {channel.is_active ? "Desactiver" : "Activer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChannel(channel.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {expandedChannel === channel.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {expandedChannel === channel.id && (
                    <div className="p-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Sources de streaming</h4>
                        <Button
                          size="sm"
                          onClick={() => setShowSourceForm(showSourceForm === channel.id ? null : channel.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Ajouter une source
                        </Button>
                      </div>

                      {showSourceForm === channel.id && (
                        <div className="mb-4 p-4 bg-secondary/30 rounded-lg space-y-4">
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Nom de la source</Label>
                              <Input
                                value={sourceFormData.source_name}
                                onChange={(e) => setSourceFormData({ ...sourceFormData, source_name: e.target.value })}
                                placeholder="Source #2"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>URL du flux (m3u8 ou iframe) *</Label>
                              <Input
                                value={sourceFormData.stream_url}
                                onChange={(e) => setSourceFormData({ ...sourceFormData, stream_url: e.target.value })}
                                placeholder="https://... m3u8 ou iframe"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Qualite</Label>
                              <Select
                                value={sourceFormData.quality}
                                onValueChange={(v) => setSourceFormData({ ...sourceFormData, quality: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SD">SD</SelectItem>
                                  <SelectItem value="HD">HD</SelectItem>
                                  <SelectItem value="FHD">Full HD</SelectItem>
                                  <SelectItem value="4K">4K</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAddSource(channel.id)}>
                              Ajouter
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowSourceForm(null)}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}

                      {channel.sources && channel.sources.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>URL</TableHead>
                              <TableHead>Qualite</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Actif</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {channel.sources.map((source, index) => (
                              <TableRow key={source.id}>
                                <TableCell className="font-medium">
                                  {source.source_name || `Source #${index + 1}`}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                  {source.stream_url}
                                </TableCell>
                                <TableCell>{source.quality}</TableCell>
                                <TableCell>
                                  <Badge variant={source.status === "approved" ? "default" : "secondary"}>
                                    {source.status === "approved"
                                      ? "Approuve"
                                      : source.status === "pending"
                                        ? "En attente"
                                        : "Rejete"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant={source.is_active ? "default" : "outline"}
                                    className={source.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                                    onClick={() => toggleSourceActive(source.id, source.is_active)}
                                  >
                                    <Power className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEditSource(source)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => deleteSource(source.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune source</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
