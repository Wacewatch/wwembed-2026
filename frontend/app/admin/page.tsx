import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { AdminStats } from "@/components/admin/admin-stats"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { OnlineUsersModule } from "@/components/admin/online-users-module"
import { ServerStatsModule } from "@/components/admin/server-stats-module"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Use the role from the authenticated user (sourced from the `users` collection
  // via getCurrentUser) instead of the `profiles` mirror, which can drift out of
  // sync. The Header navigation uses the same source, so behaviour stays consistent.
  if ((user as any).role !== "admin") {
    redirect("/")
  }

  const [
    { count: totalViews },
    { count: totalClicks },
    { count: totalStreamingLinks },
    { count: totalDownloadLinks },
    { count: totalUsers },
    { count: totalApis },
    { count: totalLiveTvChannels },
    { count: pendingStreaming },
    { count: pendingDownload },
    { count: pendingLiveTv },
    { count: approvedStreaming },
    { count: approvedDownload },
    { data: adsData },
    { count: totalEbooks },
    { count: totalMusic },
    { count: totalSoftware },
    { count: totalGames },
    { count: totalDigitalLinks },
  ] = await Promise.all([
    supabase.from("embed_views").select("*", { count: "exact", head: true }),
    supabase.from("link_clicks").select("*", { count: "exact", head: true }),
    supabase.from("streaming_links").select("*", { count: "exact", head: true }),
    supabase.from("download_links").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("third_party_apis").select("*", { count: "exact", head: true }),
    supabase.from("live_tv_channels").select("*", { count: "exact", head: true }),
    supabase.from("streaming_links").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("download_links").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("live_tv_channels").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("streaming_links").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("download_links").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("ads").select("click_count"),
    supabase.from("digital_content").select("*", { count: "exact", head: true }).eq("content_type", "ebook"),
    supabase.from("digital_content").select("*", { count: "exact", head: true }).eq("content_type", "music"),
    supabase.from("digital_content").select("*", { count: "exact", head: true }).eq("content_type", "software"),
    supabase.from("digital_content").select("*", { count: "exact", head: true }).eq("content_type", "game"),
    supabase.from("digital_download_links").select("*", { count: "exact", head: true }),
  ])

  const totalAdClicks = (adsData || []).reduce((sum: number, ad: any) => sum + (ad.click_count || 0), 0)

  const stats = {
    totalViews: totalViews || 0,
    totalClicks: totalClicks || 0,
    totalStreamingLinks: totalStreamingLinks || 0,
    totalDownloadLinks: totalDownloadLinks || 0,
    totalUsers: totalUsers || 0,
    totalApis: totalApis || 0,
    totalLiveTvChannels: totalLiveTvChannels || 0,
    pendingLinks: (pendingStreaming || 0) + (pendingDownload || 0) + (pendingLiveTv || 0),
    approvedLinks: (approvedStreaming || 0) + (approvedDownload || 0),
    totalAdClicks,
    totalEbooks: totalEbooks || 0,
    totalMusic: totalMusic || 0,
    totalSoftware: totalSoftware || 0,
    totalGames: totalGames || 0,
    totalDigitalLinks: totalDigitalLinks || 0,
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les APIs, liens, chaînes TV, contenus digitaux et utilisateurs
          </p>
        </div>

        <AdminStats stats={stats} />

        <div className="mb-6">
          <ServerStatsModule />
        </div>

        <div className="mb-6">
          <OnlineUsersModule />
        </div>

        <AdminTabs />
      </main>
    </div>
  )
}
