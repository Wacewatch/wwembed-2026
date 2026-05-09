"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Save, Loader2, Tv, MessageSquare } from "lucide-react"

interface SiteSettings {
  live_tv_ticker_enabled: boolean
  live_tv_ticker_message: string
  live_tv_ticker_speed: number
  live_tv_ticker_bg_color: string
  live_tv_ticker_text_color: string
}

const defaultSettings: SiteSettings = {
  live_tv_ticker_enabled: false,
  live_tv_ticker_message: "Bienvenue sur WWEmbed - Votre plateforme de streaming",
  live_tv_ticker_speed: 50,
  live_tv_ticker_bg_color: "#ef4444",
  live_tv_ticker_text_color: "#ffffff",
}

export function SettingsManager() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const loadSettings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("site_settings").select("*").single()

    if (data) {
      setSettings({
        live_tv_ticker_enabled: data.live_tv_ticker_enabled ?? defaultSettings.live_tv_ticker_enabled,
        live_tv_ticker_message: data.live_tv_ticker_message ?? defaultSettings.live_tv_ticker_message,
        live_tv_ticker_speed: data.live_tv_ticker_speed ?? defaultSettings.live_tv_ticker_speed,
        live_tv_ticker_bg_color: data.live_tv_ticker_bg_color ?? defaultSettings.live_tv_ticker_bg_color,
        live_tv_ticker_text_color: data.live_tv_ticker_text_color ?? defaultSettings.live_tv_ticker_text_color,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  async function saveSettings() {
    setSaving(true)
    const { data: existing } = await supabase.from("site_settings").select("id").single()

    if (existing) {
      await supabase.from("site_settings").update(settings).eq("id", existing.id)
    } else {
      await supabase.from("site_settings").insert(settings)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Parametres du site</h2>
      </div>

      <Card className="admin-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            Message defilant TV Live
          </CardTitle>
          <CardDescription>
            Configurez le bandeau de texte defilant qui apparait en bas du lecteur TV Live
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer le message defilant</Label>
              <p className="text-sm text-muted-foreground">Affiche un bandeau en bas du lecteur</p>
            </div>
            <Switch
              checked={settings.live_tv_ticker_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, live_tv_ticker_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticker-message" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message
            </Label>
            <Textarea
              id="ticker-message"
              placeholder="Entrez le message a afficher..."
              value={settings.live_tv_ticker_message}
              onChange={(e) => setSettings({ ...settings, live_tv_ticker_message: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker-speed">Vitesse (px/sec)</Label>
              <Input
                id="ticker-speed"
                type="number"
                min="10"
                max="200"
                value={settings.live_tv_ticker_speed}
                onChange={(e) =>
                  setSettings({ ...settings, live_tv_ticker_speed: Number.parseInt(e.target.value) || 50 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker-bg">Couleur de fond</Label>
              <div className="flex gap-2">
                <Input
                  id="ticker-bg"
                  type="color"
                  value={settings.live_tv_ticker_bg_color}
                  onChange={(e) => setSettings({ ...settings, live_tv_ticker_bg_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.live_tv_ticker_bg_color}
                  onChange={(e) => setSettings({ ...settings, live_tv_ticker_bg_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker-text">Couleur du texte</Label>
              <div className="flex gap-2">
                <Input
                  id="ticker-text"
                  type="color"
                  value={settings.live_tv_ticker_text_color}
                  onChange={(e) => setSettings({ ...settings, live_tv_ticker_text_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.live_tv_ticker_text_color}
                  onChange={(e) => setSettings({ ...settings, live_tv_ticker_text_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {settings.live_tv_ticker_enabled && (
            <div className="space-y-2">
              <Label>Apercu</Label>
              <div
                className="overflow-hidden rounded-lg h-8 flex items-center"
                style={{ backgroundColor: settings.live_tv_ticker_bg_color }}
              >
                <div
                  className="whitespace-nowrap animate-marquee text-sm font-medium px-4"
                  style={{ color: settings.live_tv_ticker_text_color }}
                >
                  {settings.live_tv_ticker_message}
                </div>
              </div>
            </div>
          )}

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder les parametres
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
