import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

async function fetchAllRows(supabase: any, table: string, userId: string, orderBy = "created_at") {
  const allRows: any[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("submitted_by", userId)
      .order(orderBy, { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

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

  const [streamingLinks, downloadLinks, liveTvChannels, liveTvSources, digitalContents, digitalLinks] =
    await Promise.all([
      fetchAllRows(supabase, "streaming_links", user.id),
      fetchAllRows(supabase, "download_links", user.id),
      fetchAllRows(supabase, "live_tv_channels", user.id),
      fetchAllRows(supabase, "live_tv_sources", user.id),
      fetchAllRows(supabase, "digital_content", user.id),
      fetchAllRows(supabase, "digital_download_links", user.id),
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

    const allViews: any[] = []
    const pageSize = 1000
    let page = 0
    let hasMore = true

    while (hasMore) {
      const { data: viewsData } = await supabase
        .from("embed_views")
        .select("ww_id")
        .in("ww_id", wwIds)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (!viewsData || viewsData.length === 0) {
        hasMore = false
      } else {
        allViews.push(...viewsData)
        if (viewsData.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    allViews.forEach((view) => {
      if (view.ww_id) {
        viewsPerLink[view.ww_id] = (viewsPerLink[view.ww_id] || 0) + 1
      }
    })
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
          initialDigitalContents={digitalContentsWithViews}
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
