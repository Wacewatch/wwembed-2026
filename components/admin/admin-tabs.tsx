"use client"

import { useState } from "react"
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

export function AdminTabs() {
  const [activeTab, setActiveTab] = useState("pending")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="pending">En Attente</TabsTrigger>
        <TabsTrigger value="apis">APIs Tiers</TabsTrigger>
        <TabsTrigger value="streaming">Liens Streaming</TabsTrigger>
        <TabsTrigger value="download">Liens Download</TabsTrigger>
        <TabsTrigger value="digital">Digital</TabsTrigger>
        <TabsTrigger value="livetv">TV Live</TabsTrigger>
        <TabsTrigger value="bugs">Bugs</TabsTrigger>
        <TabsTrigger value="ads">Publicites</TabsTrigger>
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="stats">Statistiques</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <PendingLinksManager />
      </TabsContent>

      <TabsContent value="apis">
        <ApiManager />
      </TabsContent>

      <TabsContent value="streaming">
        <StreamingLinksManager />
      </TabsContent>

      <TabsContent value="download">
        <DownloadLinksManager />
      </TabsContent>

      <TabsContent value="digital">
        <DigitalContentManager />
      </TabsContent>

      <TabsContent value="livetv">
        <LiveTVManager />
      </TabsContent>

      <TabsContent value="bugs">
        <BugReportsManager />
      </TabsContent>

      <TabsContent value="ads">
        <AdsManager />
      </TabsContent>

      <TabsContent value="users">
        <UsersManager />
      </TabsContent>

      <TabsContent value="stats">
        <StatsViewer />
      </TabsContent>
    </Tabs>
  )
}
