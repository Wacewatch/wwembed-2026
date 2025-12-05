import { Card, CardContent } from "@/components/ui/card"
import {
  Eye,
  MousePointer,
  Play,
  Download,
  Users,
  Settings,
  Tv,
  Clock,
  CheckCircle,
  TrendingUp,
  Megaphone,
} from "lucide-react"

interface AdminStatsProps {
  stats: {
    totalViews: number
    totalClicks: number
    totalStreamingLinks: number
    totalDownloadLinks: number
    totalUsers: number
    totalApis: number
    totalLiveTvChannels?: number
    pendingLinks?: number
    approvedLinks?: number
    totalAdClicks?: number
  }
}

export function AdminStats({ stats }: AdminStatsProps) {
  const statCards = [
    {
      label: "Vues Totales",
      value: stats.totalViews,
      icon: Eye,
      color: "text-primary",
      bgColor: "from-primary/10 to-primary/5",
    },
    {
      label: "Clics Totaux",
      value: stats.totalClicks,
      icon: MousePointer,
      color: "text-blue-500",
      bgColor: "from-blue-500/10 to-blue-500/5",
    },
    {
      label: "Liens Streaming",
      value: stats.totalStreamingLinks,
      icon: Play,
      color: "text-green-500",
      bgColor: "from-green-500/10 to-green-500/5",
    },
    {
      label: "Liens Download",
      value: stats.totalDownloadLinks,
      icon: Download,
      color: "text-purple-500",
      bgColor: "from-purple-500/10 to-purple-500/5",
    },
    {
      label: "Chaînes TV",
      value: stats.totalLiveTvChannels || 0,
      icon: Tv,
      color: "text-red-500",
      bgColor: "from-red-500/10 to-red-500/5",
    },
    {
      label: "Utilisateurs",
      value: stats.totalUsers,
      icon: Users,
      color: "text-orange-500",
      bgColor: "from-orange-500/10 to-orange-500/5",
    },
    {
      label: "APIs Configurées",
      value: stats.totalApis,
      icon: Settings,
      color: "text-cyan-500",
      bgColor: "from-cyan-500/10 to-cyan-500/5",
    },
    {
      label: "En Attente",
      value: stats.pendingLinks || 0,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "from-yellow-500/10 to-yellow-500/5",
    },
    {
      label: "Approuvés",
      value: stats.approvedLinks || 0,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "from-emerald-500/10 to-emerald-500/5",
    },
    {
      label: "Clics Pubs",
      value: stats.totalAdClicks || 0,
      icon: Megaphone,
      color: "text-pink-500",
      bgColor: "from-pink-500/10 to-pink-500/5",
    },
  ]

  return (
    <div className="space-y-6 mb-8">
      <Card className="bg-gradient-to-r from-primary/20 via-teal-500/10 to-primary/5 border-primary/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-12 h-12 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Tableau de bord Admin</h2>
              <p className="text-muted-foreground">
                {stats.totalStreamingLinks + stats.totalDownloadLinks + (stats.totalLiveTvChannels || 0)} liens actifs •
                {stats.totalUsers} utilisateurs •{stats.totalViews.toLocaleString()} vues totales
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className={`bg-gradient-to-br ${stat.bgColor} border-border hover:shadow-lg transition-shadow`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Icon className={`w-8 h-8 ${stat.color} mb-2`} />
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
