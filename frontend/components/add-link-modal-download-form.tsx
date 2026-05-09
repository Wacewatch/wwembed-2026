// This is the download form section that replaces the existing TabsContent for download
// Insert this in add-link-modal.tsx inside the download TabsContent

"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

interface DownloadFormProps {
  downloadData: {
    source_name: string
    source_url: string
    link_type: "direct" | "torrent" | "magnet"
    quality: string
    file_size: string
    language: string
    release_name: string
    codec_video: string
    codec_audio: string
    resolution: string
    subtitle: string
    nfo: string
    has_audio_description: boolean
  }
  setDownloadData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  success: string | null
  error: string | null
}

export function DownloadForm({ downloadData, setDownloadData, onSubmit, loading, success, error }: DownloadFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Row 1: Source name & Link type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom de la source *</Label>
          <Input
            placeholder="Ex: 1fichier"
            value={downloadData.source_name}
            onChange={(e) => setDownloadData({ ...downloadData, source_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Type de lien</Label>
          <Select
            value={downloadData.link_type}
            onValueChange={(v) =>
              setDownloadData({
                ...downloadData,
                link_type: v as "direct" | "torrent" | "magnet",
              })
            }
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
      </div>

      {/* Row 2: URL */}
      <div className="space-y-2">
        <Label>URL du telechargement *</Label>
        <Input
          placeholder="https://..."
          value={downloadData.source_url}
          onChange={(e) => setDownloadData({ ...downloadData, source_url: e.target.value })}
          required
        />
      </div>

      {/* Row 3: Release name */}
      <div className="space-y-2">
        <Label>Release (nom du fichier)</Label>
        <Input
          placeholder="Ex: Movie.2024.1080p.BluRay.x264-GROUP"
          value={downloadData.release_name}
          onChange={(e) => setDownloadData({ ...downloadData, release_name: e.target.value })}
        />
      </div>

      {/* Row 4: Quality, Size, Language */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Qualite</Label>
          <Select value={downloadData.quality} onValueChange={(v) => setDownloadData({ ...downloadData, quality: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CAM">CAM</SelectItem>
              <SelectItem value="TS">TS</SelectItem>
              <SelectItem value="SD">SD</SelectItem>
              <SelectItem value="HD">HD (720p)</SelectItem>
              <SelectItem value="FHD">FHD (1080p)</SelectItem>
              <SelectItem value="4K">4K (2160p)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Taille</Label>
          <Input
            placeholder="1.5 GB"
            value={downloadData.file_size}
            onChange={(e) => setDownloadData({ ...downloadData, file_size: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Langue</Label>
          <Select
            value={downloadData.language}
            onValueChange={(v) => setDownloadData({ ...downloadData, language: v })}
          >
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

      {/* Row 5: Resolution & Codecs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Resolution</Label>
          <Select
            value={downloadData.resolution}
            onValueChange={(v) => setDownloadData({ ...downloadData, resolution: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="480p">480p</SelectItem>
              <SelectItem value="576p">576p</SelectItem>
              <SelectItem value="720p">720p</SelectItem>
              <SelectItem value="1080p">1080p</SelectItem>
              <SelectItem value="1080i">1080i</SelectItem>
              <SelectItem value="2160p">2160p (4K)</SelectItem>
              <SelectItem value="4320p">4320p (8K)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Codec Video</Label>
          <Select
            value={downloadData.codec_video}
            onValueChange={(v) => setDownloadData({ ...downloadData, codec_video: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="x264">x264</SelectItem>
              <SelectItem value="x265">x265 (HEVC)</SelectItem>
              <SelectItem value="AV1">AV1</SelectItem>
              <SelectItem value="VP9">VP9</SelectItem>
              <SelectItem value="XviD">XviD</SelectItem>
              <SelectItem value="DivX">DivX</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Codec Audio</Label>
          <Select
            value={downloadData.codec_audio}
            onValueChange={(v) => setDownloadData({ ...downloadData, codec_audio: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AAC">AAC</SelectItem>
              <SelectItem value="AC3">AC3 (Dolby)</SelectItem>
              <SelectItem value="DTS">DTS</SelectItem>
              <SelectItem value="DTS-HD">DTS-HD</SelectItem>
              <SelectItem value="TrueHD">TrueHD</SelectItem>
              <SelectItem value="FLAC">FLAC</SelectItem>
              <SelectItem value="MP3">MP3</SelectItem>
              <SelectItem value="EAC3">EAC3</SelectItem>
              <SelectItem value="Atmos">Dolby Atmos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 6: Subtitles */}
      <div className="space-y-2">
        <Label>Sous-titres inclus</Label>
        <Input
          placeholder="Ex: FR, EN, ES (separes par virgule)"
          value={downloadData.subtitle}
          onChange={(e) => setDownloadData({ ...downloadData, subtitle: e.target.value })}
        />
      </div>

      {/* Row 7: NFO */}
      <div className="space-y-2">
        <Label>NFO (infos supplementaires)</Label>
        <Textarea
          placeholder="Collez le contenu du NFO ou des infos supplementaires..."
          value={downloadData.nfo}
          onChange={(e) => setDownloadData({ ...downloadData, nfo: e.target.value })}
          rows={3}
        />
      </div>

      {/* Row 8: Audio Description checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="audio_description"
          checked={downloadData.has_audio_description}
          onCheckedChange={(checked) => setDownloadData({ ...downloadData, has_audio_description: checked === true })}
        />
        <Label htmlFor="audio_description" className="text-sm font-normal cursor-pointer">
          Audio Description (AD) disponible
        </Label>
      </div>

      {success && <p className="text-sm text-green-500">{success}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Ajout en cours..." : "Ajouter le lien telechargement"}
      </Button>
    </form>
  )
}
