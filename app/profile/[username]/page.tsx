import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ProfileLinkButton } from "@/components/profile-link-button"

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

const themeConfigs: Record<string, { bg: string; header: string; card: string; glow?: string }> = {
  dark: {
    bg: "from-slate-950 via-slate-900 to-slate-950",
    header: "bg-slate-900/50",
    card: "bg-slate-800/50 border-slate-700",
  },
  midnight: {
    bg: "from-slate-950 via-gray-950 to-slate-950",
    header: "bg-gray-900/50",
    card: "bg-gray-800/50 border-gray-700",
  },
  ocean: {
    bg: "from-blue-950 via-slate-900 to-blue-950",
    header: "bg-blue-900/50",
    card: "bg-blue-900/30 border-blue-700/50",
    glow: "shadow-blue-500/20",
  },
  forest: {
    bg: "from-emerald-950 via-slate-900 to-emerald-950",
    header: "bg-emerald-900/50",
    card: "bg-emerald-900/30 border-emerald-700/50",
    glow: "shadow-emerald-500/20",
  },
  sunset: {
    bg: "from-orange-950 via-slate-900 to-orange-950",
    header: "bg-orange-900/50",
    card: "bg-orange-900/30 border-orange-700/50",
    glow: "shadow-orange-500/20",
  },
  purple: {
    bg: "from-purple-950 via-slate-900 to-purple-950",
    header: "bg-purple-900/50",
    card: "bg-purple-900/30 border-purple-700/50",
    glow: "shadow-purple-500/20",
  },
  rose: {
    bg: "from-rose-950 via-slate-900 to-rose-950",
    header: "bg-rose-900/50",
    card: "bg-rose-900/30 border-rose-700/50",
    glow: "shadow-rose-500/20",
  },
  amber: {
    bg: "from-amber-950 via-slate-900 to-amber-950",
    header: "bg-amber-900/50",
    card: "bg-amber-900/30 border-amber-700/50",
    glow: "shadow-amber-500/20",
  },
  teal: {
    bg: "from-teal-950 via-slate-900 to-teal-950",
    header: "bg-teal-900/50",
    card: "bg-teal-900/30 border-teal-700/50",
    glow: "shadow-teal-500/20",
  },
  indigo: {
    bg: "from-indigo-950 via-slate-900 to-indigo-950",
    header: "bg-indigo-900/50",
    card: "bg-indigo-900/30 border-indigo-700/50",
    glow: "shadow-indigo-500/20",
  },
  zinc: {
    bg: "from-zinc-950 via-zinc-900 to-zinc-950",
    header: "bg-zinc-800/50",
    card: "bg-zinc-800/50 border-zinc-700",
  },
  neutral: {
    bg: "from-neutral-950 via-neutral-900 to-neutral-950",
    header: "bg-neutral-800/50",
    card: "bg-neutral-800/50 border-neutral-700",
  },
  stone: {
    bg: "from-stone-950 via-stone-900 to-stone-950",
    header: "bg-stone-800/50",
    card: "bg-stone-800/50 border-stone-700",
  },
  red: {
    bg: "from-red-950 via-slate-900 to-red-950",
    header: "bg-red-900/50",
    card: "bg-red-900/30 border-red-700/50",
    glow: "shadow-red-500/20",
  },
  lime: {
    bg: "from-lime-950 via-slate-900 to-lime-950",
    header: "bg-lime-900/50",
    card: "bg-lime-900/30 border-lime-700/50",
    glow: "shadow-lime-500/20",
  },
  sky: {
    bg: "from-sky-950 via-slate-900 to-sky-950",
    header: "bg-sky-900/50",
    card: "bg-sky-900/30 border-sky-700/50",
    glow: "shadow-sky-500/20",
  },
  fuchsia: {
    bg: "from-fuchsia-950 via-slate-900 to-fuchsia-950",
    header: "bg-fuchsia-900/50",
    card: "bg-fuchsia-900/30 border-fuchsia-700/50",
    glow: "shadow-fuchsia-500/20",
  },
  cyan: {
    bg: "from-cyan-950 via-slate-900 to-cyan-950",
    header: "bg-cyan-900/50",
    card: "bg-cyan-900/30 border-cyan-700/50",
    glow: "shadow-cyan-500/20",
  },
  "gradient-blue": {
    bg: "from-blue-950 via-indigo-950 to-blue-950",
    header: "bg-blue-900/50 backdrop-blur-xl",
    card: "bg-blue-900/30 border-blue-500/30",
    glow: "shadow-blue-500/30",
  },
  "gradient-purple": {
    bg: "from-purple-950 via-pink-950 to-purple-950",
    header: "bg-purple-900/50 backdrop-blur-xl",
    card: "bg-purple-900/30 border-purple-500/30",
    glow: "shadow-purple-500/30",
  },
  "gradient-green": {
    bg: "from-emerald-950 via-teal-950 to-emerald-950",
    header: "bg-emerald-900/50 backdrop-blur-xl",
    card: "bg-emerald-900/30 border-emerald-500/30",
    glow: "shadow-emerald-500/30",
  },
  "gradient-orange": {
    bg: "from-orange-950 via-red-950 to-orange-950",
    header: "bg-orange-900/50 backdrop-blur-xl",
    card: "bg-orange-900/30 border-orange-500/30",
    glow: "shadow-orange-500/30",
  },
  "gradient-cyan": {
    bg: "from-cyan-950 via-blue-950 to-cyan-950",
    header: "bg-cyan-900/50 backdrop-blur-xl",
    card: "bg-cyan-900/30 border-cyan-500/30",
    glow: "shadow-cyan-500/30",
  },
  "gradient-rose": {
    bg: "from-rose-950 via-purple-950 to-rose-950",
    header: "bg-rose-900/50 backdrop-blur-xl",
    card: "bg-rose-900/30 border-rose-500/30",
    glow: "shadow-rose-500/30",
  },
  "neon-blue": {
    bg: "from-black via-slate-950 to-black",
    header: "bg-blue-500/10 backdrop-blur-xl border-b border-blue-500/30",
    card: "bg-black/50 border-blue-500/50 shadow-lg shadow-blue-500/20",
    glow: "shadow-blue-500/50",
  },
  "neon-green": {
    bg: "from-black via-slate-950 to-black",
    header: "bg-green-500/10 backdrop-blur-xl border-b border-green-500/30",
    card: "bg-black/50 border-green-500/50 shadow-lg shadow-green-500/20",
    glow: "shadow-green-500/50",
  },
  "neon-pink": {
    bg: "from-black via-slate-950 to-black",
    header: "bg-pink-500/10 backdrop-blur-xl border-b border-pink-500/30",
    card: "bg-black/50 border-pink-500/50 shadow-lg shadow-pink-500/20",
    glow: "shadow-pink-500/50",
  },
  matrix: {
    bg: "from-black via-green-950/20 to-black",
    header: "bg-green-500/5 backdrop-blur-xl border-b border-green-500/20",
    card: "bg-black/80 border-green-500/30",
    glow: "shadow-green-500/30",
  },
  cyberpunk: {
    bg: "from-yellow-950/50 via-slate-950 to-pink-950/50",
    header: "bg-yellow-500/10 backdrop-blur-xl border-b border-yellow-500/30",
    card: "bg-black/50 border-yellow-500/30",
    glow: "shadow-yellow-500/30",
  },
  aurora: {
    bg: "from-green-950 via-blue-950 to-purple-950",
    header: "bg-green-500/10 backdrop-blur-xl",
    card: "bg-white/5 border-white/10 backdrop-blur-xl",
    glow: "shadow-green-500/20",
  },
}

const colorConfigs: Record<string, { primary: string; accent: string; button: string; ring: string; text: string }> = {
  cyan: {
    primary: "text-cyan-400",
    accent: "border-cyan-500/30",
    button: "bg-cyan-500 hover:bg-cyan-600",
    ring: "ring-cyan-500/50",
    text: "cyan",
  },
  blue: {
    primary: "text-blue-400",
    accent: "border-blue-500/30",
    button: "bg-blue-500 hover:bg-blue-600",
    ring: "ring-blue-500/50",
    text: "blue",
  },
  green: {
    primary: "text-green-400",
    accent: "border-green-500/30",
    button: "bg-green-500 hover:bg-green-600",
    ring: "ring-green-500/50",
    text: "green",
  },
  purple: {
    primary: "text-purple-400",
    accent: "border-purple-500/30",
    button: "bg-purple-500 hover:bg-purple-600",
    ring: "ring-purple-500/50",
    text: "purple",
  },
  pink: {
    primary: "text-pink-400",
    accent: "border-pink-500/30",
    button: "bg-pink-500 hover:bg-pink-600",
    ring: "ring-pink-500/50",
    text: "pink",
  },
  orange: {
    primary: "text-orange-400",
    accent: "border-orange-500/30",
    button: "bg-orange-500 hover:bg-orange-600",
    ring: "ring-orange-500/50",
    text: "orange",
  },
  red: {
    primary: "text-red-400",
    accent: "border-red-500/30",
    button: "bg-red-500 hover:bg-red-600",
    ring: "ring-red-500/50",
    text: "red",
  },
  yellow: {
    primary: "text-yellow-400",
    accent: "border-yellow-500/30",
    button: "bg-yellow-500 hover:bg-yellow-600",
    ring: "ring-yellow-500/50",
    text: "yellow",
  },
  emerald: {
    primary: "text-emerald-400",
    accent: "border-emerald-500/30",
    button: "bg-emerald-500 hover:bg-emerald-600",
    ring: "ring-emerald-500/50",
    text: "emerald",
  },
  teal: {
    primary: "text-teal-400",
    accent: "border-teal-500/30",
    button: "bg-teal-500 hover:bg-teal-600",
    ring: "ring-teal-500/50",
    text: "teal",
  },
  indigo: {
    primary: "text-indigo-400",
    accent: "border-indigo-500/30",
    button: "bg-indigo-500 hover:bg-indigo-600",
    ring: "ring-indigo-500/50",
    text: "indigo",
  },
  violet: {
    primary: "text-violet-400",
    accent: "border-violet-500/30",
    button: "bg-violet-500 hover:bg-violet-600",
    ring: "ring-violet-500/50",
    text: "violet",
  },
  fuchsia: {
    primary: "text-fuchsia-400",
    accent: "border-fuchsia-500/30",
    button: "bg-fuchsia-500 hover:bg-fuchsia-600",
    ring: "ring-fuchsia-500/50",
    text: "fuchsia",
  },
  rose: {
    primary: "text-rose-400",
    accent: "border-rose-500/30",
    button: "bg-rose-500 hover:bg-rose-600",
    ring: "ring-rose-500/50",
    text: "rose",
  },
  amber: {
    primary: "text-amber-400",
    accent: "border-amber-500/30",
    button: "bg-amber-500 hover:bg-amber-600",
    ring: "ring-amber-500/50",
    text: "amber",
  },
  lime: {
    primary: "text-lime-400",
    accent: "border-lime-500/30",
    button: "bg-lime-500 hover:bg-lime-600",
    ring: "ring-lime-500/50",
    text: "lime",
  },
  sky: {
    primary: "text-sky-400",
    accent: "border-sky-500/30",
    button: "bg-sky-500 hover:bg-sky-600",
    ring: "ring-sky-500/50",
    text: "sky",
  },
  slate: {
    primary: "text-slate-400",
    accent: "border-slate-500/30",
    button: "bg-slate-500 hover:bg-slate-600",
    ring: "ring-slate-500/50",
    text: "slate",
  },
  gold: {
    primary: "text-yellow-500",
    accent: "border-yellow-600/30",
    button: "bg-yellow-600 hover:bg-yellow-700",
    ring: "ring-yellow-600/50",
    text: "yellow",
  },
  coral: {
    primary: "text-orange-400",
    accent: "border-orange-400/30",
    button: "bg-orange-400 hover:bg-orange-500",
    ring: "ring-orange-400/50",
    text: "orange",
  },
  mint: {
    primary: "text-emerald-400",
    accent: "border-emerald-400/30",
    button: "bg-emerald-400 hover:bg-emerald-500",
    ring: "ring-emerald-400/50",
    text: "emerald",
  },
  lavender: {
    primary: "text-purple-400",
    accent: "border-purple-400/30",
    button: "bg-purple-400 hover:bg-purple-500",
    ring: "ring-purple-400/50",
    text: "purple",
  },
  "neon-blue": {
    primary: "text-blue-400",
    accent: "border-blue-400/50",
    button: "bg-blue-400 hover:bg-blue-500 shadow-lg shadow-blue-500/50",
    ring: "ring-blue-400/70",
    text: "blue",
  },
  "neon-green": {
    primary: "text-green-400",
    accent: "border-green-400/50",
    button: "bg-green-400 hover:bg-green-500 shadow-lg shadow-green-500/50",
    ring: "ring-green-400/70",
    text: "green",
  },
  "neon-pink": {
    primary: "text-pink-400",
    accent: "border-pink-400/50",
    button: "bg-pink-400 hover:bg-pink-500 shadow-lg shadow-pink-500/50",
    ring: "ring-pink-400/70",
    text: "pink",
  },
  "neon-yellow": {
    primary: "text-yellow-400",
    accent: "border-yellow-400/50",
    button: "bg-yellow-400 hover:bg-yellow-500 shadow-lg shadow-yellow-500/50",
    ring: "ring-yellow-400/70",
    text: "yellow",
  },
  electric: {
    primary: "text-cyan-400",
    accent: "border-cyan-400/50",
    button: "bg-cyan-400 hover:bg-cyan-500 shadow-lg shadow-cyan-500/50",
    ring: "ring-cyan-400/70",
    text: "cyan",
  },
  "sunset-orange": {
    primary: "text-orange-500",
    accent: "border-orange-500/30",
    button: "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
    ring: "ring-orange-500/50",
    text: "orange",
  },
  "ocean-blue": {
    primary: "text-blue-500",
    accent: "border-blue-600/30",
    button: "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600",
    ring: "ring-blue-600/50",
    text: "blue",
  },
  "forest-green": {
    primary: "text-green-600",
    accent: "border-green-700/30",
    button: "bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700",
    ring: "ring-green-700/50",
    text: "green",
  },
}

const bannerConfigs: Record<string, string> = {
  none: "",
  "gradient-blue": "bg-gradient-to-r from-blue-600 to-cyan-500",
  "gradient-purple": "bg-gradient-to-r from-purple-600 to-pink-500",
  "gradient-green": "bg-gradient-to-r from-green-600 to-emerald-500",
  "gradient-orange": "bg-gradient-to-r from-orange-600 to-red-500",
  "gradient-rainbow": "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500",
  "gradient-sunset": "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500",
  "gradient-aurora": "bg-gradient-to-r from-green-400 via-blue-500 to-purple-600",
  "gradient-neon": "bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400",
  "pattern-dots": "bg-slate-800",
  "pattern-grid": "bg-slate-800",
  "pattern-waves": "bg-slate-800",
  "anime-1": "bg-gradient-to-r from-pink-500 to-purple-500",
  "anime-2": "bg-gradient-to-r from-blue-500 to-cyan-400",
  "movie-1": "bg-gradient-to-r from-slate-800 to-slate-600",
  gaming: "bg-gradient-to-r from-purple-600 via-pink-500 to-red-500",
  music: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
  tech: "bg-gradient-to-r from-cyan-600 to-blue-600",
}

const roleBadges: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-red-500/80 text-white" },
  uploader: { label: "Uploader", color: "bg-amber-500/80 text-white" },
  member: { label: "Membre", color: "bg-slate-600/80 text-white" },
}

const avatarPresets: Record<string, string> = {
  default: "/user-avatar-default.jpg",
  "avatar-1": "/cool-avatar-blue-gamer.jpg",
  "avatar-2": "/cool-avatar-purple-anime.jpg",
  "avatar-3": "/cool-avatar-green-nature.jpg",
  "avatar-4": "/cool-avatar-red-fire.jpg",
  "avatar-5": "/cool-avatar-orange-sunset.jpg",
  "avatar-6": "/cool-avatar-pink-cute.jpg",
  "avatar-7": "/cool-avatar-cyan-tech.jpg",
  "avatar-8": "/cool-avatar-yellow-electric.jpg",
  "avatar-9": "/cool-avatar-dark-mysterious.jpg",
  "avatar-10": "/cool-avatar-white-minimal.jpg",
  "avatar-11": "/cool-avatar-neon-cyberpunk.jpg",
  "avatar-12": "/cool-avatar-retro-vintage.jpg",
  "gamer-1": "/gamer-avatar-headset.jpg",
  "gamer-2": "/gamer-avatar-controller.jpg",
}

async function getProfile(username: string) {
  try {
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username).single()
    if (error || !profile) return null
    return profile
  } catch {
    return null
  }
}

async function getProfileSettings(userId: string) {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from("profile_settings").select("*").eq("user_id", userId).single()
    return data
  } catch {
    return null
  }
}

async function getUserLinks(userId: string) {
  try {
    const supabase = createAdminClient()

    const fetchAllRows = async (table: string, filters: Record<string, any>) => {
      const allRows: any[] = []
      const pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value)
        }

        const { data, error } = await query

        if (error || !data || data.length === 0) {
          hasMore = false
        } else {
          allRows.push(...data)
          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      return allRows
    }

    const [downloads, streaming, digital, liveTV] = await Promise.all([
      fetchAllRows("download_links", { submitted_by: userId, status: "approved", is_active: true }),
      fetchAllRows("streaming_links", { submitted_by: userId, status: "approved", is_active: true }),
      fetchAllRows("digital_content", { submitted_by: userId, status: "approved", is_active: true }),
      fetchAllRows("live_tv_channels", { submitted_by: userId, status: "approved", is_active: true }),
    ])

    return {
      downloads,
      streaming,
      digital,
      liveTV,
    }
  } catch {
    return { downloads: [], streaming: [], digital: [], liveTV: [] }
  }
}

async function getTmdbInfo(tmdbId: number, mediaType: string) {
  try {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) return null

    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=fr-FR`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  const profile = await getProfile(username)
  if (!profile) notFound()

  const [settings, links] = await Promise.all([getProfileSettings(profile.id), getUserLinks(profile.id)])

  const theme = themeConfigs[settings?.theme || "dark"] || themeConfigs.dark
  const color = colorConfigs[settings?.primary_color || "cyan"] || colorConfigs.cyan
  const role = roleBadges[profile.role || "member"] || roleBadges.member
  const bannerClass = bannerConfigs[settings?.banner_preset || "none"] || ""

  const getAvatarUrl = () => {
    if (settings?.avatar_preset === "custom" && settings?.avatar_url) {
      return settings.avatar_url
    }
    if (settings?.avatar_preset && avatarPresets[settings.avatar_preset]) {
      return avatarPresets[settings.avatar_preset]
    }
    return avatarPresets.default
  }
  const avatarUrl = getAvatarUrl()

  const totalLinks = links.downloads.length + links.streaming.length + links.digital.length + links.liveTV.length

  // Get TMDB info
  const tmdbIds = new Set<string>()
  links.downloads.forEach((l) => l.tmdb_id && tmdbIds.add(`${l.media_type}-${l.tmdb_id}`))
  links.streaming.forEach((l) => l.tmdb_id && tmdbIds.add(`${l.media_type}-${l.tmdb_id}`))
  links.digital.forEach((l) => l.tmdb_id && tmdbIds.add(`${l.media_type}-${l.tmdb_id}`))

  const tmdbInfoMap: Record<string, any> = {}
  const tmdbArray = Array.from(tmdbIds)
  const batchSize = 10

  for (let i = 0; i < tmdbArray.length; i += batchSize) {
    const batch = tmdbArray.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (key) => {
        const [type, id] = key.split("-")
        const info = await getTmdbInfo(Number(id), type)
        return { key, info }
      }),
    )
    results.forEach(({ key, info }) => {
      if (info) tmdbInfoMap[key] = info
    })
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg}`}>
      {/* Bannière */}
      {(settings?.banner_url || bannerClass) && (
        <div className={`h-48 w-full ${bannerClass} relative overflow-hidden`}>
          {settings?.banner_url ? (
            <Image src={settings.banner_url || "/placeholder.svg"} alt="Bannière" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div
        className={`${theme.header} backdrop-blur-xl border-b border-white/5 ${settings?.banner_url || bannerClass ? "-mt-24 pt-24" : ""}`}
      >
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div
              className={`relative w-28 h-28 rounded-full overflow-hidden shadow-xl ${theme.glow || ""} ring-4 ${color.ring}`}
            >
              <Image
                src={avatarUrl || "/placeholder.svg"}
                alt={profile.username || "Avatar"}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
                <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${role.color}`}>{role.label}</span>
              </div>
              {settings?.bio && <p className="text-slate-300 mt-2 max-w-lg">{settings.bio}</p>}
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-400 justify-center md:justify-start flex-wrap">
                <span>
                  Membre depuis{" "}
                  {new Date(profile.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
                </span>
                {(settings?.show_stats ?? true) && <span className={color.primary}>{totalLinks} liens partagés</span>}
              </div>
              {/* Liens sociaux */}
              <div className="flex gap-3 mt-4 justify-center md:justify-start">
                {settings?.social_twitter && (
                  <a
                    href={`https://twitter.com/${settings.social_twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${color.primary} hover:underline text-sm`}
                  >
                    Twitter
                  </a>
                )}
                {settings?.social_discord && (
                  <span className="text-slate-400 text-sm">Discord: {settings.social_discord}</span>
                )}
                {settings?.social_website && (
                  <a
                    href={settings.social_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${color.primary} hover:underline text-sm`}
                  >
                    Site web
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {totalLinks === 0 ? (
          <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
            <p className="text-slate-400 text-lg">Cet utilisateur n&apos;a pas encore partagé de liens.</p>
          </div>
        ) : (
          <>
            {/* Téléchargements */}
            {links.downloads.length > 0 && (
              <section>
                <h2 className={`text-xl font-bold ${color.primary} mb-4 flex items-center gap-2`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Téléchargements ({links.downloads.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {links.downloads.map((link) => {
                    const tmdbKey = `${link.media_type}-${link.tmdb_id}`
                    const info = tmdbInfoMap[tmdbKey]
                    return (
                      <div
                        key={link.id}
                        className={`rounded-xl border ${theme.card} ${theme.glow ? `shadow-lg ${theme.glow}` : ""} overflow-hidden transition-transform hover:scale-[1.02]`}
                      >
                        <div className="flex gap-4 p-4">
                          {info?.poster_path && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${info.poster_path}`}
                              alt={info.title || info.name}
                              width={60}
                              height={90}
                              className="rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">
                              {info?.title || info?.name || `TMDB ${link.tmdb_id}`}
                            </h3>
                            <p className="text-xs text-slate-400 capitalize">
                              {link.media_type === "movie" ? "Film" : "Série"}
                              {link.season_number && ` - S${link.season_number}`}
                              {link.episode_number && `E${link.episode_number}`}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {link.quality && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-medium">
                                  {link.quality}
                                </span>
                              )}
                              {link.resolution && (
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-medium">
                                  {link.resolution}
                                </span>
                              )}
                              {link.codec_video && (
                                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium">
                                  {link.codec_video}
                                </span>
                              )}
                              {link.codec_audio && (
                                <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded text-[10px] font-medium">
                                  {link.codec_audio}
                                </span>
                              )}
                              {link.language && (
                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-medium">
                                  {link.language}
                                </span>
                              )}
                              {link.subtitle && (
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-medium">
                                  ST: {link.subtitle}
                                </span>
                              )}
                              {link.file_size && (
                                <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded text-[10px] font-medium">
                                  {link.file_size}
                                </span>
                              )}
                              {link.has_audio_description && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-medium">
                                  AD
                                </span>
                              )}
                            </div>
                            {link.release_name && (
                              <p className="text-[10px] text-slate-500 mt-1 truncate" title={link.release_name}>
                                {link.release_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <ProfileLinkButton
                            url={link.source_url}
                            label="Télécharger"
                            type="download"
                            colorClass={color.button}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Streaming */}
            {links.streaming.length > 0 && (
              <section>
                <h2 className={`text-xl font-bold ${color.primary} mb-4 flex items-center gap-2`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Streaming ({links.streaming.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {links.streaming.map((link) => {
                    const tmdbKey = `${link.media_type}-${link.tmdb_id}`
                    const info = tmdbInfoMap[tmdbKey]
                    return (
                      <div
                        key={link.id}
                        className={`rounded-xl border ${theme.card} ${theme.glow ? `shadow-lg ${theme.glow}` : ""} overflow-hidden transition-transform hover:scale-[1.02]`}
                      >
                        <div className="flex gap-4 p-4">
                          {info?.poster_path && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${info.poster_path}`}
                              alt={info.title || info.name}
                              width={60}
                              height={90}
                              className="rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">
                              {info?.title || info?.name || link.source_name}
                            </h3>
                            <p className="text-xs text-slate-400 capitalize">
                              {link.media_type === "movie" ? "Film" : "Série"}
                              {link.season_number && ` - S${link.season_number}`}
                              {link.episode_number && `E${link.episode_number}`}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {link.quality && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-medium">
                                  {link.quality}
                                </span>
                              )}
                              {link.language && (
                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-medium">
                                  {link.language}
                                </span>
                              )}
                              {link.source_name && (
                                <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded text-[10px] font-medium">
                                  {link.source_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <ProfileLinkButton
                            url={link.source_url}
                            label="Regarder"
                            type="streaming"
                            colorClass={color.button}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Contenu Digital */}
            {links.digital.length > 0 && (
              <section>
                <h2 className={`text-xl font-bold ${color.primary} mb-4 flex items-center gap-2`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Contenu Digital ({links.digital.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {links.digital.map((content) => (
                    <div
                      key={content.id}
                      className={`rounded-xl border ${theme.card} ${theme.glow ? `shadow-lg ${theme.glow}` : ""} overflow-hidden transition-transform hover:scale-[1.02]`}
                    >
                      <div className="flex gap-4 p-4">
                        {content.cover_url ? (
                          <Image
                            src={content.cover_url || "/placeholder.svg"}
                            alt={content.title || "Couverture"}
                            width={60}
                            height={90}
                            className="rounded-lg flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div
                            className={`w-[60px] h-[90px] rounded-lg flex-shrink-0 bg-gradient-to-br ${color.button} flex items-center justify-center`}
                          >
                            <svg
                              className="w-6 h-6 text-white/80"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              {content.content_type === "ebook" ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                              ) : content.content_type === "music" ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              )}
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{content.title}</h3>
                          <p className="text-xs text-slate-400 capitalize">{content.content_type}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.version && (
                              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-medium">
                                v{content.version}
                              </span>
                            )}
                            {content.file_size && (
                              <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded text-[10px] font-medium">
                                {content.file_size}
                              </span>
                            )}
                            {content.content_type && (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium uppercase">
                                {content.content_type}
                              </span>
                            )}
                          </div>
                          {content.author && (
                            <p className="text-[10px] text-slate-500 mt-1 truncate">par {content.author}</p>
                          )}
                          {content.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{content.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <ProfileLinkButton
                          url={content.download_url || content.read_url}
                          label={content.download_url ? "Télécharger" : "Lire"}
                          type="digital"
                          colorClass={color.button}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Chaînes TV */}
            {links.liveTV.length > 0 && (
              <section>
                <h2 className={`text-xl font-bold ${color.primary} mb-4 flex items-center gap-2`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Chaînes TV ({links.liveTV.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {links.liveTV.map((channel) => (
                    <div
                      key={channel.id}
                      className={`rounded-xl border ${theme.card} ${theme.glow ? `shadow-lg ${theme.glow}` : ""} overflow-hidden transition-transform hover:scale-[1.02]`}
                    >
                      <div className="flex gap-4 p-4">
                        {channel.channel_logo ? (
                          <Image
                            src={channel.channel_logo || "/placeholder.svg"}
                            alt={channel.channel_name || "Logo"}
                            width={60}
                            height={60}
                            className="rounded-lg flex-shrink-0 object-contain bg-white/10"
                          />
                        ) : (
                          <div
                            className={`w-[60px] h-[60px] rounded-lg flex-shrink-0 bg-gradient-to-br ${color.button} flex items-center justify-center`}
                          >
                            <svg
                              className="w-6 h-6 text-white/80"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{channel.channel_name}</h3>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {channel.quality && (
                              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-medium">
                                {channel.quality}
                              </span>
                            )}
                            {channel.language && (
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-medium">
                                {channel.language}
                              </span>
                            )}
                            {channel.country && (
                              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-medium">
                                {channel.country}
                              </span>
                            )}
                            {channel.category && (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium">
                                {channel.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <ProfileLinkButton
                          url={
                            channel.stream_url
                              ? channel.stream_url.startsWith("http")
                                ? channel.stream_url
                                : `https://${channel.stream_url}`
                              : "#"
                          }
                          label="Regarder"
                          type="live"
                          colorClass={color.button}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-sm text-slate-500">
        Propulsé par{" "}
        <Link href="/" className={color.primary}>
          WaveWatch
        </Link>
      </footer>
    </div>
  )
}
