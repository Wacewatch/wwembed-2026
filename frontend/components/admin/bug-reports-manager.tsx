"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle, XCircle, Clock, Loader2, ExternalLink, Bug } from "lucide-react"

interface BugReport {
  id: string
  ww_id: string
  media_type: string
  tmdb_id: number
  season_number: number | null
  episode_number: number | null
  title: string
  source_name: string
  source_url: string
  message: string
  status: "pending" | "fixed" | "impossible"
  embed_type: string
  created_at: string
  admin_note: string | null
}

export function BugReportsManager() {
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
  const [updating, setUpdating] = useState(false)
  const [adminNote, setAdminNote] = useState("")

  useEffect(() => {
    fetchReports()
  }, [filter])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bug-reports?status=${filter}`)
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching reports:", error)
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(true)
    try {
      await fetch("/api/bug-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote }),
      })
      await fetchReports()
      setSelectedReport(null)
      setAdminNote("")
    } catch (error) {
      console.error("Error updating report:", error)
    }
    setUpdating(false)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "fixed":
        return (
          <Badge className="bg-green-500/20 text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Corrige
          </Badge>
        )
      case "impossible":
        return (
          <Badge className="bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Impossible
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        )
    }
  }

  const totalCount = reports.length
  const pendingCount = reports.filter((r) => r.status === "pending").length
  const fixedCount = reports.filter((r) => r.status === "fixed").length
  const impossibleCount = reports.filter((r) => r.status === "impossible").length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bug className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-500">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total rapports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{fixedCount}</p>
                <p className="text-xs text-muted-foreground">Corriges</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{impossibleCount}</p>
                <p className="text-xs text-muted-foreground">Impossible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-500" />
              Rapports de bugs
            </CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="fixed">Corriges</SelectItem>
                <SelectItem value="impossible">Impossible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun rapport de bug</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">WW ID</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Titre</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Source</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Message</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Statut</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-xs text-primary">{report.ww_id}</td>
                      <td className="py-3 px-2 max-w-[150px] truncate">{report.title || "-"}</td>
                      <td className="py-3 px-2">{report.source_name || "-"}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{report.embed_type}</Badge>
                      </td>
                      <td className="py-3 px-2 max-w-[200px] truncate">{report.message}</td>
                      <td className="py-3 px-2">{getStatusBadge(report.status)}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">
                        {new Date(report.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}{" "}
                        <span className="text-muted-foreground/60">
                          {new Date(report.created_at).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report)
                            setAdminNote(report.admin_note || "")
                          }}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Details du rapport
                </DialogTitle>
              </DialogHeader>
              {selectedReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">WW ID</p>
                      <p className="font-mono text-primary">{selectedReport.ww_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge variant="outline">{selectedReport.embed_type}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Titre</p>
                      <p>{selectedReport.title || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p>{selectedReport.source_name || "-"}</p>
                    </div>
                    {selectedReport.source_url && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">URL Source</p>
                        <a
                          href={selectedReport.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {selectedReport.source_url.substring(0, 50)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message du signalement</p>
                    <div className="bg-muted p-3 rounded-lg">
                      <p>{selectedReport.message}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Note admin</p>
                    <Textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Ajouter une note..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => updateStatus(selectedReport.id, "fixed")}
                      disabled={updating}
                      className="bg-green-500 hover:bg-green-600 flex-1"
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Marquer Corrige
                    </Button>
                    <Button
                      onClick={() => updateStatus(selectedReport.id, "impossible")}
                      disabled={updating}
                      variant="destructive"
                      className="flex-1"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Impossible
                    </Button>
                    <Button
                      onClick={() => updateStatus(selectedReport.id, "pending")}
                      disabled={updating}
                      variant="outline"
                      className="flex-1"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                      En attente
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
