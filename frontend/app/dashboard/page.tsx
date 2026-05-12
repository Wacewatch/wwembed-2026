import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getDb } from "@/lib/mongo/db"

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

  // Collect ww_ids + link_ids for native MongoDB aggregations (much faster
  // than paginated Supabase fetches, and lets us return EVERY view/click —
  // no 1000-row cap).
  const wwIds = [
    ...(streamingLinks || []).map((l) => l.ww_id),
    ...(downloadLinks || []).map((l) => l.ww_id),
    ...(digitalContents || []).map((l) => l.ww_id),
  ].filter(Boolean)

  const allLinkIds: string[] = [
    ...(streamingLinks || []).map((l) => l.id),
    ...(downloadLinks || []).map((l) => l.id),
    ...(digitalLinks || []).map((l) => l.id),
  ].filter(Boolean)

  let viewCount = 0
  const viewsPerLink: Record<string, number> = {}
  const clicksPerLink: Record<string, number> = {}
  const clicksPerWw: Record<string, number> = {}

  const db = await getDb()

  if (wwIds.length > 0) {
    const [viewsAgg, clicksByWwAgg] = await Promise.all([
      db
        .collection("embed_views")
        .aggregate([
          { $match: { ww_id: { $in: wwIds } } },
          { $group: { _id: "$ww_id", n: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection("link_clicks")
        .aggregate([
          { $match: { ww_id: { $in: wwIds } } },
          { $group: { _id: "$ww_id", n: { $sum: 1 } } },
        ])
        .toArray(),
    ])
    for (const v of viewsAgg as any[]) {
      if (v._id) {
        viewsPerLink[v._id] = v.n
        viewCount += v.n
      }
    }
    for (const c of clicksByWwAgg as any[]) {
      if (c._id) clicksPerWw[c._id] = c.n
    }
  }

  if (allLinkIds.length > 0) {
    const clicksAgg = await db
      .collection("link_clicks")
      .aggregate([
        { $match: { link_id: { $in: allLinkIds } } },
        { $group: { _id: "$link_id", n: { $sum: 1 } } },
      ])
      .toArray()
    for (const c of clicksAgg as any[]) {
      if (c._id) clicksPerLink[c._id] = c.n
    }
  }

  const totalClicks = Object.values(clicksPerLink).reduce((s, n) => s + n, 0)

  const streamingLinksWithViews = (streamingLinks || []).map((link) => ({
    ...link,
    view_count: viewsPerLink[link.ww_id] || 0,
    click_count: clicksPerLink[link.id] || 0,
  }))

  const downloadLinksWithViews = (downloadLinks || []).map((link) => ({
    ...link,
    view_count: viewsPerLink[link.ww_id] || 0,
    click_count: clicksPerLink[link.id] || 0,
  }))

  const digitalContentsWithViews = (digitalContents || []).map((content) => ({
    ...content,
    view_count: viewsPerLink[content.ww_id] || 0,
    click_count: clicksPerWw[content.ww_id] || 0,
  }))

  const digitalLinksWithClicks = (digitalLinks || []).map((link) => ({
    ...link,
    click_count: clicksPerLink[link.id] || 0,
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
          digitalLinks={digitalLinksWithClicks}
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
            totalClicks,
          }}
        />
      </main>
    </div>
  )
}
