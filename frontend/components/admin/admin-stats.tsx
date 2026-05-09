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
  Megaphone,
  Book,
  Music,
  Monitor,
  Gamepad2,
  ArrowUpRight,
  Activity,
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
    totalEbooks?: number
    totalMusic?: number
    totalSoftware?: number
    totalGames?: number
    totalDigitalLinks?: number
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  gradient,
}: {
  icon: any
  label: string
  value: number
  color: string
  gradient: string
}) {
  return (
    <Card
      className={`relative overflow-hidden border-0 bg-gradient-to-br ${gradient} hover:scale-[1.02] transition-all duration-300 group`}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <CardContent className="pt-5 pb-4 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          </div>
          <div className={`p-2.5 rounded-xl bg-white/20 ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-white/60">
          <ArrowUpRight className="w-3 h-3" />
          <span>Actif</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminStats({ stats }: AdminStatsProps) {
  const totalDigital =
    (stats.totalEbooks || 0) + (stats.totalMusic || 0) + (stats.totalSoftware || 0) + (stats.totalGames || 0)
  const totalContent =
    stats.totalStreamingLinks + stats.totalDownloadLinks + (stats.totalLiveTvChannels || 0) + totalDigital

  return (
    <div className="space-y-6 mb-8">
      {/* Hero Stats Banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary via-cyan-500 to-blue-600">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <CardContent className="py-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Tableau de bord Admin</h2>
                <p className="text-white/80 mt-1">Gerez votre plateforme en temps reel</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{totalContent.toLocaleString()}</p>
                <p className="text-xs text-white/70 uppercase tracking-wider mt-1">Contenus</p>
              </div>
              <div className="text-center border-x border-white/20 px-4">
                <p className="text-3xl md:text-4xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-white/70 uppercase tracking-wider mt-1">Utilisateurs</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-white/70 uppercase tracking-wider mt-1">Vues</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Eye}
          label="Vues"
          value={stats.totalViews}
          color="text-white"
          gradient="from-violet-600 to-purple-600"
        />
        <StatCard
          icon={MousePointer}
          label="Clics"
          value={stats.totalClicks}
          color="text-white"
          gradient="from-blue-600 to-cyan-600"
        />
        <StatCard
          icon={Play}
          label="Streaming"
          value={stats.totalStreamingLinks}
          color="text-white"
          gradient="from-emerald-600 to-green-600"
        />
        <StatCard
          icon={Download}
          label="Download"
          value={stats.totalDownloadLinks}
          color="text-white"
          gradient="from-orange-600 to-amber-600"
        />
        <StatCard
          icon={Tv}
          label="TV Live"
          value={stats.totalLiveTvChannels || 0}
          color="text-white"
          gradient="from-red-600 to-rose-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border hover:border-primary/30 transition-colors">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover:border-cyan-500/30 transition-colors">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Settings className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalApis}</p>
                <p className="text-xs text-muted-foreground">APIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover:border-amber-500/30 transition-colors">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingLinks || 0}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover:border-emerald-500/30 transition-colors">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approvedLinks || 0}</p>
                <p className="text-xs text-muted-foreground">Approuves</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border hover:border-pink-500/30 transition-colors">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Megaphone className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAdClicks || 0}</p>
                <p className="text-xs text-muted-foreground">Clics pubs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Digital Content Stats */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Book className="w-5 h-5 text-amber-500" />
          Contenus Digitaux
          <span className="text-sm font-normal text-muted-foreground">({totalDigital} total)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-500/40 transition-colors">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20">
                  <Book className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{stats.totalEbooks || 0}</p>
                  <p className="text-xs text-muted-foreground">Ebooks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/5 border-pink-500/20 hover:border-pink-500/40 transition-colors">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-pink-500/20">
                  <Music className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-500">{stats.totalMusic || 0}</p>
                  <p className="text-xs text-muted-foreground">Musique</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20">
                  <Monitor className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-500">{stats.totalSoftware || 0}</p>
                  <p className="text-xs text-muted-foreground">Logiciels</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20 hover:border-orange-500/40 transition-colors">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/20">
                  <Gamepad2 className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-500">{stats.totalGames || 0}</p>
                  <p className="text-xs text-muted-foreground">Jeux</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
