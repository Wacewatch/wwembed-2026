import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  const [
    { data: streamingLinks },
    { data: downloadLinks },
    { data: liveTvChannels },
    { data: liveTvSources },
    { data: digitalContents },
    { data: digitalLinks },
  ] = await Promise.all([
    supabase.from("streaming_links").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }),
    supabase.from("download_links").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }),
    supabase.from("live_tv_channels").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }),
    supabase.from("live_tv_sources").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }),
    supabase.from("digital_content").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }),
    supabase
      .from("digital_download_links")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false }),
  ])

  // Then count views based on the fetched links
  const wwIds = [
    ...(streamingLinks || []).map((l) => l.ww_id),
    ...(downloadLinks || []).map((l) => l.ww_id),
    ...(digitalContents || []).map((l) => l.ww_id),
  ].filter(Boolean)

  let viewCount = 0
  const viewsPerLink: Record<string, number> = {}

  if (wwIds.length > 0) {
    const { count } = await supabase.from("embed_views").select("*", { count: "exact", head: true }).in("ww_id", wwIds)
    viewCount = count || 0

    const { data: viewsData } = await supabase.from("embed_views").select("ww_id").in("ww_id", wwIds)

    if (viewsData) {
      viewsData.forEach((view) => {
        if (view.ww_id) {
          viewsPerLink[view.ww_id] = (viewsPerLink[view.ww_id] || 0) + 1
        }
      })
    }
  }

  const streamingLinksWithViews = (streamingLinks || []).map((link) => ({
    ...link,
    view_count: viewsPerLink[link.ww_id] || 0,
  }))

  const downloadLinksWithViews = (downloadLinks || []).map((link) => ({
    ...link,
    view_count: viewsPerLink[link.ww_id] || 0,
  }))

  const digitalContentsWithViews = (digitalContents || []).map((content) => ({
    ...content,
    view_count: viewsPerLink[content.ww_id] || 0,
  }))

  const totalStreaming = streamingLinks?.length || 0
  const totalDownload = downloadLinks?.length || 0
  const totalLiveTv = (liveTvChannels?.length || 0) + (liveTvSources?.length || 0)
  const totalDigital = (digitalContents?.length || 0) + (digitalLinks?.length || 0)
  const verifiedStreaming = streamingLinks?.filter((l) => l.status === "approved").length || 0
  const verifiedDownload = downloadLinks?.filter((l) => l.status === "approved").length || 0
  const verifiedLiveTv =
    (liveTvChannels?.filter((l) => l.status === "approved").length || 0) +
    (liveTvSources?.filter((l) => l.status === "approved").length || 0)
  const verifiedDigital =
    (digitalContents?.filter((l) => l.status === "approved").length || 0) +
    (digitalLinks?.filter((l) => l.status === "approved").length || 0)

  const pendingCount =
    (streamingLinks?.filter((l) => l.status === "pending").length || 0) +
    (downloadLinks?.filter((l) => l.status === "pending").length || 0) +
    (liveTvChannels?.filter((l) => l.status === "pending").length || 0) +
    (liveTvSources?.filter((l) => l.status === "pending").length || 0) +
    (digitalContents?.filter((l) => l.status === "pending").length || 0) +
    (digitalLinks?.filter((l) => l.status === "pending").length || 0)

  const rejectedCount =
    (streamingLinks?.filter((l) => l.status === "rejected").length || 0) +
    (downloadLinks?.filter((l) => l.status === "rejected").length || 0) +
    (liveTvChannels?.filter((l) => l.status === "rejected").length || 0) +
    (liveTvSources?.filter((l) => l.status === "rejected").length || 0) +
    (digitalContents?.filter((l) => l.status === "rejected").length || 0) +
    (digitalLinks?.filter((l) => l.status === "rejected").length || 0)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <DashboardContent
          profile={profile}
          streamingLinks={streamingLinksWithViews}
          downloadLinks={downloadLinksWithViews}
          liveTvChannels={liveTvChannels || []}
          liveTvSources={liveTvSources || []}
          digitalContents={digitalContentsWithViews}
          digitalLinks={digitalLinks || []}
          stats={{
            totalStreaming,
            totalDownload,
            totalLiveTv,
            totalDigital,
            verifiedStreaming,
            verifiedDownload,
            verifiedLiveTv,
            verifiedDigital,
            pendingCount,
            rejectedCount,
            totalViews: viewCount,
          }}
        />
      </main>
    </div>
  )
}
