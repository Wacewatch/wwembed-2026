"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddLinkModal } from "@/components/add-link-modal"
import { ProfileSettings } from "@/components/dashboard/profile-settings"
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
  Settings,
  ArrowUpCircle,
  Loader2,
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
  const [requestingUploader, setRequestingUploader] = useState(false)
  const [uploaderRequestResult, setUploaderRequestResult] = useState<{ success: boolean; message: string } | null>(null)

  const supabase = createClient()

  // Calculate conditions for uploader request
  const totalApprovedLinks =
    stats.verifiedStreaming + stats.verifiedDownload + stats.verifiedLiveTv + stats.verifiedDigital
  const accountAge = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const canRequestUploader = profile.role === "member" && totalApprovedLinks >= 500 && accountAge >= 30
  const showUploaderSection = profile.role === "member"

  async function handleRequestUploader() {
    setRequestingUploader(true)
    setUploaderRequestResult(null)

    try {
      // Check conditions again
      if (totalApprovedLinks < 500) {
        setUploaderRequestResult({
          success: false,
          message: `Vous avez ${totalApprovedLinks}/500 liens validés requis`,
        })
        setRequestingUploader(false)
        return
      }
      if (accountAge < 30) {
        setUploaderRequestResult({ success: false, message: `Votre compte a ${accountAge}/30 jours requis` })
        setRequestingUploader(false)
        return
      }

      // Update profile role
      const { error } = await supabase.from("profiles").update({ role: "uploader" }).eq("id", profile.id)

      if (error) throw error

      setUploaderRequestResult({ success: true, message: "Félicitations ! Vous êtes maintenant Uploader !" })
      setTimeout(() => window.location.reload(), 2000)
    } catch (err: any) {
      setUploaderRequestResult({ success: false, message: err.message || "Une erreur est survenue" })
    }

    setRequestingUploader(false)
  }

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

      {showUploaderSection && (
        <Card className={`border-2 ${canRequestUploader ? "border-amber-500/50 bg-amber-500/5" : "border-border"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className={`w-5 h-5 ${canRequestUploader ? "text-amber-500" : "text-muted-foreground"}`} />
              Devenir Uploader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Remplissez les conditions suivantes pour obtenir le grade Uploader et débloquer des fonctionnalités
              avancées.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div
                className={`p-4 rounded-lg border ${totalApprovedLinks >= 500 ? "border-green-500/50 bg-green-500/10" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Liens validés</span>
                  {totalApprovedLinks >= 500 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`text-2xl font-bold mt-1 ${totalApprovedLinks >= 500 ? "text-green-500" : "text-foreground"}`}
                >
                  {totalApprovedLinks} / 500
                </div>
                <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${totalApprovedLinks >= 500 ? "bg-green-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (totalApprovedLinks / 500) * 100)}%` }}
                  />
                </div>
              </div>
              <div
                className={`p-4 rounded-lg border ${accountAge >= 30 ? "border-green-500/50 bg-green-500/10" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ancienneté du compte</span>
                  {accountAge >= 30 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className={`text-2xl font-bold mt-1 ${accountAge >= 30 ? "text-green-500" : "text-foreground"}`}>
                  {accountAge} / 30 jours
                </div>
                <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${accountAge >= 30 ? "bg-green-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (accountAge / 30) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleRequestUploader}
              disabled={!canRequestUploader || requestingUploader}
              className={canRequestUploader ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              {requestingUploader ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Demander le grade Uploader
                </>
              )}
            </Button>
            {uploaderRequestResult && (
              <p className={`mt-3 text-sm ${uploaderRequestResult.success ? "text-green-500" : "text-red-500"}`}>
                {uploaderRequestResult.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Links Tables */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Mes liens soumis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="streaming" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="streaming" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Streaming</span>
              </TabsTrigger>
              <TabsTrigger value="download" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </TabsTrigger>
              <TabsTrigger value="livetv" className="flex items-center gap-2">
                <Tv className="h-4 w-4" />
                <span className="hidden sm:inline">Live TV</span>
              </TabsTrigger>
              <TabsTrigger value="digital" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                <span className="hidden sm:inline">Digital</span>
              </TabsTrigger>
              <TabsTrigger value="add" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
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

            <TabsContent value="add">
              <div className="py-8 text-center">
                <AddLinkModal onSuccess={() => window.location.reload()} />
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="py-4">
                <ProfileSettings userId={profile.id} username={profile.username || ""} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
