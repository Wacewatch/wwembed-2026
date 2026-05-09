"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Trash2, ExternalLink, MousePointer, RefreshCw } from "lucide-react"

interface Ad {
  id: string
  slot_number: number
  name: string
  ad_url: string
  ad_type: string
  is_active: boolean
  click_count: number
  created_at: string
}

interface SlotState {
  name: string
  ad_url: string
  ad_type: string
  is_active: boolean
}

const defaultSlot: SlotState = { name: "", ad_url: "", ad_type: "popup", is_active: true }

export function AdsManager() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [slots, setSlots] = useState<{ [key: number]: SlotState }>({
    1: { ...defaultSlot },
    2: { ...defaultSlot },
    3: { ...defaultSlot },
  })
  const supabase = createClient()

  const loadAds = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from("ads").select("*").order("slot_number", { ascending: true })

    if (data && !error) {
      setAds(data)
      const newSlots: { [key: number]: SlotState } = {
        1: { ...defaultSlot },
        2: { ...defaultSlot },
        3: { ...defaultSlot },
      }
      data.forEach((ad) => {
        if (ad.slot_number >= 1 && ad.slot_number <= 3) {
          newSlots[ad.slot_number] = {
            name: ad.name || "",
            ad_url: ad.ad_url || "",
            ad_type: ad.ad_type || "popup",
            is_active: ad.is_active ?? true,
          }
        }
      })
      setSlots(newSlots)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAds()
  }, [loadAds])

  function updateSlot(slotNum: number, updates: Partial<SlotState>) {
    setSlots((prev) => ({
      ...prev,
      [slotNum]: { ...prev[slotNum], ...updates },
    }))
  }

  async function saveSlot(slotNum: number) {
    const slot = slots[slotNum]
    if (!slot || !slot.name || !slot.ad_url) {
      return
    }

    setSaving(slotNum)
    const existingAd = ads.find((a) => a.slot_number === slotNum)

    if (existingAd) {
      const { error } = await supabase
        .from("ads")
        .update({
          name: slot.name,
          ad_url: slot.ad_url,
          ad_type: slot.ad_type,
          is_active: slot.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAd.id)

      if (error) {
        console.error("[v0] Error updating ad:", error)
      }
    } else {
      const { error } = await supabase.from("ads").insert({
        slot_number: slotNum,
        name: slot.name,
        ad_url: slot.ad_url,
        ad_type: slot.ad_type,
        is_active: slot.is_active,
      })

      if (error) {
        console.error("[v0] Error inserting ad:", error)
      }
    }

    await loadAds()
    setSaving(null)
  }

  async function deleteSlot(slotNum: number) {
    const existingAd = ads.find((a) => a.slot_number === slotNum)
    if (existingAd) {
      await supabase.from("ads").delete().eq("id", existingAd.id)
      updateSlot(slotNum, defaultSlot)
      await loadAds()
    }
  }

  // Stats
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.click_count || 0), 0)
  const activeAds = ads.filter((a) => a.is_active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="admin-stat-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ads.length}/3</p>
                <p className="text-sm text-muted-foreground">Pubs configurees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="admin-stat-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ExternalLink className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAds}</p>
                <p className="text-sm text-muted-foreground">Pubs actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="admin-stat-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MousePointer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-sm text-muted-foreground">Clics totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((num) => {
          const state = slots[num]
          const existingAd = ads.find((a) => a.slot_number === num)
          return (
            <Card key={num} className="admin-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pub #{num}</span>
                  {existingAd && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {existingAd.click_count || 0} clics
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{existingAd ? "Modifier cette publicite" : "Ajouter une publicite"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${num}`}>Nom</Label>
                  <Input
                    id={`name-${num}`}
                    placeholder="Ex: Pub principale"
                    value={state.name}
                    onChange={(e) => updateSlot(num, { name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`url-${num}`}>URL de la publicite</Label>
                  <Input
                    id={`url-${num}`}
                    placeholder="https://..."
                    value={state.ad_url}
                    onChange={(e) => updateSlot(num, { ad_url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`type-${num}`}>Type</Label>
                  <Select value={state.ad_type} onValueChange={(value) => updateSlot(num, { ad_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popup">Popup (nouvel onglet)</SelectItem>
                      <SelectItem value="redirect">Redirection</SelectItem>
                      <SelectItem value="iframe">Iframe integre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`active-${num}`}>Active</Label>
                  <Switch
                    id={`active-${num}`}
                    checked={state.is_active}
                    onCheckedChange={(checked) => updateSlot(num, { is_active: checked })}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => saveSlot(num)}
                    disabled={!state.name || !state.ad_url || saving === num}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving === num ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                  {existingAd && (
                    <Button variant="destructive" size="icon" onClick={() => deleteSlot(num)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Refresh button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={loadAds}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rafraichir
        </Button>
      </div>

      {/* Info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Comment ca fonctionne ?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • Lorsqu un utilisateur accede au lecteur ou aux telechargements, un panneau lui demande de voir une pub
            </li>
            <li>• Une pub aleatoire parmi les actives est selectionnee</li>
            <li>• Apres le clic et 5 secondes d attente, le contenu est debloque</li>
            <li>• Les clics sont comptabilises et visibles dans les statistiques</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
