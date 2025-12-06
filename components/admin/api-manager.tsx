"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Pencil, X, Globe, EyeOff } from "lucide-react"
import type { ThirdPartyAPI } from "@/lib/types"

export function ApiManager() {
  const [apis, setApis] = useState<ThirdPartyAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingApi, setEditingApi] = useState<ThirdPartyAPI | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    base_url: "",
    url_pattern_movie: "",
    url_pattern_tv: "",
    api_type: "streaming" as "streaming" | "download" | "torrent",
    priority: 0,
    language: "VO",
    is_anonymous: false,
  })

  useEffect(() => {
    loadApis()
  }, [])

  const loadApis = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("third_party_apis").select("*").order("priority", { ascending: true })
    setApis(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      base_url: "",
      url_pattern_movie: "",
      url_pattern_tv: "",
      api_type: "streaming",
      priority: 0,
      language: "VO",
      is_anonymous: false,
    })
    setEditingApi(null)
    setShowForm(false)
  }

  const startEdit = (api: ThirdPartyAPI) => {
    setEditingApi(api)
    setFormData({
      name: api.name,
      base_url: api.base_url,
      url_pattern_movie: api.url_pattern_movie || api.url_pattern || "",
      url_pattern_tv: api.url_pattern_tv || api.url_pattern || "",
      api_type: api.api_type as "streaming" | "download" | "torrent",
      priority: api.priority,
      language: (api as any).language || "VO",
      is_anonymous: (api as any).is_anonymous || false,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    const apiData = {
      name: formData.name,
      base_url: formData.base_url,
      url_pattern: formData.url_pattern_movie,
      url_pattern_movie: formData.url_pattern_movie,
      url_pattern_tv: formData.url_pattern_tv,
      api_type: formData.api_type,
      priority: formData.priority,
      language: formData.language,
      is_anonymous: formData.is_anonymous,
      is_active: true,
    }

    if (editingApi) {
      const { error } = await supabase.from("third_party_apis").update(apiData).eq("id", editingApi.id)

      if (!error) {
        resetForm()
        loadApis()
      }
    } else {
      const { error } = await supabase.from("third_party_apis").insert(apiData)

      if (!error) {
        resetForm()
        loadApis()
      }
    }
  }

  const toggleActive = async (id: string, currentState: boolean) => {
    const supabase = createClient()
    await supabase.from("third_party_apis").update({ is_active: !currentState }).eq("id", id)
    loadApis()
  }

  const deleteApi = async (id: string) => {
    if (!confirm("Supprimer cette API?")) return
    const supabase = createClient()
    await supabase.from("third_party_apis").delete().eq("id", id)
    loadApis()
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">APIs Third-Party</h2>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? "Annuler" : "Ajouter une API"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingApi ? "Modifier l'API" : "Nouvelle API"}
              {editingApi && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VidSrc"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL de base</Label>
                  <Input
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://vidsrc.xyz"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Pattern URL Film <span className="text-muted-foreground text-xs">(optionnel)</span>
                  </Label>
                  <Input
                    value={formData.url_pattern_movie}
                    onChange={(e) => setFormData({ ...formData, url_pattern_movie: e.target.value })}
                    placeholder="https://vidsrc.xyz/embed/movie/{tmdb_id}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders: <code className="bg-secondary px-1 rounded">{"{tmdb_id}"}</code> — Laissez vide pour
                    ne pas utiliser cette API pour les films
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Pattern URL Série <span className="text-muted-foreground text-xs">(optionnel)</span>
                  </Label>
                  <Input
                    value={formData.url_pattern_tv}
                    onChange={(e) => setFormData({ ...formData, url_pattern_tv: e.target.value })}
                    placeholder="https://vidsrc.xyz/embed/tv/{tmdb_id}/{season}/{episode}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders: <code className="bg-secondary px-1 rounded">{"{tmdb_id}"}</code>{" "}
                    <code className="bg-secondary px-1 rounded">{"{season}"}</code>{" "}
                    <code className="bg-secondary px-1 rounded">{"{episode}"}</code> — Laissez vide pour ne pas utiliser
                    cette API pour les séries
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.api_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, api_type: v as "streaming" | "download" | "torrent" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="streaming">Streaming</SelectItem>
                      <SelectItem value="download">Download</SelectItem>
                      <SelectItem value="torrent">Torrent</SelectItem>
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
                      <SelectItem value="VO">VO (Version Originale)</SelectItem>
                      <SelectItem value="VF">VF (Français)</SelectItem>
                      <SelectItem value="VOSTFR">VOSTFR</SelectItem>
                      <SelectItem value="EN">Anglais</SelectItem>
                      <SelectItem value="ES">Espagnol</SelectItem>
                      <SelectItem value="DE">Allemand</SelectItem>
                      <SelectItem value="IT">Italien</SelectItem>
                      <SelectItem value="PT">Portugais</SelectItem>
                      <SelectItem value="MULTI">Multi-langues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">Plus bas = plus prioritaire</p>
                </div>

                <div className="space-y-2 flex items-center gap-3 pt-6">
                  <Checkbox
                    id="is_anonymous"
                    checked={formData.is_anonymous}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked as boolean })}
                  />
                  <Label htmlFor="is_anonymous" className="cursor-pointer flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    Source anonyme
                    <span className="text-xs text-muted-foreground">(affichera "Source #1, #2...")</span>
                  </Label>
                </div>
              </div>
              <Button type="submit">{editingApi ? "Enregistrer les modifications" : "Ajouter"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {apis.map((api, index) => (
          <Card key={api.id} className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      {(api as any).is_anonymous ? (
                        <>
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Source #{index + 1}</span>
                          <span className="text-xs text-muted-foreground">({api.name})</span>
                        </>
                      ) : (
                        api.name
                      )}
                    </h3>
                    <Badge variant={api.is_active ? "default" : "secondary"}>
                      {api.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <Badge variant="outline">{api.api_type}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {(api as any).language || "VO"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Priorité: {api.priority}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary font-medium">Film:</span>{" "}
                      <code className="font-mono text-xs break-all">
                        {api.url_pattern_movie || api.url_pattern || "-"}
                      </code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary font-medium">Série:</span>{" "}
                      <code className="font-mono text-xs break-all">
                        {api.url_pattern_tv || api.url_pattern || "-"}
                      </code>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Switch checked={api.is_active} onCheckedChange={() => toggleActive(api.id, api.is_active)} />
                  <Button variant="outline" size="sm" onClick={() => startEdit(api)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteApi(api.id)}>
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {apis.length === 0 && <div className="text-center py-8 text-muted-foreground">Aucune API configurée</div>}
      </div>
    </div>
  )
}
