"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tv,
  Play,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Link2,
  User,
  Calendar,
  ExternalLink,
  CheckCheck,
  Loader2,
  Book,
  FileDown,
} from "lucide-react"
import type { StreamingLink, DownloadLink, LiveTVChannel, LiveTVSource } from "@/lib/types"

interface PendingLink extends StreamingLink {
  submitter_email?: string
}

interface PendingDownloadLink extends DownloadLink {
  submitter_email?: string
}

interface PendingLiveTVChannel extends LiveTVChannel {
  submitter_email?: string
}

interface PendingLiveTVSource extends LiveTVSource {
  submitter_email?: string
  channel_name?: string
}

interface PendingDigitalContent {
  id: string
  ww_id: string
  title: string
  content_type: string
  author?: string
  cover_url?: string
  status: string
  created_at: string
  submitter_email?: string
}

interface PendingDigitalLink {
  id: string
  content_id: string
  ww_id: string
  source_name: string
  source_url: string
  quality: string
  link_type: string
  file_format?: string
  file_size?: string
  status: string
  created_at: string
  submitter_email?: string
  content_title?: string
}

export function PendingLinksManager() {
  const [streamingLinks, setStreamingLinks] = useState<PendingLink[]>([])
  const [downloadLinks, setDownloadLinks] = useState<PendingDownloadLink[]>([])
  const [liveTvChannels, setLiveTvChannels] = useState<PendingLiveTVChannel[]>([])
  const [liveTvSources, setLiveTvSources] = useState<PendingLiveTVSource[]>([])
  const [digitalContents, setDigitalContents] = useState<PendingDigitalContent[]>([])
  const [digitalLinks, setDigitalLinks] = useState<PendingDigitalLink[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadPendingLinks()
  }, [])

  const loadPendingLinks = async () => {
    const supabase = createClient()

    const [streaming, download, livetv, tvSources, digital, digitalDl] = await Promise.all([
      supabase
        .from("streaming_links")
        .select("*, profiles(email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("download_links")
        .select("*, profiles(email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("live_tv_channels")
        .select("*, profiles(email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("live_tv_sources")
        .select("*, profiles(email), live_tv_channels(channel_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_content")
        .select("*, profiles(email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_download_links")
        .select("*, profiles(email), digital_content(title)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ])

    setStreamingLinks(
      (streaming.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingLink[],
    )
    setDownloadLinks(
      (download.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingDownloadLink[],
    )
    setLiveTvChannels(
      (livetv.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingLiveTVChannel[],
    )
    setLiveTvSources(
      (tvSources.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
        channel_name: (l.live_tv_channels as { channel_name: string } | null)?.channel_name,
      })) as PendingLiveTVSource[],
    )
    setDigitalContents(
      (digital.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingDigitalContent[],
    )
    setDigitalLinks(
      (digitalDl.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
        content_title: (l.digital_content as { title: string } | null)?.title,
      })) as PendingDigitalLink[],
    )
    setLoading(false)
  }

  const handleAction = async (table: string, id: string, status: "approved" | "rejected") => {
    setProcessingIds((prev) => new Set([...prev, id]))
    const supabase = createClient()
    await supabase.from(table).update({ status }).eq("id", id)
    await loadPendingLinks()
    setProcessingIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  const approveAll = async (type: "streaming" | "download" | "livetv" | "tvsources" | "digital" | "digitallinks") => {
    const supabase = createClient()
    const table =
      type === "streaming"
        ? "streaming_links"
        : type === "download"
          ? "download_links"
          : type === "livetv"
            ? "live_tv_channels"
            : type === "tvsources"
              ? "live_tv_sources"
              : type === "digital"
                ? "digital_content"
                : "digital_download_links"
    await supabase.from(table).update({ status: "approved" }).eq("status", "pending")
    loadPendingLinks()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalPending =
    streamingLinks.length +
    downloadLinks.length +
    liveTvChannels.length +
    liveTvSources.length +
    digitalContents.length +
    digitalLinks.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Liens en attente
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{totalPending} lien(s) en attente de validation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Play className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{streamingLinks.length}</p>
                <p className="text-xs text-muted-foreground">Streaming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Download className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{downloadLinks.length}</p>
                <p className="text-xs text-muted-foreground">Download</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Tv className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{liveTvChannels.length}</p>
                <p className="text-xs text-muted-foreground">Chaines</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Link2 className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{liveTvSources.length}</p>
                <p className="text-xs text-muted-foreground">Sources TV</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{digitalContents.length}</p>
                <p className="text-xs text-muted-foreground">Digital</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <FileDown className="w-8 h-8 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{digitalLinks.length}</p>
                <p className="text-xs text-muted-foreground">Liens Digital</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalPending === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tout est valide!</h3>
            <p className="text-muted-foreground">Aucun lien en attente de validation</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="streaming" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="streaming" className="gap-2">
              <Play className="w-4 h-4" />
              Streaming
              {streamingLinks.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {streamingLinks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="download" className="gap-2">
              <Download className="w-4 h-4" />
              Download
              {downloadLinks.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {downloadLinks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="livetv" className="gap-2">
              <Tv className="w-4 h-4" />
              Chaines
              {liveTvChannels.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {liveTvChannels.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tvsources" className="gap-2">
              <Link2 className="w-4 h-4" />
              Sources
              {liveTvSources.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {liveTvSources.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="digital" className="gap-2">
              <Book className="w-4 h-4" />
              Digital
              {digitalContents.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {digitalContents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="digitallinks" className="gap-2">
              <FileDown className="w-4 h-4" />
              Liens Digital
              {digitalLinks.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {digitalLinks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Streaming Links */}
          <TabsContent value="streaming" className="mt-0 space-y-4">
            {streamingLinks.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => approveAll("streaming")} variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Tout approuver ({streamingLinks.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {streamingLinks.map((link) => (
                <Card key={link.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{link.source_name}</h3>
                          <Badge variant="outline">{link.media_type}</Badge>
                          <Badge className="bg-primary/20 text-primary border-primary/30">{link.quality}</Badge>
                          <Badge variant="secondary">{link.language}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WW ID: <span className="font-mono text-primary">{link.ww_id}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[300px]">{link.source_url}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {link.submitter_email || "Inconnu"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(link.created_at).toLocaleString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAction("streaming_links", link.id, "approved")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={processingIds.has(link.id)}
                        >
                          {processingIds.has(link.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </Button>
                        <Button
                          onClick={() => handleAction("streaming_links", link.id, "rejected")}
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          disabled={processingIds.has(link.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {streamingLinks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun lien streaming en attente</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Download Links */}
          <TabsContent value="download" className="mt-0 space-y-4">
            {downloadLinks.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => approveAll("download")} variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Tout approuver ({downloadLinks.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {downloadLinks.map((link) => (
                <Card key={link.id} className="hover:border-blue-500/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{link.source_name}</h3>
                          <Badge variant="outline">{link.media_type}</Badge>
                          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">{link.link_type}</Badge>
                          <Badge variant="secondary">{link.quality}</Badge>
                          {link.file_size && <span className="text-xs text-muted-foreground">{link.file_size}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WW ID: <span className="font-mono text-primary">{link.ww_id}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {link.submitter_email || "Inconnu"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(link.created_at).toLocaleString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAction("download_links", link.id, "approved")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={processingIds.has(link.id)}
                        >
                          {processingIds.has(link.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </Button>
                        <Button
                          onClick={() => handleAction("download_links", link.id, "rejected")}
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          disabled={processingIds.has(link.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {downloadLinks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun lien download en attente</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Live TV Channels */}
          <TabsContent value="livetv" className="mt-0 space-y-4">
            {liveTvChannels.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => approveAll("livetv")} variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Tout approuver ({liveTvChannels.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {liveTvChannels.map((channel) => (
                <Card key={channel.id} className="hover:border-purple-500/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {channel.channel_logo ? (
                          <img
                            src={channel.channel_logo || "/placeholder.svg"}
                            alt={channel.channel_name}
                            className="w-12 h-12 object-contain rounded-lg bg-muted"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Tv className="w-6 h-6 text-purple-500" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{channel.channel_name}</h3>
                            <Badge variant="outline">{channel.category}</Badge>
                            <Badge variant="secondary">{channel.quality}</Badge>
                            <Badge variant="secondary" className="uppercase">
                              {channel.country}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[400px]">
                            {channel.stream_url}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {channel.submitter_email || "Inconnu"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(channel.created_at).toLocaleString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAction("live_tv_channels", channel.id, "approved")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={processingIds.has(channel.id)}
                        >
                          {processingIds.has(channel.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </Button>
                        <Button
                          onClick={() => handleAction("live_tv_channels", channel.id, "rejected")}
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          disabled={processingIds.has(channel.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {liveTvChannels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tv className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune chaine TV en attente</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TV Sources */}
          <TabsContent value="tvsources" className="mt-0 space-y-4">
            {liveTvSources.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => approveAll("tvsources")} variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Tout approuver ({liveTvSources.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {liveTvSources.map((source) => (
                <Card key={source.id} className="hover:border-orange-500/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <Link2 className="w-6 h-6 text-orange-500" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{source.source_name}</h3>
                            <Badge variant="secondary">{source.quality}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Chaine: {source.channel_name || "Inconnue"}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {source.submitter_email || "Inconnu"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(source.created_at).toLocaleString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAction("live_tv_sources", source.id, "approved")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={processingIds.has(source.id)}
                        >
                          {processingIds.has(source.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </Button>
                        <Button
                          onClick={() => handleAction("live_tv_sources", source.id, "rejected")}
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          disabled={processingIds.has(source.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {liveTvSources.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune source TV en attente</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Digital Content */}
          <TabsContent value="digital" className="mt-0 space-y-4">
            {digitalContents.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => approveAll("digital")} variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Tout approuver ({digitalContents.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {digitalContents.map((content) => (
                <Card key={content.id} className="hover:border-amber-500/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {content.cover_url ? (
                          <img
                            src={content.cover_url || "/placeholder.svg"}
                            alt={content.title}
                            className="w-12 h-16 object-cover rounded-lg bg-muted"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <Book className="w-6 h-6 text-amber-500" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{content.title}</h3>
                            <Badge variant="outline" className="capitalize">
                              {content.content_type}
                            </Badge>
                            {content.author && (
                              <span className="text-xs text-muted-foreground">par {content.author}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            WW ID: <span className="font-mono text-primary">{content.ww_id}</span>
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {content.submitter_email || "Inconnu"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(content.created_at).toLocaleString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAction("digital_content", content.id, "approved")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={processingIds.has(content.id)}
                        >
                          {processingIds.has(content.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </Button>
                        <Button
                          onClick={() => handleAction("digital_content", content.id, "rejected")}
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          disabled={processingIds.has(content.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {digitalContents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun contenu digital en attente</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Digital Links */}
          <TabsContent value="digitallinks" className="mt-0 space-y-4">
            {digitalLinks.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => approveAll("digitallinks")} variant="outline" size="sm" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Tout approuver ({digitalLinks.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {digitalLinks.map((link) => (
                <Card key={link.id} className="hover:border-pink-500/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{link.source_name}</h3>
                          <Badge variant="outline">{link.content_title || "Digital"}</Badge>
                          <Badge className="bg-pink-500/20 text-pink-500 border-pink-500/30">{link.link_type}</Badge>
                          {link.quality && <Badge variant="secondary">{link.quality}</Badge>}
                          {link.file_size && <span className="text-xs text-muted-foreground">{link.file_size}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WW ID: <span className="font-mono text-primary">{link.ww_id}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[300px]">{link.source_url}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {link.submitter_email || "Inconnu"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(link.created_at).toLocaleString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAction("digital_download_links", link.id, "approved")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={processingIds.has(link.id)}
                        >
                          {processingIds.has(link.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </Button>
                        <Button
                          onClick={() => handleAction("digital_download_links", link.id, "rejected")}
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          disabled={processingIds.has(link.id)}
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {digitalLinks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun lien digital en attente</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
