"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AddLinkModal } from "@/components/add-link-modal"
import {
  Play,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Eye,
  Tv,
  Book,
  Music,
  Gamepad2,
  Package,
} from "lucide-react"
import type {
  Profile,
  StreamingLink,
  DownloadLink,
  LiveTVChannel,
  LiveTVSource,
  DigitalContent,
  DigitalDownloadLink,
} from "@/lib/types"

interface StreamingLinkWithViews extends StreamingLink {
  view_count: number
}

interface DownloadLinkWithViews extends DownloadLink {
  view_count: number
}

interface DigitalContentWithViews extends DigitalContent {
  view_count: number
}

interface DashboardContentProps {
  profile: Profile
  streamingLinks: StreamingLinkWithViews[]
  downloadLinks: DownloadLinkWithViews[]
  liveTvChannels: LiveTVChannel[]
  liveTvSources: LiveTVSource[]
  digitalContents: DigitalContentWithViews[]
  digitalLinks: DigitalDownloadLink[]
  stats: {
    totalStreaming: number
    totalDownload: number
    totalLiveTv: number
    totalDigital: number
    verifiedStreaming: number
    verifiedDownload: number
    verifiedLiveTv: number
    verifiedDigital: number
    pendingCount: number
    rejectedCount: number
    totalViews: number
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500/20 text-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approuve
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-500">
          <Clock className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-500">
          <XCircle className="w-3 h-3 mr-1" />
          Rejete
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getDigitalTypeIcon(type: string) {
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

export function DashboardContent({
  profile,
  streamingLinks,
  downloadLinks,
  liveTvChannels,
  liveTvSources,
  digitalContents,
  digitalLinks,
  stats,
}: DashboardContentProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenue, <span className="text-primary">{profile.username || profile.email}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Role:{" "}
            <Badge variant="outline" className="ml-1">
              {profile.role === "admin" ? "Administrateur" : profile.role === "uploader" ? "Uploader" : "Membre"}
            </Badge>
          </p>
        </div>
        <AddLinkModal
          onSuccess={() => window.location.reload()}
          buttonClassName="bg-gradient-to-r from-primary to-teal-400 hover:from-primary/90 hover:to-teal-400/90"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Play className="w-8 h-8 text-primary mb-2" />
              <p className="text-2xl font-bold text-primary">{stats.totalStreaming}</p>
              <p className="text-xs text-muted-foreground">Streaming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Download className="w-8 h-8 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-blue-500">{stats.totalDownload}</p>
              <p className="text-xs text-muted-foreground">Telechargement</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Tv className="w-8 h-8 text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-purple-500">{stats.totalLiveTv}</p>
              <p className="text-xs text-muted-foreground">TV Live</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Book className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-amber-500">{stats.totalDigital}</p>
              <p className="text-xs text-muted-foreground">Digital</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-500">
                {stats.verifiedStreaming + stats.verifiedDownload + stats.verifiedLiveTv + stats.verifiedDigital}
              </p>
              <p className="text-xs text-muted-foreground">Approuves</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Clock className="w-8 h-8 text-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-yellow-500">{stats.pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Eye className="w-8 h-8 text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-orange-500">{stats.totalViews}</p>
              <p className="text-xs text-muted-foreground">Vues totales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-teal-500/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-10 h-10 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">Resume de votre activite</p>
              <p className="text-sm text-muted-foreground">
                Vous avez soumis {stats.totalStreaming + stats.totalDownload + stats.totalLiveTv + stats.totalDigital}{" "}
                liens au total.{" "}
                {stats.pendingCount > 0 && (
                  <span className="text-yellow-500">{stats.pendingCount} en attente de validation.</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links Tables */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Mes liens soumis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="streaming">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="streaming">
                <Play className="w-4 h-4 mr-2" />
                Streaming ({streamingLinks.length})
              </TabsTrigger>
              <TabsTrigger value="download">
                <Download className="w-4 h-4 mr-2" />
                Telechargement ({downloadLinks.length})
              </TabsTrigger>
              <TabsTrigger value="digital">
                <Book className="w-4 h-4 mr-2" />
                Digital ({digitalContents.length})
              </TabsTrigger>
              <TabsTrigger value="livetv">
                <Tv className="w-4 h-4 mr-2" />
                TV Live ({liveTvChannels.length + liveTvSources.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="streaming">
              {streamingLinks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun lien streaming soumis</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">WW ID</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Source</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Qualite</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Langue</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Statut</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vues</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streamingLinks.map((link) => (
                        <tr key={link.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2 font-mono text-xs text-primary">{link.ww_id}</td>
                          <td className="py-3 px-2">{link.source_name}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{link.quality}</Badge>
                          </td>
                          <td className="py-3 px-2">{link.language}</td>
                          <td className="py-3 px-2">{getStatusBadge(link.status)}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Eye className="w-3 h-3" />
                              <span>{link.view_count}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {new Date(link.created_at).toLocaleDateString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="download">
              {downloadLinks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun lien telechargement soumis</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">WW ID</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Source</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Qualite</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Statut</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vues</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloadLinks.map((link) => (
                        <tr key={link.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2 font-mono text-xs text-primary">{link.ww_id}</td>
                          <td className="py-3 px-2">{link.source_name}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{link.link_type}</Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{link.quality}</Badge>
                          </td>
                          <td className="py-3 px-2">{getStatusBadge(link.status)}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Eye className="w-3 h-3" />
                              <span>{link.view_count}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {new Date(link.created_at).toLocaleDateString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="digital">
              {digitalContents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun contenu digital soumis</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Titre</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">WW ID</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Statut</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vues</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {digitalContents.map((content) => (
                        <tr key={content.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {content.cover_url && (
                                <img
                                  src={content.cover_url || "/placeholder.svg"}
                                  alt={content.title}
                                  className="w-8 h-10 object-cover rounded"
                                />
                              )}
                              <span className="font-medium">{content.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {getDigitalTypeIcon(content.content_type)}
                              {content.content_type}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 font-mono text-xs text-primary">{content.ww_id}</td>
                          <td className="py-3 px-2">{getStatusBadge(content.status)}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Eye className="w-3 h-3" />
                              <span>{content.view_count}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="livetv">
              {liveTvChannels.length === 0 && liveTvSources.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucune chaine ou source TV soumise</p>
              ) : (
                <div className="space-y-6">
                  {liveTvChannels.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Chaines creees</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Chaine</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Categorie</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Pays</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveTvChannels.map((channel) => (
                              <tr key={channel.id} className="border-b border-border/50 hover:bg-muted/50">
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {channel.channel_logo && (
                                      <img
                                        src={channel.channel_logo || "/placeholder.svg"}
                                        alt={channel.channel_name}
                                        className="w-8 h-8 object-contain"
                                      />
                                    )}
                                    <span className="font-medium">{channel.channel_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2">{channel.category}</td>
                                <td className="py-3 px-2">{channel.country}</td>
                                <td className="py-3 px-2">
                                  <Badge variant="outline">{channel.quality}</Badge>
                                </td>
                                <td className="py-3 px-2">{getStatusBadge(channel.status)}</td>
                                <td className="py-3 px-2 text-muted-foreground">
                                  {new Date(channel.created_at).toLocaleDateString("fr-FR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {liveTvSources.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Sources ajoutees</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Source</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Qualite</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Statut</th>
                              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {liveTvSources.map((source) => (
                              <tr key={source.id} className="border-b border-border/50 hover:bg-muted/50">
                                <td className="py-3 px-2 font-medium">{source.source_name}</td>
                                <td className="py-3 px-2">
                                  <Badge variant="outline">{source.quality}</Badge>
                                </td>
                                <td className="py-3 px-2">{getStatusBadge(source.status)}</td>
                                <td className="py-3 px-2 text-muted-foreground">
                                  {new Date(source.created_at).toLocaleDateString("fr-FR")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
