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
}

const colorSchemes: Record<
  string,
  { primary: string; button: string; ring: string; badge: string; accent: string; highlight: string }
> = {
  blue: {
    primary: "text-blue-400",
    button: "from-blue-600 to-blue-500",
    ring: "ring-blue-500/50",
    badge: "bg-blue-500/20 text-blue-400",
    accent: "bg-blue-500",
    highlight: "hover:bg-blue-500/10",
  },
  purple: {
    primary: "text-purple-400",
    button: "from-purple-600 to-purple-500",
    ring: "ring-purple-500/50",
    badge: "bg-purple-500/20 text-purple-400",
    accent: "bg-purple-500",
    highlight: "hover:bg-purple-500/10",
  },
  emerald: {
    primary: "text-emerald-400",
    button: "from-emerald-600 to-emerald-500",
    ring: "ring-emerald-500/50",
    badge: "bg-emerald-500/20 text-emerald-400",
    accent: "bg-emerald-500",
    highlight: "hover:bg-emerald-500/10",
  },
  rose: {
    primary: "text-rose-400",
    button: "from-rose-600 to-rose-500",
    ring: "ring-rose-500/50",
    badge: "bg-rose-500/20 text-rose-400",
    accent: "bg-rose-500",
    highlight: "hover:bg-rose-500/10",
  },
  amber: {
    primary: "text-amber-400",
    button: "from-amber-600 to-amber-500",
    ring: "ring-amber-500/50",
    badge: "bg-amber-500/20 text-amber-400",
    accent: "bg-amber-500",
    highlight: "hover:bg-amber-500/10",
  },
  cyan: {
    primary: "text-cyan-400",
    button: "from-cyan-600 to-cyan-500",
    ring: "ring-cyan-500/50",
    badge: "bg-cyan-500/20 text-cyan-400",
    accent: "bg-cyan-500",
    highlight: "hover:bg-cyan-500/10",
  },
  red: {
    primary: "text-red-400",
    button: "from-red-600 to-red-500",
    ring: "ring-red-500/50",
    badge: "bg-red-500/20 text-red-400",
    accent: "bg-red-500",
    highlight: "hover:bg-red-500/10",
  },
  orange: {
    primary: "text-orange-400",
    button: "from-orange-600 to-orange-500",
    ring: "ring-orange-500/50",
    badge: "bg-orange-500/20 text-orange-400",
    accent: "bg-orange-500",
    highlight: "hover:bg-orange-500/10",
  },
  lime: {
    primary: "text-lime-400",
    button: "from-lime-600 to-lime-500",
    ring: "ring-lime-500/50",
    badge: "bg-lime-500/20 text-lime-400",
    accent: "bg-lime-500",
    highlight: "hover:bg-lime-500/10",
  },
  teal: {
    primary: "text-teal-400",
    button: "from-teal-600 to-teal-500",
    ring: "ring-teal-500/50",
    badge: "bg-teal-500/20 text-teal-400",
    accent: "bg-teal-500",
    highlight: "hover:bg-teal-500/10",
  },
  indigo: {
    primary: "text-indigo-400",
    button: "from-indigo-600 to-indigo-500",
    ring: "ring-indigo-500/50",
    badge: "bg-indigo-500/20 text-indigo-400",
    accent: "bg-indigo-500",
    highlight: "hover:bg-indigo-500/10",
  },
  pink: {
    primary: "text-pink-400",
    button: "from-pink-600 to-pink-500",
    ring: "ring-pink-500/50",
    badge: "bg-pink-500/20 text-pink-400",
    accent: "bg-pink-500",
    highlight: "hover:bg-pink-500/10",
  },
  sky: {
    primary: "text-sky-400",
    button: "from-sky-600 to-sky-500",
    ring: "ring-sky-500/50",
    badge: "bg-sky-500/20 text-sky-400",
    accent: "bg-sky-500",
    highlight: "hover:bg-sky-500/10",
  },
  fuchsia: {
    primary: "text-fuchsia-400",
    button: "from-fuchsia-600 to-fuchsia-500",
    ring: "ring-fuchsia-500/50",
    badge: "bg-fuchsia-500/20 text-fuchsia-400",
    accent: "bg-fuchsia-500",
    highlight: "hover:bg-fuchsia-500/10",
  },
}

const bannerConfigs: Record<string, string> = {
  none: "",
  "gradient-blue": "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600",
  "gradient-sunset": "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600",
  "gradient-forest": "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600",
  "gradient-ocean": "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600",
  "gradient-fire": "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600",
  "gradient-night": "bg-gradient-to-r from-slate-800 via-purple-900 to-slate-800",
  "gradient-aurora": "bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600",
  "gradient-candy": "bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400",
  "gradient-mint": "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400",
  "gradient-berry": "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600",
}

const avatarPresets: Record<string, string> = {
  default: "/diverse-avatars.png",
  anime1: "https://i.pravatar.cc/150?img=1",
  anime2: "https://i.pravatar.cc/150?img=2",
  anime3: "https://i.pravatar.cc/150?img=3",
  gamer: "https://i.pravatar.cc/150?img=4",
  minimal: "https://i.pravatar.cc/150?img=5",
}

const roleBadges: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: "Admin", color: "bg-red-500/20 text-red-400 border border-red-500/30", icon: "shield" },
  vip: { label: "VIP", color: "bg-amber-500/20 text-amber-400 border border-amber-500/30", icon: "star" },
  premium: {
    label: "Premium",
    color: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    icon: "crown",
  },
  member: { label: "Membre", color: "bg-slate-500/20 text-slate-400 border border-slate-500/30", icon: "user" },
}

async function getProfile(username: string) {
  const supabase = await createAdminClient()
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username).single()
  if (error || !profile) return null
  return profile
}

async function getProfileSettings(userId: string) {
  const supabase = await createAdminClient()
  const { data } = await supabase.from("profile_settings").select("*").eq("user_id", userId).single()
  return data
}

async function getUserLinks(userId: string) {
  const supabase = await createAdminClient()

  const [downloadsRes, streamingRes, digitalRes, liveTVRes] = await Promise.all([
    supabase
      .from("download_links")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("streaming_links")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("digital_content")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("live_tv_channels")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ])

  return {
    downloads: downloadsRes.data || [],
    streaming: streamingRes.data || [],
    digital: digitalRes.data || [],
    liveTV: liveTVRes.data || [],
  }
}

async function getTmdbInfo(tmdbId: number, mediaType: string) {
  if (!tmdbId || !mediaType) return null
  try {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) return null
    const type = mediaType === "movie" ? "movie" : "tv"
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&language=fr-FR`, {
      next: { revalidate: 86400 },
    })
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
  const color = colorSchemes[settings?.color_scheme || "blue"] || colorSchemes.blue
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

  // Stats for header
  const stats = {
    downloads: links.downloads.length,
    streaming: links.streaming.length,
    digital: links.digital.length,
    liveTV: links.liveTV.length,
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg}`}>
      {/* Bannière avec effet parallax */}
      <div className="relative h-64 overflow-hidden">
        {settings?.banner_url ? (
          <Image
            src={settings.banner_url || "/placeholder.svg"}
            alt="Bannière"
            fill
            className="object-cover"
            priority
          />
        ) : bannerClass ? (
          <div className={`absolute inset-0 ${bannerClass}`} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

        {/* Effet de grille */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>
      </div>

      {/* Header avec avatar */}
      <div className="relative max-w-6xl mx-auto px-4 -mt-32">
        <div className={`${theme.header} backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl`}>
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div
                className={`absolute -inset-1 rounded-full bg-gradient-to-r ${color.button} opacity-75 blur-lg group-hover:opacity-100 transition-opacity`}
              />
              <div className={`relative w-32 h-32 rounded-full overflow-hidden ring-4 ${color.ring} shadow-2xl`}>
                <Image
                  src={avatarUrl || "/placeholder.svg"}
                  alt={profile.username || "Avatar"}
                  fill
                  className="object-cover"
                />
              </div>
              {/* Badge rôle sur avatar */}
              <div
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${role.color} shadow-lg`}
              >
                {role.label}
              </div>
            </div>

            {/* Info utilisateur */}
            <div className="flex-1 text-center lg:text-left space-y-4">
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">{profile.username}</h1>
                {settings?.bio && (
                  <p className="text-slate-300 mt-2 max-w-2xl text-lg leading-relaxed">{settings.bio}</p>
                )}
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                {stats.downloads > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${color.badge} backdrop-blur-sm`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="font-semibold">{stats.downloads}</span>
                    <span className="opacity-75">Downloads</span>
                  </div>
                )}
                {stats.streaming > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${color.badge} backdrop-blur-sm`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <span className="font-semibold">{stats.streaming}</span>
                    <span className="opacity-75">Streaming</span>
                  </div>
                )}
                {stats.digital > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${color.badge} backdrop-blur-sm`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <span className="font-semibold">{stats.digital}</span>
                    <span className="opacity-75">Digital</span>
                  </div>
                )}
                {stats.liveTV > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${color.badge} backdrop-blur-sm`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-semibold">{stats.liveTV}</span>
                    <span className="opacity-75">TV Live</span>
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 justify-center lg:justify-start">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Membre depuis{" "}
                  {new Date(profile.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
                </span>
                {(settings?.show_stats ?? true) && (
                  <span className={`${color.primary} font-medium`}>{totalLinks} liens partagés</span>
                )}
              </div>

              {/* Liens sociaux */}
              {(settings?.social_twitter || settings?.social_discord || settings?.social_website) && (
                <div className="flex gap-4 justify-center lg:justify-start pt-2">
                  {settings?.social_twitter && (
                    <a
                      href={`https://twitter.com/${settings.social_twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 ${color.highlight} transition-colors`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-sm">Twitter</span>
                    </a>
                  )}
                  {settings?.social_discord && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5`}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                      </svg>
                      <span className="text-sm text-slate-400">{settings.social_discord}</span>
                    </div>
                  )}
                  {settings?.social_website && (
                    <a
                      href={settings.social_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 ${color.highlight} transition-colors`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      <span className="text-sm">Site web</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {totalLinks === 0 ? (
          <div className={`rounded-3xl border ${theme.card} p-16 text-center backdrop-blur-xl`}>
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${color.badge} flex items-center justify-center`}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-xl">Cet utilisateur n&apos;a pas encore partagé de liens.</p>
          </div>
        ) : (
          <>
            {/* Téléchargements */}
            {links.downloads.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${color.badge} flex items-center justify-center`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Téléchargements</h2>
                    <p className="text-slate-400">{links.downloads.length} fichiers disponibles</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {links.downloads.map((link) => {
                    const tmdbKey = `${link.media_type}-${link.tmdb_id}`
                    const info = tmdbInfoMap[tmdbKey]
                    return (
                      <div
                        key={link.id}
                        className={`group relative rounded-2xl border ${theme.card} overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${theme.glow ? theme.glow : ""}`}
                      >
                        {/* Image de fond floue */}
                        {info?.backdrop_path && (
                          <div className="absolute inset-0 opacity-20">
                            <Image
                              src={`https://image.tmdb.org/t/p/w300${info.backdrop_path}`}
                              alt=""
                              fill
                              className="object-cover blur-sm"
                            />
                          </div>
                        )}
                        <div className="relative p-4">
                          <div className="flex gap-4">
                            {info?.poster_path ? (
                              <div className="relative w-16 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-white/10">
                                <Image
                                  src={`https://image.tmdb.org/t/p/w154${info.poster_path}`}
                                  alt={info.title || info.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div
                                className={`w-16 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br ${color.button} flex items-center justify-center`}
                              >
                                <svg
                                  className="w-8 h-8 text-white/60"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                                  />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              <h3 className="font-bold text-white truncate text-sm">
                                {info?.title || info?.name || `TMDB ${link.tmdb_id}`}
                              </h3>
                              <p className="text-xs text-slate-400">
                                {link.media_type === "movie" ? "Film" : "Série"}
                                {link.season_number && ` • S${link.season_number}`}
                                {link.episode_number && `E${link.episode_number}`}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {link.quality && (
                                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-semibold">
                                    {link.quality}
                                  </span>
                                )}
                                {link.resolution && (
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-semibold">
                                    {link.resolution}
                                  </span>
                                )}
                                {link.language && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-semibold">
                                    {link.language}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <ProfileLinkButton
                              url={link.source_url}
                              label="Télécharger"
                              type="download"
                              colorClass={color.button}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Streaming */}
            {links.streaming.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${color.badge} flex items-center justify-center`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Streaming</h2>
                    <p className="text-slate-400">{links.streaming.length} liens disponibles</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {links.streaming.map((link) => {
                    const tmdbKey = `${link.media_type}-${link.tmdb_id}`
                    const info = tmdbInfoMap[tmdbKey]
                    return (
                      <div
                        key={link.id}
                        className={`group relative rounded-2xl border ${theme.card} overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${theme.glow ? theme.glow : ""}`}
                      >
                        {info?.backdrop_path && (
                          <div className="absolute inset-0 opacity-20">
                            <Image
                              src={`https://image.tmdb.org/t/p/w300${info.backdrop_path}`}
                              alt=""
                              fill
                              className="object-cover blur-sm"
                            />
                          </div>
                        )}
                        <div className="relative p-4">
                          <div className="flex gap-4">
                            {info?.poster_path ? (
                              <div className="relative w-16 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-white/10">
                                <Image
                                  src={`https://image.tmdb.org/t/p/w154${info.poster_path}`}
                                  alt={info.title || info.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div
                                className={`w-16 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br ${color.button} flex items-center justify-center`}
                              >
                                <svg
                                  className="w-8 h-8 text-white/60"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                  />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              <h3 className="font-bold text-white truncate text-sm">
                                {info?.title || info?.name || link.source_name}
                              </h3>
                              <p className="text-xs text-slate-400">
                                {link.media_type === "movie" ? "Film" : "Série"}
                                {link.season_number && ` • S${link.season_number}`}
                                {link.episode_number && `E${link.episode_number}`}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {link.quality && (
                                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-semibold">
                                    {link.quality}
                                  </span>
                                )}
                                {link.language && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-semibold">
                                    {link.language}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <ProfileLinkButton
                              url={link.source_url}
                              label="Regarder"
                              type="streaming"
                              colorClass={color.button}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Contenu Digital */}
            {links.digital.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${color.badge} flex items-center justify-center`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Contenu Digital</h2>
                    <p className="text-slate-400">{links.digital.length} contenus disponibles</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {links.digital.map((content) => (
                    <div
                      key={content.id}
                      className={`group relative rounded-2xl border ${theme.card} overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${theme.glow ? theme.glow : ""}`}
                    >
                      <div className="relative p-4">
                        <div className="flex gap-4">
                          {content.cover_url ? (
                            <div className="relative w-16 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-white/10">
                              <Image
                                src={content.cover_url || "/placeholder.svg"}
                                alt={content.title || "Couverture"}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-16 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br ${color.button} flex items-center justify-center`}
                            >
                              <svg
                                className="w-8 h-8 text-white/60"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                {content.content_type === "ebook" ? (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                  />
                                ) : content.content_type === "music" ? (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                  />
                                ) : (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                  />
                                )}
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-bold text-white truncate text-sm">{content.title}</h3>
                            <p className="text-xs text-slate-400 capitalize">{content.content_type}</p>
                            <div className="flex flex-wrap gap-1">
                              {content.version && (
                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-semibold">
                                  v{content.version}
                                </span>
                              )}
                              {content.file_size && (
                                <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 rounded-full text-[10px] font-semibold">
                                  {content.file_size}
                                </span>
                              )}
                            </div>
                            {content.author && (
                              <p className="text-[10px] text-slate-500 truncate">par {content.author}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <ProfileLinkButton
                            url={content.download_url || content.read_url}
                            label={content.download_url ? "Télécharger" : "Lire"}
                            type="digital"
                            colorClass={color.button}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Chaînes TV - Sans bouton Regarder */}
            {links.liveTV.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${color.badge} flex items-center justify-center`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Chaînes TV</h2>
                    <p className="text-slate-400">{links.liveTV.length} chaînes disponibles</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {links.liveTV.map((channel) => (
                    <div
                      key={channel.id}
                      className={`group relative rounded-2xl border ${theme.card} overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${theme.glow ? theme.glow : ""} p-4 text-center`}
                    >
                      {/* Logo chaîne */}
                      <div className="flex justify-center mb-3">
                        {channel.channel_logo ? (
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/10 p-2">
                            <Image
                              src={channel.channel_logo || "/placeholder.svg"}
                              alt={channel.channel_name || "Logo"}
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color.button} flex items-center justify-center`}
                          >
                            <svg
                              className="w-8 h-8 text-white/60"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Nom chaîne */}
                      <h3 className="font-semibold text-white text-sm truncate mb-2">{channel.channel_name}</h3>
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 justify-center">
                        {channel.quality && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-semibold">
                            {channel.quality}
                          </span>
                        )}
                        {channel.country && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-semibold">
                            {channel.country}
                          </span>
                        )}
                        {channel.category && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-[10px] font-semibold">
                            {channel.category}
                          </span>
                        )}
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
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            Propulsé par{" "}
            <Link href="/" className={`${color.primary} hover:underline font-medium`}>
              WaveWatch
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
