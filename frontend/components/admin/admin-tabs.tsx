"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiManager } from "./api-manager"
import { StreamingLinksManager } from "./streaming-links-manager"
import { DownloadLinksManager } from "./download-links-manager"
import { UsersManager } from "./users-manager"
import { StatsViewer } from "./stats-viewer"
import { AdsManager } from "./ads-manager"
import { PendingLinksManager } from "./pending-links-manager"
import { LiveTVManager } from "./live-tv-manager"
import { DigitalContentManager } from "./digital-content-manager"
import { BugReportsManager } from "./bug-reports-manager"
import { SettingsManager } from "./settings-manager"
import { Clock, Globe, Play, Download, Book, Tv, Bug, Megaphone, Users, BarChart3, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function AdminTabs() {
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingBugsCount, setPendingBugsCount] = useState(0)

  useEffect(() => {
    async function fetchPendingBugs() {
      const supabase = createClient()
      const { count } = await supabase
        .from("bug_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      setPendingBugsCount(count || 0)
    }
    fetchPendingBugs()
  }, [activeTab])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <TabsList className="glass-subtle backdrop-blur-md flex-nowrap h-auto gap-1 p-1.5 w-max min-w-full rounded-2xl border border-white/5">
          <TabsTrigger
            value="pending"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Clock className="w-4 h-4" />
            <span>En Attente</span>
          </TabsTrigger>
          <TabsTrigger
            value="apis"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>APIs</span>
          </TabsTrigger>
          <TabsTrigger
            value="streaming"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Streaming</span>
          </TabsTrigger>
          <TabsTrigger
            value="download"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </TabsTrigger>
          <TabsTrigger
            value="digital"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Book className="w-4 h-4" />
            <span>Digital</span>
          </TabsTrigger>
          <TabsTrigger
            value="livetv"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Tv className="w-4 h-4" />
            <span>TV Live</span>
          </TabsTrigger>
          <TabsTrigger
            value="bugs"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all relative"
          >
            <Bug className="w-4 h-4" />
            <span>Bugs</span>
            {pendingBugsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ring-2 ring-background">
                {pendingBugsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="ads"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Megaphone className="w-4 h-4" />
            <span>Pubs</span>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Stats</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-2 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 whitespace-nowrap transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pending" className="mt-0">
        <PendingLinksManager />
      </TabsContent>

      <TabsContent value="apis" className="mt-0">
        <ApiManager />
      </TabsContent>

      <TabsContent value="streaming" className="mt-0">
        <StreamingLinksManager />
      </TabsContent>

      <TabsContent value="download" className="mt-0">
        <DownloadLinksManager />
      </TabsContent>

      <TabsContent value="digital" className="mt-0">
        <DigitalContentManager />
      </TabsContent>

      <TabsContent value="livetv" className="mt-0">
        <LiveTVManager />
      </TabsContent>

      <TabsContent value="bugs" className="mt-0">
        <BugReportsManager />
      </TabsContent>

      <TabsContent value="ads" className="mt-0">
        <AdsManager />
      </TabsContent>

      <TabsContent value="users" className="mt-0">
        <UsersManager />
      </TabsContent>

      <TabsContent value="stats" className="mt-0">
        <StatsViewer />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <SettingsManager />
      </TabsContent>
    </Tabs>
  )
}
