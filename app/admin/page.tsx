import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { AdminStats } from "@/components/admin/admin-stats"
import { AdminTabs } from "@/components/admin/admin-tabs"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
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
  ])

  // Calculate total ad clicks
  const totalAdClicks = (adsData || []).reduce((sum, ad) => sum + (ad.click_count || 0), 0)

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
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">Gérez les APIs, liens, chaînes TV et utilisateurs</p>
        </div>

        <AdminStats stats={stats} />
        <AdminTabs />
      </main>
    </div>
  )
}
