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

  // First get user's submitted links
  const [{ data: streamingLinks }, { data: downloadLinks }, { data: liveTvChannels }, { data: liveTvSources }] =
    await Promise.all([
      supabase
        .from("streaming_links")
        .select("*")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("download_links").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }),
      supabase
        .from("live_tv_channels")
        .select("*")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("live_tv_sources")
        .select("*")
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false }),
    ])

  // Then count views based on the fetched links
  const wwIds = [...(streamingLinks || []).map((l) => l.ww_id), ...(downloadLinks || []).map((l) => l.ww_id)].filter(
    Boolean,
  )

  let viewCount = 0
  if (wwIds.length > 0) {
    const { count } = await supabase.from("embed_views").select("*", { count: "exact", head: true }).in("ww_id", wwIds)
    viewCount = count || 0
  }

  const totalStreaming = streamingLinks?.length || 0
  const totalDownload = downloadLinks?.length || 0
  const totalLiveTv = (liveTvChannels?.length || 0) + (liveTvSources?.length || 0)
  const verifiedStreaming = streamingLinks?.filter((l) => l.status === "approved").length || 0
  const verifiedDownload = downloadLinks?.filter((l) => l.status === "approved").length || 0
  const verifiedLiveTv =
    (liveTvChannels?.filter((l) => l.status === "approved").length || 0) +
    (liveTvSources?.filter((l) => l.status === "approved").length || 0)

  const pendingCount =
    (streamingLinks?.filter((l) => l.status === "pending").length || 0) +
    (downloadLinks?.filter((l) => l.status === "pending").length || 0) +
    (liveTvChannels?.filter((l) => l.status === "pending").length || 0) +
    (liveTvSources?.filter((l) => l.status === "pending").length || 0)

  const rejectedCount =
    (streamingLinks?.filter((l) => l.status === "rejected").length || 0) +
    (downloadLinks?.filter((l) => l.status === "rejected").length || 0) +
    (liveTvChannels?.filter((l) => l.status === "rejected").length || 0) +
    (liveTvSources?.filter((l) => l.status === "rejected").length || 0)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <DashboardContent
          profile={profile}
          streamingLinks={streamingLinks || []}
          downloadLinks={downloadLinks || []}
          liveTvChannels={liveTvChannels || []}
          liveTvSources={liveTvSources || []}
          stats={{
            totalStreaming,
            totalDownload,
            totalLiveTv,
            verifiedStreaming,
            verifiedDownload,
            verifiedLiveTv,
            pendingCount,
            rejectedCount,
            totalViews: viewCount,
          }}
        />
      </main>
    </div>
  )
}
