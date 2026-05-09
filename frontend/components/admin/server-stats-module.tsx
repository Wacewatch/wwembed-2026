"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Cpu, HardDrive, MemoryStick, Activity, Server, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServerStats {
  cpu: {
    usage: number
    cores: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  uptime: number
  platform: string
  nodeVersion: string
}

export function ServerStatsModule() {
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/server-stats")
      if (!res.ok) throw new Error("Failed to fetch stats")
      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError("Impossible de récupérer les stats serveur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}j ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return "text-green-400"
    if (percentage < 80) return "text-amber-400"
    return "text-red-400"
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500"
    if (percentage < 80) return "bg-amber-500"
    return "bg-red-500"
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="py-6 text-center">
          <p className="text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStats} className="mt-2 bg-transparent">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-cyan-400">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Statistiques Serveur
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              En temps réel
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !stats ? (
          <div className="text-center py-4 text-muted-foreground">Chargement...</div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <div className={`text-2xl font-bold ${getUsageColor(stats.cpu.usage)}`}>
                {stats.cpu.usage.toFixed(1)}%
              </div>
              <Progress value={stats.cpu.usage} className="h-1.5 mt-2" />
              <div className="text-xs text-muted-foreground mt-1">{stats.cpu.cores} cœurs</div>
            </div>

            {/* Memory */}
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">Mémoire RAM</span>
              </div>
              <div className={`text-2xl font-bold ${getUsageColor(stats.memory.percentage)}`}>
                {stats.memory.percentage.toFixed(1)}%
              </div>
              <Progress value={stats.memory.percentage} className="h-1.5 mt-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
              </div>
            </div>

            {/* Disk */}
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Disque</span>
              </div>
              <div className={`text-2xl font-bold ${getUsageColor(stats.disk.percentage)}`}>
                {stats.disk.percentage.toFixed(1)}%
              </div>
              <Progress value={stats.disk.percentage} className="h-1.5 mt-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
              </div>
            </div>

            {/* Uptime & Info */}
            <div className="p-4 rounded-lg bg-background/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium">Système</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{formatUptime(stats.uptime)}</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <div>Plateforme: {stats.platform}</div>
                <div>Node: {stats.nodeVersion}</div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
