"use client"

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

function GlassStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass border border-white/5 hover:border-primary/30 transition-all p-5">
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ background: accent }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</p>
          <p className="text-3xl font-black mt-2 tabular-nums">{value.toLocaleString()}</p>
        </div>
        <div
          className="w-11 h-11 rounded-xl grid place-items-center ring-1 ring-white/10"
          style={{ background: accent }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function GlassMini({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: number
  color: string
}) {
  return (
    <div className="glass-subtle rounded-xl p-4 border border-white/5 hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg grid place-items-center bg-white/5 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

export function AdminStats({ stats }: AdminStatsProps) {
  const totalDigital =
    (stats.totalEbooks || 0) + (stats.totalMusic || 0) + (stats.totalSoftware || 0) + (stats.totalGames || 0)
  const totalContent =
    stats.totalStreamingLinks + stats.totalDownloadLinks + (stats.totalLiveTvChannels || 0) + totalDigital

  return (
    <div className="space-y-6 mb-8">
      {/* Hero glass banner */}
      <div className="relative overflow-hidden rounded-2xl glass-strong ring-glow">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 grid place-items-center ring-1 ring-primary/30">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Tableau de bord Admin</h2>
              <p className="text-sm text-muted-foreground mt-1">Pilotez WWEmbed en temps réel</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-gradient-primary tabular-nums">
                {totalContent.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-1">Contenus</p>
            </div>
            <div className="text-center border-x border-white/10 px-4">
              <p className="text-3xl md:text-4xl font-black text-gradient-primary tabular-nums">
                {stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-1">
                Utilisateurs
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black text-gradient-primary tabular-nums">
                {stats.totalViews.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-1">Vues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main stats — glass with subtle accent halos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <GlassStat icon={Eye} label="Vues" value={stats.totalViews} accent="oklch(0.65 0.22 295)" />
        <GlassStat icon={MousePointer} label="Clics" value={stats.totalClicks} accent="oklch(0.7 0.18 220)" />
        <GlassStat icon={Play} label="Streaming" value={stats.totalStreamingLinks} accent="oklch(0.7 0.2 145)" />
        <GlassStat icon={Download} label="Download" value={stats.totalDownloadLinks} accent="oklch(0.74 0.2 50)" />
        <GlassStat icon={Tv} label="TV Live" value={stats.totalLiveTvChannels || 0} accent="oklch(0.65 0.24 25)" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <GlassMini icon={Users} label="Utilisateurs" value={stats.totalUsers} color="text-primary" />
        <GlassMini icon={Settings} label="APIs" value={stats.totalApis} color="text-cyan-400" />
        <GlassMini icon={Clock} label="En attente" value={stats.pendingLinks || 0} color="text-amber-400" />
        <GlassMini icon={CheckCircle} label="Approuvés" value={stats.approvedLinks || 0} color="text-emerald-400" />
        <GlassMini icon={Megaphone} label="Clics pubs" value={stats.totalAdClicks || 0} color="text-pink-400" />
      </div>

      {/* Digital content */}
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground mb-3 flex items-center gap-2 uppercase">
          <Book className="w-4 h-4 text-primary" />
          Contenus Digitaux
          <span className="text-xs font-normal normal-case text-muted-foreground/60">({totalDigital} total)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <GlassMini icon={Book} label="Ebooks" value={stats.totalEbooks || 0} color="text-amber-400" />
          <GlassMini icon={Music} label="Musique" value={stats.totalMusic || 0} color="text-pink-400" />
          <GlassMini icon={Monitor} label="Logiciels" value={stats.totalSoftware || 0} color="text-cyan-400" />
          <GlassMini icon={Gamepad2} label="Jeux" value={stats.totalGames || 0} color="text-orange-400" />
        </div>
      </div>
    </div>
  )
}
