import type { DownloadLink } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface DownloadLinksProps {
  links: DownloadLink[]
}

export function DownloadLinks({ links }: DownloadLinksProps) {
  if (links.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <p className="text-muted-foreground">Aucun lien de téléchargement disponible</p>
      </div>
    )
  }

  const groupedLinks = links.reduce(
    (acc, link) => {
      const type = link.link_type
      if (!acc[type]) acc[type] = []
      acc[type].push(link)
      return acc
    },
    {} as Record<string, DownloadLink[]>,
  )

  return (
    <div className="space-y-4">
      {Object.entries(groupedLinks).map(([type, typeLinks]) => (
        <div key={type} className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-secondary/50 border-b border-border">
            <h4 className="font-medium text-foreground capitalize">
              {type === "direct" ? "Téléchargement Direct" : type === "torrent" ? "Torrents" : "Liens Magnet"}
            </h4>
          </div>
          <div className="divide-y divide-border">
            {typeLinks.map((link) => (
              <a
                key={link.id}
                href={link.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{link.source_name}</span>
                  <Badge variant="secondary">{link.quality}</Badge>
                  {link.file_size && <span className="text-xs text-muted-foreground">{link.file_size}</span>}
                  {link.is_verified && (
                    <Badge variant="default" className="bg-green-600">
                      Vérifié
                    </Badge>
                  )}
                </div>
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
