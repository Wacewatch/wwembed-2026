"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Eye, Palette, User, Share2, ImageIcon } from "lucide-react"
import Link from "next/link"

interface ProfileSettingsProps {
  userId: string
  username: string
}

interface Settings {
  theme: string
  primary_color: string
  bio: string
  social_twitter: string
  social_discord: string
  social_website: string
  show_email: boolean
  show_stats: boolean
  banner_url: string
  banner_preset: string
  avatar_url: string
  avatar_preset: string
}

const themes = [
  { value: "dark", label: "Sombre", preview: "bg-slate-900" },
  { value: "midnight", label: "Minuit", preview: "bg-slate-950" },
  { value: "ocean", label: "Océan", preview: "bg-blue-950" },
  { value: "forest", label: "Forêt", preview: "bg-emerald-950" },
  { value: "sunset", label: "Coucher de soleil", preview: "bg-orange-950" },
  { value: "purple", label: "Violet", preview: "bg-purple-950" },
  { value: "rose", label: "Rose", preview: "bg-rose-950" },
  { value: "amber", label: "Ambre", preview: "bg-amber-950" },
  { value: "teal", label: "Sarcelle", preview: "bg-teal-950" },
  { value: "indigo", label: "Indigo", preview: "bg-indigo-950" },
  { value: "zinc", label: "Zinc", preview: "bg-zinc-900" },
  { value: "neutral", label: "Neutre", preview: "bg-neutral-900" },
  { value: "stone", label: "Pierre", preview: "bg-stone-900" },
  { value: "red", label: "Rouge", preview: "bg-red-950" },
  { value: "lime", label: "Lime", preview: "bg-lime-950" },
  { value: "sky", label: "Ciel", preview: "bg-sky-950" },
  { value: "fuchsia", label: "Fuchsia", preview: "bg-fuchsia-950" },
  { value: "cyan", label: "Cyan", preview: "bg-cyan-950" },
  { value: "gradient-blue", label: "Dégradé Bleu", preview: "bg-gradient-to-br from-blue-950 to-indigo-950" },
  { value: "gradient-purple", label: "Dégradé Violet", preview: "bg-gradient-to-br from-purple-950 to-pink-950" },
  { value: "gradient-green", label: "Dégradé Vert", preview: "bg-gradient-to-br from-emerald-950 to-teal-950" },
  { value: "gradient-orange", label: "Dégradé Orange", preview: "bg-gradient-to-br from-orange-950 to-red-950" },
  { value: "gradient-cyan", label: "Dégradé Cyan", preview: "bg-gradient-to-br from-cyan-950 to-blue-950" },
  { value: "gradient-rose", label: "Dégradé Rose", preview: "bg-gradient-to-br from-rose-950 to-purple-950" },
  { value: "neon-blue", label: "Néon Bleu", preview: "bg-black" },
  { value: "neon-green", label: "Néon Vert", preview: "bg-black" },
  { value: "neon-pink", label: "Néon Rose", preview: "bg-black" },
  { value: "matrix", label: "Matrix", preview: "bg-black" },
  { value: "cyberpunk", label: "Cyberpunk", preview: "bg-gradient-to-br from-yellow-900 to-pink-900" },
  { value: "aurora", label: "Aurore", preview: "bg-gradient-to-br from-green-950 via-blue-950 to-purple-950" },
]

const colors = [
  { value: "cyan", label: "Cyan", preview: "bg-cyan-500" },
  { value: "blue", label: "Bleu", preview: "bg-blue-500" },
  { value: "green", label: "Vert", preview: "bg-green-500" },
  { value: "purple", label: "Violet", preview: "bg-purple-500" },
  { value: "pink", label: "Rose", preview: "bg-pink-500" },
  { value: "orange", label: "Orange", preview: "bg-orange-500" },
  { value: "red", label: "Rouge", preview: "bg-red-500" },
  { value: "yellow", label: "Jaune", preview: "bg-yellow-500" },
  { value: "emerald", label: "Émeraude", preview: "bg-emerald-500" },
  { value: "teal", label: "Sarcelle", preview: "bg-teal-500" },
  { value: "indigo", label: "Indigo", preview: "bg-indigo-500" },
  { value: "violet", label: "Violet foncé", preview: "bg-violet-500" },
  { value: "fuchsia", label: "Fuchsia", preview: "bg-fuchsia-500" },
  { value: "rose", label: "Rose vif", preview: "bg-rose-500" },
  { value: "amber", label: "Ambre", preview: "bg-amber-500" },
  { value: "lime", label: "Lime", preview: "bg-lime-500" },
  { value: "sky", label: "Ciel", preview: "bg-sky-500" },
  { value: "slate", label: "Ardoise", preview: "bg-slate-500" },
  { value: "gold", label: "Or", preview: "bg-yellow-600" },
  { value: "coral", label: "Corail", preview: "bg-orange-400" },
  { value: "mint", label: "Menthe", preview: "bg-emerald-400" },
  { value: "lavender", label: "Lavande", preview: "bg-purple-400" },
  { value: "neon-blue", label: "Néon Bleu", preview: "bg-blue-400" },
  { value: "neon-green", label: "Néon Vert", preview: "bg-green-400" },
  { value: "neon-pink", label: "Néon Rose", preview: "bg-pink-400" },
  { value: "neon-yellow", label: "Néon Jaune", preview: "bg-yellow-400" },
  { value: "electric", label: "Électrique", preview: "bg-cyan-400" },
  { value: "sunset-orange", label: "Coucher Soleil", preview: "bg-orange-500" },
  { value: "ocean-blue", label: "Océan", preview: "bg-blue-600" },
  { value: "forest-green", label: "Forêt", preview: "bg-green-700" },
]

const bannerPresets = [
  { value: "none", label: "Aucune", preview: "bg-slate-800" },
  { value: "gradient-blue", label: "Dégradé Bleu", preview: "bg-gradient-to-r from-blue-600 to-cyan-500" },
  { value: "gradient-purple", label: "Dégradé Violet", preview: "bg-gradient-to-r from-purple-600 to-pink-500" },
  { value: "gradient-green", label: "Dégradé Vert", preview: "bg-gradient-to-r from-green-600 to-emerald-500" },
  { value: "gradient-orange", label: "Dégradé Orange", preview: "bg-gradient-to-r from-orange-600 to-red-500" },
  { value: "gradient-pink", label: "Dégradé Rose", preview: "bg-gradient-to-r from-pink-600 to-rose-500" },
  { value: "gradient-cyan", label: "Dégradé Cyan", preview: "bg-gradient-to-r from-cyan-600 to-teal-500" },
  { value: "gradient-indigo", label: "Dégradé Indigo", preview: "bg-gradient-to-r from-indigo-600 to-violet-500" },
  {
    value: "gradient-sunset",
    label: "Coucher Soleil",
    preview: "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500",
  },
  { value: "gradient-ocean", label: "Océan", preview: "bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" },
  { value: "gradient-forest", label: "Forêt", preview: "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500" },
  { value: "gradient-aurora", label: "Aurore", preview: "bg-gradient-to-r from-green-400 via-blue-500 to-purple-500" },
  { value: "gradient-neon", label: "Néon", preview: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" },
  { value: "pattern-dots", label: "Points", preview: "bg-slate-800" },
  { value: "pattern-grid", label: "Grille", preview: "bg-slate-800" },
  { value: "pattern-waves", label: "Vagues", preview: "bg-slate-800" },
  { value: "anime-1", label: "Anime 1", preview: "bg-gradient-to-r from-pink-400 to-purple-500" },
  { value: "gaming-1", label: "Gaming 1", preview: "bg-gradient-to-r from-red-600 to-black" },
]

const avatarPresets = [
  { value: "default", label: "Défaut", url: "/user-avatar-default.jpg" },
  { value: "avatar-1", label: "Avatar 1", url: "/cool-avatar-blue-gamer.jpg" },
  { value: "avatar-2", label: "Avatar 2", url: "/cool-avatar-purple-anime.jpg" },
  { value: "avatar-3", label: "Avatar 3", url: "/cool-avatar-green-nature.jpg" },
  { value: "avatar-4", label: "Avatar 4", url: "/cool-avatar-red-fire.jpg" },
  { value: "avatar-5", label: "Avatar 5", url: "/cool-avatar-orange-sunset.jpg" },
  { value: "avatar-6", label: "Avatar 6", url: "/cool-avatar-pink-cute.jpg" },
  { value: "avatar-7", label: "Avatar 7", url: "/cool-avatar-cyan-tech.jpg" },
  { value: "avatar-8", label: "Avatar 8", url: "/cool-avatar-yellow-electric.jpg" },
  { value: "avatar-9", label: "Avatar 9", url: "/cool-avatar-dark-mysterious.jpg" },
  { value: "avatar-10", label: "Avatar 10", url: "/cool-avatar-white-minimal.jpg" },
  { value: "avatar-11", label: "Avatar 11", url: "/cool-avatar-neon-cyberpunk.jpg" },
  { value: "avatar-12", label: "Avatar 12", url: "/cool-avatar-retro-vintage.jpg" },
  { value: "gamer-1", label: "Gamer 1", url: "/gamer-avatar-headset.jpg" },
  { value: "gamer-2", label: "Gamer 2", url: "/gamer-avatar-controller.jpg" },
  { value: "anime-1", label: "Anime 1", url: "/placeholder.svg?height=100&width=100" },
  { value: "anime-2", label: "Anime 2", url: "/placeholder.svg?height=100&width=100" },
  { value: "robot-1", label: "Robot", url: "/placeholder.svg?height=100&width=100" },
  { value: "cat-1", label: "Chat", url: "/placeholder.svg?height=100&width=100" },
  { value: "dog-1", label: "Chien", url: "/placeholder.svg?height=100&width=100" },
  { value: "custom", label: "URL personnalisée", url: "" },
]

export function ProfileSettings({ userId, username }: ProfileSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    theme: "dark",
    primary_color: "cyan",
    bio: "",
    social_twitter: "",
    social_discord: "",
    social_website: "",
    show_email: false,
    show_stats: true,
    banner_url: "",
    banner_preset: "none",
    avatar_url: "",
    avatar_preset: "default",
  })
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadSettings()
  }, [userId])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("profile_settings").select("*").eq("user_id", userId).single()

      if (data) {
        setSettingsId(data.id)
        setSettings({
          theme: data.theme || "dark",
          primary_color: data.primary_color || "cyan",
          bio: data.bio || "",
          social_twitter: data.social_twitter || "",
          social_discord: data.social_discord || "",
          social_website: data.social_website || "",
          show_email: data.show_email ?? false,
          show_stats: data.show_stats ?? true,
          banner_url: data.banner_url || "",
          banner_preset: data.banner_preset || "none",
          avatar_url: data.avatar_url || "",
          avatar_preset: data.avatar_preset || "default",
        })
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage("")
    try {
      const supabase = createClient()

      const settingsData = {
        user_id: userId,
        theme: settings.theme,
        primary_color: settings.primary_color,
        bio: settings.bio,
        social_twitter: settings.social_twitter,
        social_discord: settings.social_discord,
        social_website: settings.social_website,
        show_email: settings.show_email,
        show_stats: settings.show_stats,
        banner_url: settings.banner_url,
        banner_preset: settings.banner_preset,
        avatar_url: settings.avatar_url,
        avatar_preset: settings.avatar_preset,
        updated_at: new Date().toISOString(),
      }

      let error
      if (settingsId) {
        const result = await supabase.from("profile_settings").update(settingsData).eq("id", settingsId)
        error = result.error
      } else {
        const result = await supabase.from("profile_settings").insert(settingsData).select().single()
        error = result.error
        if (result.data) {
          setSettingsId(result.data.id)
        }
      }

      if (error) {
        console.error("Error saving:", error)
        setMessage("Erreur: " + error.message)
      } else {
        setMessage("Paramètres sauvegardés!")
      }
    } catch (error: any) {
      console.error("Error:", error)
      setMessage("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(""), 3000)
    }
  }

  const getCurrentAvatarUrl = () => {
    if (settings.avatar_preset === "custom" && settings.avatar_url) {
      return settings.avatar_url
    }
    const preset = avatarPresets.find((a) => a.value === settings.avatar_preset)
    return preset?.url || avatarPresets[0].url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Paramètres du profil</h2>
        <Link href={`/profile/${username}`} target="_blank">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Voir mon profil
          </Button>
        </Link>
      </div>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-500" />
            Avatar
          </CardTitle>
          <CardDescription>Choisissez votre avatar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Avatar Preview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={getCurrentAvatarUrl() || "/placeholder.svg"}
                alt="Avatar actuel"
                className="h-20 w-20 rounded-full border-4 border-cyan-500/50 object-cover"
              />
            </div>
            <div>
              <p className="text-sm text-slate-400">Avatar actuel</p>
              <p className="text-lg font-medium">{username}</p>
            </div>
          </div>

          {/* Avatar Presets */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">Avatars prédéfinis</Label>
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
              {avatarPresets
                .filter((a) => a.value !== "custom")
                .map((avatar) => (
                  <button
                    key={avatar.value}
                    onClick={() => setSettings({ ...settings, avatar_preset: avatar.value, avatar_url: "" })}
                    className={`relative rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                      settings.avatar_preset === avatar.value
                        ? "border-cyan-500 ring-2 ring-cyan-500/50"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                    title={avatar.label}
                  >
                    <img src={avatar.url || "/placeholder.svg"} alt={avatar.label} className="h-10 w-10 object-cover" />
                  </button>
                ))}
            </div>
          </div>

          {/* Custom Avatar URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="custom-avatar"
                checked={settings.avatar_preset === "custom"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    avatar_preset: e.target.checked ? "custom" : "default",
                  })
                }
                className="rounded border-slate-600"
              />
              <Label htmlFor="custom-avatar" className="text-sm">
                URL personnalisée
              </Label>
            </div>
            {settings.avatar_preset === "custom" && (
              <Input
                placeholder="https://example.com/mon-avatar.png"
                value={settings.avatar_url}
                onChange={(e) => setSettings({ ...settings, avatar_url: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Section */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-cyan-500" />
            Apparence
          </CardTitle>
          <CardDescription>Personnalisez l'apparence de votre profil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Themes */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">Thème</Label>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setSettings({ ...settings, theme: theme.value })}
                  className={`relative h-10 rounded-lg ${theme.preview} border-2 transition-all hover:scale-105 ${
                    settings.theme === theme.value
                      ? "border-cyan-500 ring-2 ring-cyan-500/50"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  title={theme.label}
                />
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">Couleur d'accent</Label>
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSettings({ ...settings, primary_color: color.value })}
                  className={`h-8 w-8 rounded-full ${color.preview} border-2 transition-all hover:scale-110 ${
                    settings.primary_color === color.value
                      ? "border-white ring-2 ring-white/50"
                      : "border-slate-600 hover:border-slate-400"
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner Section */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-cyan-500" />
            Bannière
          </CardTitle>
          <CardDescription>Choisissez une bannière pour votre profil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">Bannières prédéfinies</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {bannerPresets.map((banner) => (
                <button
                  key={banner.value}
                  onClick={() => setSettings({ ...settings, banner_preset: banner.value, banner_url: "" })}
                  className={`h-12 rounded-lg ${banner.preview} border-2 transition-all hover:scale-105 ${
                    settings.banner_preset === banner.value
                      ? "border-cyan-500 ring-2 ring-cyan-500/50"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  title={banner.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-400">URL personnalisée (optionnel)</Label>
            <Input
              placeholder="https://example.com/ma-banniere.png"
              value={settings.banner_url}
              onChange={(e) => setSettings({ ...settings, banner_url: e.target.value, banner_preset: "custom" })}
              className="bg-slate-700/50 border-slate-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bio Section */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-500" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              placeholder="Parlez de vous..."
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
              className="bg-slate-700/50 border-slate-600 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-cyan-500" />
            Réseaux sociaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Twitter</Label>
              <Input
                placeholder="@username"
                value={settings.social_twitter}
                onChange={(e) => setSettings({ ...settings, social_twitter: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Discord</Label>
              <Input
                placeholder="username#1234"
                value={settings.social_discord}
                onChange={(e) => setSettings({ ...settings, social_discord: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Site web</Label>
              <Input
                placeholder="https://monsite.com"
                value={settings.social_website}
                onChange={(e) => setSettings({ ...settings, social_website: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle>Confidentialité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Afficher l'email</p>
              <p className="text-sm text-slate-400">Votre email sera visible sur votre profil</p>
            </div>
            <Switch
              checked={settings.show_email}
              onCheckedChange={(checked) => setSettings({ ...settings, show_email: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Afficher les statistiques</p>
              <p className="text-sm text-slate-400">Vos statistiques seront visibles</p>
            </div>
            <Switch
              checked={settings.show_stats}
              onCheckedChange={(checked) => setSettings({ ...settings, show_stats: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={saveSettings} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sauvegarder
        </Button>
        {message && <span className={message.includes("Erreur") ? "text-red-400" : "text-green-400"}>{message}</span>}
      </div>
    </div>
  )
}
