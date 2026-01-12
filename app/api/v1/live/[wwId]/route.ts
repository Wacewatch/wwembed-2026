import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, props: { params: { wwId: string } }) {
  try {
    const { wwId } = props.params
    const match = wwId.match(/^ww-live-(.+)$/i)
    if (!match) return new NextResponse("Invalid WW ID format", { status: 400 })

    const channelIdPart = match[1]
    const supabase = createAdminClient()

    let channel = null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (uuidRegex.test(channelIdPart)) {
      const { data } = await supabase
        .from("live_tv_channels")
        .select("*")
        .eq("id", channelIdPart)
        .eq("is_active", true)
        .eq("status", "approved")
        .single()
      channel = data
    }
    if (!channel) {
      const { data } = await supabase
        .from("live_tv_channels")
        .select("*")
        .ilike("id", channelIdPart + "%")
        .eq("is_active", true)
        .eq("status", "approved")
        .single()
      channel = data
    }
    if (!channel) return new NextResponse("Channel not found", { status: 404 })

    const { data: sources } = await supabase
      .from("live_tv_sources")
      .select("*")
      .eq("channel_id", channel.id)
      .eq("is_active", true)
      .eq("status", "approved")
      .order("priority", { ascending: true })

    const allSources =
      sources && sources.length > 0
        ? sources.map((s, i) => ({
            name: s.source_name || "Source #" + (i + 1),
            url: s.stream_url,
            quality: s.quality || "HD",
            language: s.language || "VO",
            priority: s.priority || 999,
          }))
        : channel.stream_url
          ? [
              {
                name: "Source #1",
                url: channel.stream_url,
                quality: channel.quality || "HD",
                language: channel.language || "VO",
                priority: 1,
              },
            ]
          : []

    if (allSources.length === 0) return new NextResponse("No sources available", { status: 404 })

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const activeAds = ads || []
    const hasAds = activeAds.length > 0
    const adUrl = hasAds ? activeAds[0].ad_url : ""
    const adId = hasAds ? activeAds[0].id : ""

    const { data: siteSettings } = await supabase.from("site_settings").select("*").single()
    const tickerEnabled = siteSettings?.live_tv_ticker_enabled ?? false
    const tickerMessage = siteSettings?.live_tv_ticker_message ?? ""
    const tickerSpeed = siteSettings?.live_tv_ticker_speed ?? 50
    const tickerBgColor = siteSettings?.live_tv_ticker_bg_color ?? "#ef4444"
    const tickerTextColor = siteSettings?.live_tv_ticker_text_color ?? "#ffffff"

    const referer = request.headers.get("referer") || request.headers.get("referrer") || null
    await supabase.from("embed_views").insert({
      ww_id: wwId,
      media_type: "live",
      embed_type: "live",
      tmdb_id: null,
      referrer: referer,
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c")
    const channelName = channel.channel_name || "Live TV"
    const channelLogo = channel.channel_logo || ""
    const animationDuration = Math.max(10, 100 - tickerSpeed / 2)

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>${channelName} - Live TV</title>
<link href="https://vjs.zencdn.net/8.5.2/video-js.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js"></script>
<script src="https://vjs.zencdn.net/8.5.2/video.min.js"></script>
<script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#fff;overflow:hidden;height:100vh;}

.top{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:linear-gradient(135deg,rgba(15,15,25,0.98),rgba(20,20,35,0.95));backdrop-filter:blur(20px);position:relative;z-index:100;border-bottom:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.4);}
.top-left{display:flex;align-items:center;gap:14px;}
.logo{background:linear-gradient(135deg,#e63946,#ff6b6b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-size:20px;font-weight:800;letter-spacing:1.2px;text-shadow:0 0 20px rgba(230,57,70,0.3);}
.channel-info{display:flex;align-items:center;gap:10px;}
.channel-icon{width:38px;height:38px;border-radius:8px;object-fit:cover;background:linear-gradient(135deg,#1a1a2e,#2d2d44);border:2px solid rgba(255,255,255,0.1);box-shadow:0 4px 12px rgba(0,0,0,0.3);}
.channel-name{font-size:16px;font-weight:600;background:linear-gradient(135deg,#fff,#e0e0e0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.live-badge{background:linear-gradient(135deg,#e63946,#d62828);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:0.8px;box-shadow:0 2px 8px rgba(230,57,70,0.4);animation:pulse 2s infinite;}

@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.85;}}

.top-right{display:flex;align-items:center;gap:10px;position:relative;}

.dropdown{position:relative;}
.dropdown-btn{background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.12);color:#fff;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;align-items:center;gap:8px;position:relative;overflow:hidden;}
.dropdown-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(230,57,70,0.1),rgba(255,107,107,0.1));opacity:0;transition:opacity 0.3s;}
.dropdown-btn:hover::before{opacity:1;}
.dropdown-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(230,57,70,0.3);border-color:rgba(230,57,70,0.4);}
.dropdown-btn.active{background:linear-gradient(135deg,#e63946,#d62828);border-color:#e63946;box-shadow:0 8px 24px rgba(230,57,70,0.4);}

.dropdown-menu{position:absolute;top:calc(100% + 12px);right:0;background:linear-gradient(135deg,rgba(18,18,28,0.98),rgba(25,25,40,0.98));backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:8px;min-width:280px;display:none;box-shadow:0 12px 48px rgba(0,0,0,0.6);z-index:300;animation:slideDown 0.3s cubic-bezier(0.4,0,0.2,1);max-height:70vh;overflow-y:auto;}
.dropdown-menu::before{content:'';position:absolute;top:-6px;right:20px;width:12px;height:12px;background:linear-gradient(135deg,rgba(18,18,28,0.98),rgba(25,25,40,0.98));border-left:1px solid rgba(255,255,255,0.12);border-top:1px solid rgba(255,255,255,0.12);transform:rotate(45deg);}
.dropdown-menu.show{display:block;}
.dropdown-menu::-webkit-scrollbar{width:6px;}
.dropdown-menu::-webkit-scrollbar-track{background:rgba(255,255,255,0.05);border-radius:10px;}
.dropdown-menu::-webkit-scrollbar-thumb{background:linear-gradient(135deg,#e63946,#d62828);border-radius:10px;}
.dropdown-menu::-webkit-scrollbar-thumb:hover{background:linear-gradient(135deg,#ff4d5a,#e63946);}

@keyframes slideDown{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}

.menu-section{margin-bottom:8px;}
.menu-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;padding:10px 14px 6px;font-weight:700;}

.menu-item{padding:12px 14px;border-radius:10px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:12px;font-size:14px;color:#e0e0e0;border:none;background:none;width:100%;text-align:left;position:relative;overflow:hidden;}
.menu-item::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(230,57,70,0.15),rgba(255,107,107,0.15));opacity:0;transition:opacity 0.2s;}
.menu-item:hover::before{opacity:1;}
.menu-item:hover{color:#fff;transform:translateX(4px);}
.menu-item.active{background:linear-gradient(135deg,rgba(230,57,70,0.2),rgba(255,107,107,0.15));color:#fff;font-weight:600;}
.menu-item .icon{font-size:18px;width:24px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));}

.menu-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);margin:8px 0;}

.player-select{background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.12);color:#fff;padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;width:100%;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;}
.player-select:hover{background:linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.08));border-color:rgba(230,57,70,0.4);}
.player-select option{background:#1a1a2e;color:#fff;padding:8px;}

.source-item{padding:12px 14px;border-radius:10px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.08);margin-bottom:6px;position:relative;overflow:hidden;}
.source-item::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(230,57,70,0.15),rgba(255,107,107,0.15));opacity:0;transition:opacity 0.2s;}
.source-item:hover::before{opacity:1;}
.source-item:hover{transform:translateX(4px);border-color:rgba(230,57,70,0.3);}
.source-item.active{background:linear-gradient(135deg,rgba(230,57,70,0.2),rgba(255,107,107,0.15));border-color:#e63946;box-shadow:0 4px 16px rgba(230,57,70,0.3);}
.source-item.active::after{content:'✓';position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#4ade80;font-weight:700;font-size:16px;}

.source-left{display:flex;align-items:center;gap:10px;}
.source-icon{font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));}
.source-name{font-size:14px;font-weight:600;color:#fff;}
.source-tags{display:flex;gap:6px;margin-top:4px;}
.source-tag{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:0.5px;}
.tag-quality{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;box-shadow:0 2px 8px rgba(139,92,246,0.3);}
.tag-lang{background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;box-shadow:0 2px 8px rgba(6,182,212,0.3);}
.tag-vf{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.tag-vost{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;}
.tag-multi{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;}

.container{height:calc(100vh - 73px);position:relative;background:#0a0a0a;}
.player{width:100%;height:100%;position:relative;background:#0a0a0a;}
.player video,.player iframe{width:100%;height:100%;display:block;background:#0a0a0a;}
.player iframe{border:none;}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-size:16px;}

.help-hint{position:absolute;top:90px;right:20px;background:linear-gradient(135deg,rgba(230,57,70,0.95),rgba(214,40,40,0.95));color:#fff;padding:12px 16px;border-radius:12px;font-size:13px;display:flex;align-items:center;gap:8px;animation:fadeIn 0.4s,float 3s ease-in-out infinite;z-index:50;max-width:280px;box-shadow:0 8px 24px rgba(230,57,70,0.4);border:1px solid rgba(255,255,255,0.2);}
.help-hint.hidden{display:none;}

@keyframes fadeIn{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}

.modal{position:fixed;inset:0;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);z-index:400;display:none;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s;}
.modal.sh{display:flex;}
.modal-content{background:linear-gradient(135deg,#12121c,#1a1a28);border-radius:20px;max-width:900px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.12);box-shadow:0 20px 60px rgba(0,0,0,0.8);}
.modal-header{padding:24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(230,57,70,0.1),rgba(255,107,107,0.05));}
.modal-title{font-size:22px;font-weight:700;background:linear-gradient(135deg,#fff,#e0e0e0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.close-btn{background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:24px;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:all 0.2s;}
.close-btn:hover{background:#e63946;transform:rotate(90deg);}
.modal-body{padding:24px;overflow-y:auto;}

textarea{width:100%;min-height:140px;background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);color:#fff;padding:14px;border-radius:12px;font-family:monospace;font-size:13px;resize:vertical;transition:all 0.2s;}
textarea:focus{outline:none;border-color:#e63946;box-shadow:0 0 0 3px rgba(230,57,70,0.2);}
.bug-info{background:linear-gradient(135deg,rgba(230,57,70,0.15),rgba(255,107,107,0.1));border:1px solid rgba(230,57,70,0.3);border-radius:12px;padding:14px;margin-bottom:18px;font-size:13px;color:#e0e0e0;}

.btn-submit{width:100%;padding:14px;background:linear-gradient(135deg,#e63946,#d62828);border:none;color:#fff;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:16px;transition:all 0.3s;text-transform:uppercase;letter-spacing:1px;}
.btn-submit:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(230,57,70,0.4);}

.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(251,146,60,0.95) 0%,rgba(249,115,22,0.95) 50%,rgba(234,88,12,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px)}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:20px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content b{display:block;font-size:14px;margin-bottom:2px}
.bx-content span{font-size:12px;opacity:0.8}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:11px;color:#9ca3af}
.cf a{color:#667eea}
.adtag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}

@media(max-width:768px){
.top{flex-direction:column;gap:12px;padding:12px;}
.top-left,.top-right{width:100%;justify-content:space-between;}
.logo{font-size:18px;}
.channel-name{font-size:14px;}
.dropdown-btn{padding:8px 14px;font-size:13px;}
.dropdown{width:100%;}
.dropdown-menu{min-width:unset;width:100%;right:0;left:0;max-height:60vh;}
.source-item{padding:10px 12px;}
.source-name{font-size:13px;}
.help-hint{top:130px;font-size:12px;right:12px;max-width:220px;}
}
</style>
</head>
<body>
<div class="top">
<div class="top-left">
<div class="logo">▶ WWEMBED</div>
<div class="channel-info">
<img class="channel-icon" src="${channelLogo}" alt="${channelName}">
<span class="channel-name">${channelName}</span>
<span class="live-badge">● LIVE</span>
</div>
</div>
<div class="top-right">
<div class="dropdown">
<button class="dropdown-btn" id="sourceBtn">
<span>📡</span>
<span id="srcLabel">Source #1</span>
<span style="font-size:10px;opacity:0.7;">▼</span>
</button>
<div class="dropdown-menu" id="sourceMenu">
<div class="menu-label">Sources disponibles</div>
<div id="sourceList"></div>
</div>
</div>
<div class="dropdown">
<button class="dropdown-btn" id="settingsBtn">
<span>⚙</span>
<span>Paramètres</span>
<span style="font-size:10px;opacity:0.7;">▼</span>
</button>
<div class="dropdown-menu" id="settingsMenu">
<div class="menu-section">
<div class="menu-label">Lecteur Vidéo</div>
<select class="player-select" id="playerSelector">
<option value="native">HTML5 Native</option>
<option value="hlsjs">HLS.js</option>
<option value="videojs">Video.js</option>
<option value="plyr">Plyr</option>
</select>
</div>
<div class="menu-divider"></div>
<div class="menu-section">
<div class="menu-label">Actions</div>
<button class="menu-item" id="reloadBtn">
<span class="icon">🔄</span>
<span>Recharger le lecteur</span>
</button>
<button class="menu-item" id="fullscreenBtn">
<span class="icon">⛶</span>
<span>Mode plein écran</span>
</button>
<button class="menu-item" id="castBtn">
<span class="icon">📱</span>
<span>Diffuser sur appareil</span>
</button>
</div>
<div class="menu-divider"></div>
<button class="menu-item" onclick="toggleModal('bugModal');toggleDropdown('settingsMenu');">
<span class="icon">⚠</span>
<span>Signaler un problème</span>
</button>
</div>
</div>
</div>
</div>
</div>
<div class="container">
<div class="player" id="player">
<div class="help-hint" id="helpHint">💡 Astuce: Si la lecture ne fonctionne pas, essayez un autre lecteur</div>
<div class="no-src">Chargement du flux...</div>
</div>
</div>

<div class="modal" id="bugModal">
<div class="modal-content">
<div class="modal-header">
<span class="modal-title">⚠ Signaler un problème</span>
<button class="close-btn" onclick="toggleModal('bugModal')">&times;</button>
</div>
<div class="modal-body">
<div class="bug-info">📝 Décrivez le problème que vous rencontrez avec cette source. Votre retour nous aide à améliorer le service.</div>
<textarea id="bugDesc" placeholder="Exemple: La vidéo ne charge pas, le son est désynchronisé, le flux se coupe régulièrement..."></textarea>
<button class="btn-submit" onclick="sendBug()">Envoyer le rapport</button>
</div>
</div>
</div>

<div class="mo" id="adOverlay">
<div class="mc">
<h2>Accédez au flux en direct</h2>
<div class="mc-sub">Une dernière étape avant de regarder</div>
<div class="steps">
<div class="step active" id="step1"></div>
<div class="step" id="step2"></div>
<div class="step" id="step3"></div>
</div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh" id="boxHelp">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<div class="bx bo hi" id="boxDone">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div class="bx-content"><b>Tout est prêt !</b><span>Le flux va démarrer</span></div>
</div>
<div class="pb"><div class="pf" id="progress"></div></div>
<button class="bt bp" id="btnUnlock">Continuer<span class="adtag">PUB</span></button>
<button class="bt bn hi" id="btnStart">Démarrer la lecture</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>

<script>
var _src=${sourcesJson};
var _ads=${JSON.stringify(activeAds)};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _adIndex=0;
var _idx=0;
var _started=false;
var _wwId="${wwId}";
var _channelName="${channelName.replace(/"/g, '\\"')}";
var _currentPlayer=null;
var _currentPlayerType="native";

function $(id){return document.getElementById(id);}

function toggleDropdown(id){
var menu=$(id);
if(menu){
var isShowing=menu.classList.contains("show");
document.querySelectorAll(".dropdown-menu").forEach(function(m){m.classList.remove("show");});
if(!isShowing)menu.classList.add("show");
}
}

document.addEventListener("click",function(e){
if(!e.target.closest(".dropdown")){
document.querySelectorAll(".dropdown-menu").forEach(function(m){m.classList.remove("show");});
}
});

function tagClass(l){
l=(l||"").toUpperCase();
if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"tag-vf";
if(l.indexOf("VOST")>=0)return"tag-vost";
if(l.indexOf("MULTI")>=0)return"tag-multi";
return"tag-lang";
}

function buildSourceList(){
var list=$("sourceList");
if(!list)return;
if(!_src||!_src.length){
list.innerHTML="<div style='text-align:center;padding:20px;color:#666'>Aucune source disponible</div>";
return;
}
list.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(index){
var s=_src[index];
var item=document.createElement("div");
item.className="source-item"+(index===_idx?" active":"");
item.innerHTML='<div class="source-left"><span class="source-icon">▶</span><div><div class="source-name">'+s.name+'</div><div class="source-tags"><span class="source-tag tag-quality">'+(s.quality||"HD")+'</span><span class="source-tag '+tagClass(s.language)+'">'+(s.language||"VO").toUpperCase()+'</span></div></div></div>';
item.onclick=function(){
_idx=index;
buildSourceList();
$("srcLabel").textContent=s.name;
toggleDropdown("sourceMenu");
if(_started){
cleanupPlayer();
loadPlayer();
}
};
list.appendChild(item);
})(i);
}
}

function toggleModal(id){var m=$(id);if(m)m.classList.toggle("sh");}

function cleanupPlayer(){
if(_currentPlayer){
try{
if(_currentPlayerType==="hlsjs"&&_currentPlayer.destroy){_currentPlayer.destroy();}
else if(_currentPlayerType==="plyr"&&_currentPlayer.destroy){_currentPlayer.destroy();}
else if(_currentPlayerType==="videojs"&&_currentPlayer.dispose){_currentPlayer.dispose();}
}catch(e){}
_currentPlayer=null;
}
var p=$("player");
if(p){
var iframes=p.querySelectorAll("iframe");
for(var i=0;i<iframes.length;i++){iframes[i].remove();}
var videos=p.querySelectorAll("video");
for(var i=0;i<videos.length;i++){videos[i].remove();}
}
}

function loadPlayer(){
var p=$("player");if(!p||!_src||!_src.length)return;
var s=_src[_idx];if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
var url=s.url;
var hint=$("helpHint");
cleanupPlayer();

var isIframe=url.indexOf("http")===0&&url.indexOf(".m3u8")===-1&&url.indexOf("m3u8")===-1;
if(isIframe){
p.innerHTML='<iframe src="'+url+'" allowfullscreen allow="autoplay;fullscreen;encrypted-media;picture-in-picture"></iframe>';
if(hint)hint.classList.add("hidden");
return;
}

if(hint)hint.classList.remove("hidden");

_currentPlayerType=$("playerSelector").value;

if(_currentPlayerType==="native"){
p.innerHTML='<video id="vid" controls autoplay></video>';
var vid=document.getElementById("vid");
if(vid){
vid.src=url;
vid.play().catch(function(e){console.log("Autoplay blocked:",e);});
}
}else if(_currentPlayerType==="hlsjs"){
p.innerHTML='<video id="vid" controls autoplay></video>';
var vid=document.getElementById("vid");
if(vid&&typeof Hls!=="undefined"&&Hls.isSupported()){
_currentPlayer=new Hls({enableWorker:true,lowLatencyMode:true});
_currentPlayer.loadSource(url);
_currentPlayer.attachMedia(vid);
_currentPlayer.on(Hls.Events.MANIFEST_PARSED,function(){vid.play().catch(function(){});});
_currentPlayer.on(Hls.Events.ERROR,function(e,data){if(data.fatal){console.error("HLS error:",data);}});
}else if(vid){vid.src=url;vid.play().catch(function(){});}
}else if(_currentPlayerType==="videojs"){
p.innerHTML='<video id="vid" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay></video>';
setTimeout(function(){
if(typeof videojs!=="undefined"){
_currentPlayer=videojs("vid",{autoplay:true,controls:true,fluid:true});
_currentPlayer.src({src:url,type:"application/x-mpegURL"});
}
},100);
}else if(_currentPlayerType==="plyr"){
p.innerHTML='<video id="vid" controls autoplay></video>';
setTimeout(function(){
if(typeof Plyr!=="undefined"){
var vid=document.getElementById("vid");
if(vid){
if(typeof Hls!=="undefined"&&Hls.isSupported()){
var hls=new Hls();
hls.loadSource(url);
hls.attachMedia(vid);
hls.on(Hls.Events.MANIFEST_PARSED,function(){
_currentPlayer=new Plyr(vid,{autoplay:true});
});
}else{
vid.src=url;
_currentPlayer=new Plyr(vid,{autoplay:true});
}
}
}
},100);
}
}

function sendBug(){
var desc=$("bugDesc").value.trim();
if(!desc){alert("Veuillez décrire le problème");return;}
$("bugDesc").disabled=true;
var currentSource=_src[_idx]||{};
fetch("/api/bug-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:_wwId,title:_channelName,sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:desc,embedType:"live"})})
.then(function(r){return r.json()}).then(function(){
$("bugModal").classList.remove("sh");
alert("✓ Rapport envoyé avec succès !");
$("bugDesc").disabled=false;
$("bugDesc").value="";
}).catch(function(){alert("Erreur lors de l'envoi");$("bugDesc").disabled=false;});
}

$("sourceBtn")&&($("sourceBtn").onclick=function(){toggleDropdown("sourceMenu");});
$("settingsBtn")&&($("settingsBtn").onclick=function(){toggleDropdown("settingsMenu");});
$("playerSelector")&&($("playerSelector").onchange=function(){loadPlayer();toggleDropdown("settingsMenu");});
$("reloadBtn")&&($("reloadBtn").onclick=function(){loadPlayer();toggleDropdown("settingsMenu");});

function toggleFullscreen(){
var p=$("player");
if(!document.fullscreenElement&&!document.webkitFullscreenElement){
if(p.requestFullscreen){p.requestFullscreen();}
else if(p.webkitRequestFullscreen){p.webkitRequestFullscreen();}
}else{
if(document.exitFullscreen){document.exitFullscreen();}
else if(document.webkitExitFullscreen){document.webkitExitFullscreen();}
}
toggleDropdown("settingsMenu");
}

function initCast(){
var vid=$("vid");
if(!vid){toggleDropdown("settingsMenu");return;}
if('RemotePlayback' in HTMLMediaElement.prototype){
vid.remote.watchAvailability(function(available){
if(available){
vid.remote.prompt().catch(function(){});
}
}).catch(function(){});
}else if(window.chrome&&chrome.cast){
chrome.cast.requestSession(function(s){
var mediaInfo=new chrome.cast.media.MediaInfo(_src[_idx].url,"application/x-mpegURL");
var request=new chrome.cast.media.LoadRequest(mediaInfo);
s.loadMedia(request);
},function(){});
}
toggleDropdown("settingsMenu");
}

function startPlayer(){
if(_started)return;
_started=true;
var ov=$("adOverlay");
if(ov){
ov.style.display="none";
ov.classList.add("hi");
}
buildSourceList();
if(_src&&_src.length){
$("srcLabel").textContent=_src[0].name;
loadPlayer();
}
}

function processAd(){
if(_adIndex>=_ads.length)return startPlayer();
var ad=_ads[_adIndex];

window.open(ad.url, '_blank');

// Track ad click
fetch("/api/ads/click",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({adId:ad.id})
}).catch(function(){});

_adIndex++;

var s1=$("step1"),s2=$("step2"),s3=$("step3");
if(s1)s1.classList.remove("active");if(s1)s1.classList.add("done");
if(s2)s2.classList.add("active");
if(s3)s3.classList.remove("active");if(s3)s3.classList.add("done");

if(_adIndex<_ads.length){
setTimeout(processAd, 5000); // Process next ad after 5 seconds
}
}

function updateAdCounter(){
var ov=$("adOverlay");
var pr=$("progress");
if(ov&&pr){
var width=(_adIndex+1)/_ads.length*100+"%";
pr.style.width=width;
}
}

if(_h&&_ads.length>0){
var ov=$("adOverlay");
if(ov)ov.style.display="flex";
updateAdCounter();
var btnUnlock=$("btnUnlock");
var btnStart=$("btnStart");
if(btnUnlock)btnUnlock.onclick=function(){processAd();};
if(btnStart)btnStart.onclick=function(){
var ov=$("adOverlay");
if(ov){
ov.style.display="none";
ov.classList.add("hi");
}
startPlayer();
};
}else{
startPlayer();
}

$("fullscreenBtn")&&($("fullscreenBtn").onclick=toggleFullscreen);
$("castBtn")&&($("castBtn").onclick=initCast);

(function() {
  var _sources = ${sourcesJson};
  var _currentSourceIdx = 0;
  var _playerType = "native";
  var _adUrl = "${adUrl}";
  var _adId = "${adId}";
  var _hasAds = ${hasAds};
  var _started = false;
  var _player = null;
  var _hls = null;
  var _popupWin = null;

  document.addEventListener("DOMContentLoaded", function() {
    var btnStart = document.getElementById("btnStart");
    
    if (btnStart) {
      btnStart.addEventListener("click", function(e) {
        e.preventDefault();
        
        if (_hasAds && _adUrl) {
          fetch("/api/ads/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adId: _adId })
          });
          
          _popupWin = window.open(_adUrl, '_blank');
        }
        
        var overlay = document.getElementById("adOverlay");
        if (overlay) {
          overlay.style.display = "none";
          overlay.classList.add("hi");
        }
        
        if (_sources.length > 0 && !_started) {
          _started = true;
          loadSource(0);
        }
      });
    }

    if (_hasAds) {
      var overlay = document.getElementById("adOverlay");
      if (overlay) overlay.style.display = "flex";
    } else {
      if (_sources.length > 0) loadSource(0);
    }
  });
})();
</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (error) {
    console.error("[v0] Live route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
