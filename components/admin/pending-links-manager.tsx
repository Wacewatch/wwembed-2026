"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tv } from "lucide-react"
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

export function PendingLinksManager() {
  const [streamingLinks, setStreamingLinks] = useState<PendingLink[]>([])
  const [downloadLinks, setDownloadLinks] = useState<PendingDownloadLink[]>([])
  const [liveTvChannels, setLiveTvChannels] = useState<PendingLiveTVChannel[]>([])
  const [liveTvSources, setLiveTvSources] = useState<PendingLiveTVSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingLinks()
  }, [])

  const loadPendingLinks = async () => {
    const supabase = createClient()

    // Load pending streaming links with submitter info
    const { data: streaming } = await supabase
      .from("streaming_links")
      .select("*, profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    // Load pending download links with submitter info
    const { data: download } = await supabase
      .from("download_links")
      .select("*, profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    const { data: livetv } = await supabase
      .from("live_tv_channels")
      .select("*, profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    const { data: tvSources } = await supabase
      .from("live_tv_sources")
      .select("*, profiles(email), live_tv_channels(channel_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    setStreamingLinks(
      (streaming || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingLink[],
    )
    setDownloadLinks(
      (download || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingDownloadLink[],
    )
    setLiveTvChannels(
      (livetv || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
      })) as PendingLiveTVChannel[],
    )
    setLiveTvSources(
      (tvSources || []).map((l: Record<string, unknown>) => ({
        ...l,
        submitter_email: (l.profiles as { email: string } | null)?.email,
        channel_name: (l.live_tv_channels as { channel_name: string } | null)?.channel_name,
      })) as PendingLiveTVSource[],
    )
    setLoading(false)
  }

  const approveStreamingLink = async (id: string) => {
    const supabase = createClient()
    await supabase.from("streaming_links").update({ status: "approved" }).eq("id", id)
    loadPendingLinks()
  }

  const rejectStreamingLink = async (id: string) => {
    const supabase = createClient()
    await supabase.from("streaming_links").update({ status: "rejected" }).eq("id", id)
    loadPendingLinks()
  }

  const approveDownloadLink = async (id: string) => {
    const supabase = createClient()
    await supabase.from("download_links").update({ status: "approved" }).eq("id", id)
    loadPendingLinks()
  }

  const rejectDownloadLink = async (id: string) => {
    const supabase = createClient()
    await supabase.from("download_links").update({ status: "rejected" }).eq("id", id)
    loadPendingLinks()
  }

  const approveLiveTvChannel = async (id: string) => {
    const supabase = createClient()
    await supabase.from("live_tv_channels").update({ status: "approved" }).eq("id", id)
    loadPendingLinks()
  }

  const rejectLiveTvChannel = async (id: string) => {
    const supabase = createClient()
    await supabase.from("live_tv_channels").update({ status: "rejected" }).eq("id", id)
    loadPendingLinks()
  }

  const approveLiveTvSource = async (id: string) => {
    const supabase = createClient()
    await supabase.from("live_tv_sources").update({ status: "approved" }).eq("id", id)
    loadPendingLinks()
  }

  const rejectLiveTvSource = async (id: string) => {
    const supabase = createClient()
    await supabase.from("live_tv_sources").update({ status: "rejected" }).eq("id", id)
    loadPendingLinks()
  }

  const approveAll = async (type: "streaming" | "download" | "livetv" | "tvsources") => {
    const supabase = createClient()
    const table =
      type === "streaming"
        ? "streaming_links"
        : type === "download"
          ? "download_links"
          : type === "livetv"
            ? "live_tv_channels"
            : "live_tv_sources"
    await supabase.from(table).update({ status: "approved" }).eq("status", "pending")
    loadPendingLinks()
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>
  }

  const totalPending = streamingLinks.length + downloadLinks.length + liveTvChannels.length + liveTvSources.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Liens en attente de validation</h2>
          <p className="text-sm text-muted-foreground mt-1">{totalPending} lien(s) en attente de validation</p>
        </div>
      </div>

      {totalPending === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun lien en attente de validation</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="streaming">
          <TabsList className="mb-4">
            <TabsTrigger value="streaming">Streaming ({streamingLinks.length})</TabsTrigger>
            <TabsTrigger value="download">Telechargement ({downloadLinks.length})</TabsTrigger>
            <TabsTrigger value="livetv">Chaines TV ({liveTvChannels.length})</TabsTrigger>
            <TabsTrigger value="tvsources">Sources TV ({liveTvSources.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="streaming">
            {streamingLinks.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => approveAll("streaming")} variant="outline" size="sm">
                  Tout approuver ({streamingLinks.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {streamingLinks.map((link) => (
                <Card key={link.id} className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground">{link.source_name}</h3>
                          <Badge variant="outline">{link.media_type}</Badge>
                          <Badge variant="secondary">{link.quality}</Badge>
                          <Badge variant="secondary">{link.language}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WW ID: <span className="font-mono text-primary">{link.ww_id}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-xl">{link.source_url}</p>
                        <p className="text-xs text-muted-foreground">
                          Soumis par: {link.submitter_email || "Inconnu"} -{" "}
                          {new Date(link.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => approveStreamingLink(link.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approuver
                        </Button>
                        <Button onClick={() => rejectStreamingLink(link.id)} variant="destructive" size="sm">
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="download">
            {downloadLinks.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => approveAll("download")} variant="outline" size="sm">
                  Tout approuver ({downloadLinks.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {downloadLinks.map((link) => (
                <Card key={link.id} className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground">{link.source_name}</h3>
                          <Badge variant="outline">{link.media_type}</Badge>
                          <Badge variant="secondary">{link.link_type}</Badge>
                          <Badge variant="secondary">{link.quality}</Badge>
                          {link.file_size && <span className="text-xs text-muted-foreground">{link.file_size}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WW ID: <span className="font-mono text-primary">{link.ww_id}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-xl">{link.source_url}</p>
                        <p className="text-xs text-muted-foreground">
                          Soumis par: {link.submitter_email || "Inconnu"} -{" "}
                          {new Date(link.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => approveDownloadLink(link.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approuver
                        </Button>
                        <Button onClick={() => rejectDownloadLink(link.id)} variant="destructive" size="sm">
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="livetv">
            {liveTvChannels.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => approveAll("livetv")} variant="outline" size="sm">
                  Tout approuver ({liveTvChannels.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {liveTvChannels.map((channel) => (
                <Card key={channel.id} className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-foreground">{channel.channel_name}</h3>
                              <Badge variant="outline">{channel.category}</Badge>
                              <Badge variant="secondary">{channel.quality}</Badge>
                              <Badge variant="secondary" className="uppercase">
                                {channel.country}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-xl mt-1">
                              {channel.stream_url}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Soumis par: {channel.submitter_email || "Inconnu"} -{" "}
                          {new Date(channel.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => approveLiveTvChannel(channel.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approuver
                        </Button>
                        <Button onClick={() => rejectLiveTvChannel(channel.id)} variant="destructive" size="sm">
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tvsources">
            {liveTvSources.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => approveAll("tvsources")} variant="outline" size="sm">
                  Tout approuver ({liveTvSources.length})
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {liveTvSources.map((source) => (
                <Card key={source.id} className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center">
                            <Tv className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-foreground">{source.source_name}</h3>
                              <Badge variant="outline">{source.quality}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Chaine: {source.channel_name || "Inconnue"}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-xl mt-1">
                              {source.stream_url}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Soumis par: {source.submitter_email || "Inconnu"} -{" "}
                          {new Date(source.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => approveLiveTvSource(source.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approuver
                        </Button>
                        <Button onClick={() => rejectLiveTvSource(source.id)} variant="destructive" size="sm">
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
