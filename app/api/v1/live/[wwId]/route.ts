import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, props: { params: Promise<{ wwId: string }> }) {
  try {
    const params = await props.params
    const { wwId } = params
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
    const adsJson = JSON.stringify(activeAds.map(a => ({ id: a.id, url: a.ad_url }))).replace(/</g, "\\u003c")

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

.top{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:linear-gradient(135deg,rgba(15,15,25,0.98),rgba(20,20,35,0.95));backdrop-filter:blur(20px);position:relative;z-index:100;border-bottom:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.4);}
.top-left{display:flex;align-items:center;gap:16px;}
.logo{background:linear-gradient(135deg,#e63946,#ff6b6b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-size:22px;font-weight:800;letter-spacing:1.5px;text-shadow:0 0 30px rgba(230,57,70,0.4);display:flex;align-items:center;gap:8px;}
.logo::before{content:'▶';display:inline-block;animation:pulse 2s infinite;}
.channel-info{display:flex;align-items:center;gap:12px;padding:8px 16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.08);}
.channel-icon{width:42px;height:42px;border-radius:10px;object-fit:cover;background:linear-gradient(135deg,#1a1a2e,#2d2d44);border:2px solid rgba(255,255,255,0.15);box-shadow:0 4px 16px rgba(0,0,0,0.4);}
.channel-name{font-size:17px;font-weight:700;background:linear-gradient(135deg,#fff,#e0e0e0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.live-badge{background:linear-gradient(135deg,#e63946,#d62828);color:#fff;padding:5px 12px;border-radius:8px;font-size:11px;font-weight:800;letter-spacing:1px;box-shadow:0 4px 12px rgba(230,57,70,0.5);animation:pulseBadge 2s infinite;position:relative;overflow:hidden;}
.live-badge::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);animation:shine 3s infinite;}

@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.8;transform:scale(0.95);}}
@keyframes pulseBadge{0%,100%{box-shadow:0 4px 12px rgba(230,57,70,0.5);}50%{box-shadow:0 4px 20px rgba(230,57,70,0.8);}}
@keyframes shine{0%{left:-100%;}100%{left:200%;}}

.top-right{display:flex;align-items:center;gap:12px;}

.modern-btn{background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.15);color:#fff;padding:12px 20px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;align-items:center;gap:10px;position:relative;overflow:hidden;backdrop-filter:blur(10px);}
.modern-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(230,57,70,0.15),rgba(255,107,107,0.15));opacity:0;transition:opacity 0.3s;}
.modern-btn:hover::before{opacity:1;}
.modern-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(230,57,70,0.4);border-color:rgba(230,57,70,0.5);}
.modern-btn:active{transform:translateY(0);box-shadow:0 4px 12px rgba(230,57,70,0.3);}
.btn-icon{font-size:18px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));}

.mega-menu{position:absolute;top:calc(100% + 16px);right:0;background:linear-gradient(135deg,rgba(18,18,28,0.98),rgba(25,25,40,0.98));backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:12px;min-width:360px;display:none;box-shadow:0 20px 60px rgba(0,0,0,0.7);z-index:300;animation:slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1);max-height:75vh;overflow-y:auto;}
.mega-menu::before{content:'';position:absolute;top:-8px;right:24px;width:16px;height:16px;background:linear-gradient(135deg,rgba(18,18,28,0.98),rgba(25,25,40,0.98));border-left:1px solid rgba(255,255,255,0.12);border-top:1px solid rgba(255,255,255,0.12);transform:rotate(45deg);}
.mega-menu.show{display:block;}
.mega-menu::-webkit-scrollbar{width:8px;}
.mega-menu::-webkit-scrollbar-track{background:rgba(255,255,255,0.05);border-radius:10px;margin:8px;}
.mega-menu::-webkit-scrollbar-thumb{background:linear-gradient(135deg,#e63946,#d62828);border-radius:10px;border:2px solid rgba(0,0,0,0.2);}
.mega-menu::-webkit-scrollbar-thumb:hover{background:linear-gradient(135deg,#ff4d5a,#e63946);}

@keyframes slideDown{from{opacity:0;transform:translateY(-20px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}

.menu-header{padding:16px 18px;border-bottom:2px solid rgba(255,255,255,0.1);margin-bottom:12px;}
.menu-title{font-size:18px;font-weight:800;background:linear-gradient(135deg,#e63946,#ff6b6b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;display:flex;align-items:center;gap:10px;}
.menu-subtitle{font-size:12px;color:#888;margin-top:4px;font-weight:500;}

.menu-section{margin-bottom:16px;}
.menu-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.2px;padding:12px 18px 8px;font-weight:800;display:flex;align-items:center;gap:8px;}
.menu-label::before{content:'';width:3px;height:12px;background:linear-gradient(135deg,#e63946,#ff6b6b);border-radius:2px;}

.source-card{margin:6px 8px;padding:16px;border-radius:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);background:linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:2px solid rgba(255,255,255,0.08);position:relative;overflow:hidden;}
.source-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(230,57,70,0.2),rgba(255,107,107,0.15));opacity:0;transition:opacity 0.3s;}
.source-card:hover::before{opacity:1;}
.source-card:hover{transform:translateX(8px) scale(1.02);border-color:rgba(230,57,70,0.4);box-shadow:0 8px 24px rgba(230,57,70,0.2);}
.source-card.active{background:linear-gradient(135deg,rgba(230,57,70,0.25),rgba(255,107,107,0.2));border-color:#e63946;box-shadow:0 8px 24px rgba(230,57,70,0.4);transform:scale(1.02);}
.source-card.active::after{content:'✓';position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#4ade80;font-weight:900;font-size:22px;text-shadow:0 2px 8px rgba(74,222,128,0.5);}

.source-header{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.source-icon{width:48px;height:48px;background:linear-gradient(135deg,#e63946,#ff6b6b);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 16px rgba(230,57,70,0.3);position:relative;}
.source-icon::after{content:'';position:absolute;inset:0;border-radius:12px;background:linear-gradient(135deg,rgba(255,255,255,0.3),transparent);opacity:0.5;}
.source-info{flex:1;}
.source-name{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;}
.source-meta{display:flex;gap:6px;flex-wrap:wrap;}

.badge{padding:4px 10px;border-radius:8px;font-size:10px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;box-shadow:0 2px 8px rgba(0,0,0,0.3);}
.badge-quality{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;}
.badge-vf{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.badge-vost{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;}
.badge-multi{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;}
.badge-vo{background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;}

.player-select-wrapper{position:relative;margin:8px;}
.player-select{background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.05));border:2px solid rgba(255,255,255,0.12);color:#fff;padding:14px 18px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.3s;width:100%;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='14' height='8' viewBox='0 0 14 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L7 7L13 1' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:48px;}
.player-select:hover{background:linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.08));border-color:rgba(230,57,70,0.5);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.4);}
.player-select:focus{outline:none;border-color:#e63946;box-shadow:0 0 0 4px rgba(230,57,70,0.2);}
.player-select option{background:#1a1a2e;color:#fff;padding:12px;}

.menu-divider{height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);margin:16px 0;}

.action-btn{padding:14px 18px;border-radius:12px;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);display:flex;align-items:center;gap:12px;font-size:14px;color:#e0e0e0;border:none;background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));width:100%;text-align:left;margin:4px 8px;position:relative;overflow:hidden;font-weight:600;}
.action-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(230,57,70,0.15),rgba(255,107,107,0.15));opacity:0;transition:opacity 0.3s;}
.action-btn:hover::before{opacity:1;}
.action-btn:hover{color:#fff;transform:translateX(8px);background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05));}
.action-btn .icon{font-size:22px;width:32px;height:32px;background:linear-gradient(135deg,rgba(230,57,70,0.3),rgba(255,107,107,0.2));border-radius:10px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));}

.container{height:calc(100vh - 89px);position:relative;background:#0a0a0a;}
.player{width:100%;height:100%;position:relative;background:#0a0a0a;}
.player video,.player iframe{width:100%;height:100%;display:block;background:#0a0a0a;}
.player iframe{border:none;}
.no-src{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-size:16px;}

.floating-hint{position:absolute;top:100px;right:24px;background:linear-gradient(135deg,rgba(230,57,70,0.95),rgba(214,40,40,0.95));color:#fff;padding:16px 20px;border-radius:16px;font-size:14px;display:flex;align-items:center;gap:12px;animation:fadeIn 0.5s,float 4s ease-in-out infinite;z-index:50;max-width:320px;box-shadow:0 12px 32px rgba(230,57,70,0.5);border:2px solid rgba(255,255,255,0.2);backdrop-filter:blur(10px);}
.floating-hint.hidden{display:none;}
.hint-icon{font-size:28px;animation:bounce 2s infinite;}

@keyframes fadeIn{from{opacity:0;transform:translateY(-20px);}to{opacity:1;transform:translateY(0);}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}

.modal{position:fixed;inset:0;background:rgba(0,0,0,0.92);backdrop-filter:blur(16px);z-index:400;display:none;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.4s;}
.modal.sh{display:flex;}
.modal-content{background:linear-gradient(135deg,#12121c,#1a1a28);border-radius:24px;max-width:960px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;border:2px solid rgba(255,255,255,0.12);box-shadow:0 24px 80px rgba(0,0,0,0.9);animation:slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1);}
@keyframes slideUp{from{opacity:0;transform:translateY(40px) scale(0.9);}to{opacity:1;transform:translateY(0) scale(1);}}
.modal-header{padding:28px;border-bottom:2px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(230,57,70,0.15),rgba(255,107,107,0.1));}
.modal-title{font-size:24px;font-weight:800;background:linear-gradient(135deg,#e63946,#ff6b6b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.close-btn{background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:28px;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:all 0.3s;font-weight:300;}
.close-btn:hover{background:#e63946;transform:rotate(90deg) scale(1.1);box-shadow:0 8px 20px rgba(230,57,70,0.5);}
.modal-body{padding:28px;overflow-y:auto;}

textarea{width:100%;min-height:160px;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03));border:2px solid rgba(255,255,255,0.12);color:#fff;padding:16px;border-radius:14px;font-family:monospace;font-size:14px;resize:vertical;transition:all 0.3s;}
textarea:focus{outline:none;border-color:#e63946;box-shadow:0 0 0 4px rgba(230,57,70,0.2);background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04));}
.bug-info{background:linear-gradient(135deg,rgba(230,57,70,0.2),rgba(255,107,107,0.15));border:2px solid rgba(230,57,70,0.4);border-radius:14px;padding:18px;margin-bottom:20px;font-size:14px;color:#e0e0e0;line-height:1.6;}

.btn-submit{width:100%;padding:18px;background:linear-gradient(135deg,#e63946,#d62828);border:none;color:#fff;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;margin-top:18px;transition:all 0.3s;text-transform:uppercase;letter-spacing:1.5px;box-shadow:0 8px 24px rgba(230,57,70,0.4);}
.btn-submit:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(230,57,70,0.6);}
.btn-submit:active{transform:translateY(-1px);}

.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(251,146,60,0.96) 0%,rgba(249,115,22,0.96) 50%,rgba(234,88,12,0.96) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;backdrop-filter:blur(12px)}
.mc{background:rgba(255,255,255,0.98);border-radius:24px;padding:32px;max-width:440px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.5);}
.mc h2{color:#1a1a2e;margin-bottom:10px;font-size:22px;font-weight:800}
.mc-sub{color:#6b7280;font-size:14px;margin-bottom:20px}
.steps{display:flex;justify-content:center;gap:10px;margin-bottom:20px}
.step{width:12px;height:12px;border-radius:50%;background:#e5e7eb;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.3);box-shadow:0 4px 12px rgba(102,126,234,0.4);}
.step.done{background:#10b981;box-shadow:0 4px 12px rgba(16,185,129,0.4);}
.bx{border-radius:12px;padding:16px;margin:10px 0;text-align:left;display:flex;align-items:flex-start;gap:12px}
.bx svg{flex-shrink:0;width:22px;height:22px}
.bx-content b{display:block;font-size:15px;margin-bottom:4px;font-weight:700}
.bx-content span{font-size:13px;opacity:0.85;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:2px solid #ec4899;color:#9d174d}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:2px solid #10b981;color:#065f46}
.pb{height:6px;background:#e5e7eb;border-radius:4px;margin:16px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.4s;box-shadow:0 0 10px rgba(102,126,234,0.5);}
.bt{width:100%;padding:16px;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;margin-top:10px;text-transform:uppercase;letter-spacing:0.8px;transition:all 0.3s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 8px 20px rgba(102,126,234,0.4);}
.bp:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(102,126,234,0.6);}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 8px 20px rgba(16,185,129,0.4);}
.bn:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(16,185,129,0.6);}
.hi{display:none}
.cf{margin-top:16px;font-size:12px;color:#9ca3af}
.cf a{color:#667eea;font-weight:600}
.adtag{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:3px 8px;border-radius:6px;font-size:10px;margin-left:8px;font-weight:700;box-shadow:0 2px 8px rgba(239,68,68,0.4);}

.pip-btn{position:absolute;bottom:20px;right:20px;background:linear-gradient(135deg,rgba(230,57,70,0.95),rgba(214,40,40,0.95));color:#fff;border:none;padding:12px 20px;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;z-index:60;box-shadow:0 8px 24px rgba(230,57,70,0.5);transition:all 0.3s;backdrop-filter:blur(10px);}
.pip-btn:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(230,57,70,0.7);}
.pip-btn.hidden{display:none;}

.connection-badge{position:absolute;top:80px;left:20px;background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;z-index:55;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);}
.connection-badge.good{border-color:#10b981;}
.connection-badge.medium{border-color:#f59e0b;}
.connection-badge.poor{border-color:#ef4444;}
.connection-dot{width:8px;height:8px;border-radius:50%;background:#10b981;animation:pulse 2s infinite;}

.loading-skeleton{position:absolute;inset:0;background:linear-gradient(90deg,#1a1a2e 25%,#2d2d44 50%,#1a1a2e 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

@media(max-width:768px){
.top{flex-direction:column;gap:14px;padding:14px;}
.top-left,.top-right{width:100%;justify-content:space-between;}
.logo{font-size:19px;}
.channel-name{font-size:15px;}
.modern-btn{padding:10px 16px;font-size:13px;}
.mega-menu{min-width:unset;width:calc(100% - 32px);right:16px;left:16px;max-height:65vh;}
.source-card{padding:14px;}
.source-name{font-size:14px;}
.floating-hint{top:140px;font-size:13px;right:16px;max-width:260px;}
.container{height:calc(100vh - 160px);}
}
</style>

<!-- Histats.com START -->
<script type="text/javascript">
  var _Hasync = _Hasync || [];
  _Hasync.push(['Histats.start', '1,4996171,4,0,0,0,00010000']);
  _Hasync.push(['Histats.fasi', '1']);
  _Hasync.push(['Histats.track_hits', '']);

  (function() {
    var hs = document.createElement('script');
    hs.type = 'text/javascript';
    hs.async = true;
    hs.src = '//s10.histats.com/js15_as.js';
    (document.head || document.body).appendChild(hs);
  })();
</script>
<noscript>
  <a href="/" target="_blank">
    <img src="//sstatic1.histats.com/0.gif?4996171&101" alt="histats" />
  </a>
</noscript>
<!-- Histats.com END -->

</head>
<body>
<div class="top">
<div class="top-left">
<div class="logo">WWEMBED</div>
<div class="channel-info">
<img class="channel-icon" src="${channelLogo}" alt="${channelName}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23e63946%22%3E▶%3C/text%3E%3C/svg%3E'">
<div>
<span class="channel-name">${channelName}</span>
<div style="display:flex;gap:8px;margin-top:4px;">
<span class="live-badge">● LIVE</span>
</div>
</div>
</div>
</div>
<div class="top-right">
<button class="modern-btn" id="sourceBtn">
<span class="btn-icon">📡</span>
<span id="srcLabel">Source #1</span>
<span style="font-size:11px;opacity:0.7;">▼</span>
</button>
<div class="mega-menu" id="sourceMenu">
<div class="menu-header">
<div class="menu-title">
<span>📡</span>
<span>Sources disponibles</span>
</div>
<div class="menu-subtitle">Choisissez la meilleure source pour votre connexion</div>
</div>
<div class="menu-section">
<div class="menu-label">Lecteurs</div>
<div id="sourceList"></div>
</div>
</div>
<button class="modern-btn" id="settingsBtn">
<span class="btn-icon">⚙️</span>
<span>Paramètres</span>
<span style="font-size:11px;opacity:0.7;">▼</span>
</button>
<div class="mega-menu" id="settingsMenu">
<div class="menu-header">
<div class="menu-title">
<span>⚙️</span>
<span>Paramètres</span>
</div>
<div class="menu-subtitle">Personnalisez votre expérience de visionnage</div>
</div>
<div class="menu-section">
<div class="menu-label">Lecteur Vidéo</div>
<div class="player-select-wrapper">
<select class="player-select" id="playerSelector">
<option value="native">🎬 HTML5 Native</option>
<option value="hlsjs">⚡ HLS.js (Recommandé)</option>
<option value="videojs">🎥 Video.js</option>
<option value="plyr">▶️ Plyr</option>
</select>
</div>
</div>
<div class="menu-divider"></div>
<div class="menu-section">
<div class="menu-label">Actions rapides</div>
<button class="action-btn" id="reloadBtn">
<span class="icon">🔄</span>
<span>Recharger le lecteur</span>
</button>
<button class="action-btn" id="fullscreenBtn">
<span class="icon">⛶</span>
<span>Mode plein écran</span>
</button>
<button class="action-btn" id="pipBtn">
<span class="icon">📺</span>
<span>Picture-in-Picture</span>
</button>
<button class="action-btn" id="castBtn">
<span class="icon">📱</span>
<span>Diffuser sur appareil</span>
</button>
</div>
<div class="menu-divider"></div>
<button class="action-btn" onclick="toggleModal('bugModal');toggleDropdown('settingsMenu');">
<span class="icon">⚠️</span>
<span>Signaler un problème</span>
</button>
</div>
</div>
</div>
</div>
<div class="container">
<div class="connection-badge" id="connectionBadge" style="display:none;">
<div class="connection-dot"></div>
<span id="connectionText">Connexion rapide</span>
</div>
<div class="player" id="player">
<div class="loading-skeleton"></div>
<div class="floating-hint" id="helpHint">
<span class="hint-icon">💡</span>
<span>Astuce: Essayez un autre lecteur si la vidéo ne charge pas</span>
</div>
<div class="no-src">Initialisation du lecteur...</div>
</div>
</div>

<div class="modal" id="bugModal">
<div class="modal-content">
<div class="modal-header">
<span class="modal-title">⚠️ Signaler un problème</span>
<button class="close-btn" onclick="toggleModal('bugModal')">&times;</button>
</div>
<div class="modal-body">
<div class="bug-info">📝 Décrivez le problème rencontré avec cette source. Votre retour nous aide à améliorer le service en continu.</div>
<textarea id="bugDesc" placeholder="Exemple: La vidéo ne charge pas, le son est désynchronisé, le flux se coupe toutes les 2 minutes..."></textarea>
<button class="btn-submit" onclick="sendBug()">📤 Envoyer le rapport</button>
</div>
</div>
</div>

<div class="mo" id="adOverlay">
<div class="mc">
<h2>🎬 Accédez au flux en direct</h2>
<div class="mc-sub">Une dernière étape avant de profiter du contenu</div>
<div class="steps">
<div class="step active" id="step1"></div>
<div class="step" id="step2"></div>
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
<div class="bx-content"><b>✓ Tout est prêt !</b><span>Le flux va démarrer automatiquement</span></div>
</div>
<div class="pb"><div class="pf" id="progress"></div></div>
<button class="bt bp" id="btnUnlock">Continuer<span class="adtag">PUB</span></button>
<button class="bt bn hi" id="btnStart">▶️ Démarrer la lecture</button>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>

<script>
var _src=${sourcesJson};
var _ads=${adsJson};
var _hasAds=${hasAds};
var _adIndex=0;
var _idx=0;
var _started=false;
var _wwId="${wwId}";
var _channelName="${channelName.replace(/"/g, '\\"')}";
var _currentPlayer=null;
var _currentPlayerType="native";
var _lastSource=null;
var _retryCount=0;
var _maxRetries=3;

function $(id){return document.getElementById(id);}

// Détecter qualité connexion
function detectConnection(){
  var conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  var badge=$('connectionBadge');
  var text=$('connectionText');
  var dot=badge?badge.querySelector('.connection-dot'):null;
  
  if(!badge)return;
  
  badge.style.display='flex';
  
  if(conn){
    var type=conn.effectiveType;
    if(type==='4g'||type==='5g'){
      badge.className='connection-badge good';
      if(dot)dot.style.background='#10b981';
      if(text)text.textContent='Connexion rapide';
    }else if(type==='3g'){
      badge.className='connection-badge medium';
      if(dot)dot.style.background='#f59e0b';
      if(text)text.textContent='Connexion moyenne';
    }else{
      badge.className='connection-badge poor';
      if(dot)dot.style.background='#ef4444';
      if(text)text.textContent='Connexion lente';
    }
  }
  
  setTimeout(function(){
    if(badge)badge.style.display='none';
  },5000);
}

// Cache localStorage
function saveLastSource(idx){
  try{
    localStorage.setItem('lastSource_${wwId}',idx);
  }catch(e){}
}

function getLastSource(){
  try{
    return parseInt(localStorage.getItem('lastSource_${wwId}'))||0;
  }catch(e){
    return 0;
  }
}

function saveVolume(vol){
  try{
    localStorage.setItem('playerVolume',vol);
  }catch(e){}
}

function getVolume(){
  try{
    return parseFloat(localStorage.getItem('playerVolume'))||1;
  }catch(e){
    return 1;
  }
}

// Système popup anti-bloqueur
function openAdPopup(url){
  if(!url)return null;
  
  var methods=[
    function(){return window.open(url,'_blank','noopener,noreferrer');},
    function(){
      var a=document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    },
    function(){
      var form=document.createElement('form');
      form.method='GET';
      form.action=url;
      form.target='_blank';
      form.style.display='none';
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      return true;
    }
  ];
  
  for(var i=0;i<methods.length;i++){
    try{
      var result=methods[i]();
      if(result)return result;
    }catch(e){
      console.log('Method '+i+' failed:',e);
    }
  }
  
  window.location.href=url;
  return null;
}

function toggleDropdown(id){
  var menu=$(id);
  if(menu){
    var isShowing=menu.classList.contains("show");
    document.querySelectorAll(".mega-menu").forEach(function(m){m.classList.remove("show");});
    if(!isShowing)menu.classList.add("show");
  }
}

document.addEventListener("click",function(e){
  if(!e.target.closest(".top-right")){
    document.querySelectorAll(".mega-menu").forEach(function(m){m.classList.remove("show");});
  }
});

function tagClass(l){
  l=(l||"").toUpperCase();
  if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"badge-vf";
  if(l.indexOf("VOST")>=0)return"badge-vost";
  if(l.indexOf("MULTI")>=0)return"badge-multi";
  return"badge-vo";
}

function buildSourceList(){
  var list=$("sourceList");
  if(!list)return;
  if(!_src||!_src.length){
    list.innerHTML="<div style='text-align:center;padding:24px;color:#666;font-size:14px'>❌ Aucune source disponible</div>";
    return;
  }
  list.innerHTML="";
  for(var i=0;i<_src.length;i++){
    (function(index){
      var s=_src[index];
      var card=document.createElement("div");
      card.className="source-card"+(index===_idx?" active":"");
      card.innerHTML='<div class="source-header"><div class="source-icon">▶</div><div class="source-info"><div class="source-name">'+s.name+'</div><div class="source-meta"><span class="badge badge-quality">'+(s.quality||"HD")+'</span><span class="badge '+tagClass(s.language)+'">'+(s.language||"VO").toUpperCase()+'</span></div></div></div>';
      card.onclick=function(){
        _idx=index;
        saveLastSource(index);
        buildSourceList();
        $("srcLabel").textContent=s.name;
        toggleDropdown("sourceMenu");
        if(_started){
          cleanupPlayer();
          loadPlayer();
        }
      };
      list.appendChild(card);
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
    var skeleton=p.querySelector('.loading-skeleton');
    if(!skeleton){
      var sk=document.createElement('div');
      sk.className='loading-skeleton';
      p.appendChild(sk);
    }
  }
}

function loadPlayer(){
  var p=$("player");
  if(!p||!_src||!_src.length)return;
  var s=_src[_idx];
  if(!s||!s.url){
    p.innerHTML="<div class='no-src'>❌ Source indisponible</div>";
    if(_retryCount<_maxRetries&&_idx<_src.length-1){
      _retryCount++;
      _idx++;
      setTimeout(loadPlayer,2000);
    }
    return;
  }
  
  var url=s.url;
  var hint=$("helpHint");
  cleanupPlayer();
  
  var isIframe=url.indexOf("http")===0&&url.indexOf(".m3u8")===-1&&url.indexOf("m3u8")===-1;
  if(isIframe){
    setTimeout(function(){
      p.innerHTML='<iframe src="'+url+'" allowfullscreen allow="autoplay;fullscreen;encrypted-media;picture-in-picture"></iframe>';
      if(hint)hint.classList.add("hidden");
    },300);
    return;
  }
  
  if(hint)hint.classList.remove("hidden");
  _currentPlayerType=$("playerSelector").value;
  
  setTimeout(function(){
    var skeleton=p.querySelector('.loading-skeleton');
    if(skeleton)skeleton.remove();
    
    if(_currentPlayerType==="native"){
      p.innerHTML='<video id="vid" controls autoplay></video>';
      var vid=document.getElementById("vid");
      if(vid){
        vid.volume=getVolume();
        vid.src=url;
        vid.play().catch(function(e){console.log("Autoplay blocked:",e);});
        vid.onvolumechange=function(){saveVolume(vid.volume);};
      }
    }else if(_currentPlayerType==="hlsjs"){
      p.innerHTML='<video id="vid" controls autoplay></video>';
      var vid=document.getElementById("vid");
      if(vid&&typeof Hls!=="undefined"&&Hls.isSupported()){
        _currentPlayer=new Hls({enableWorker:true,lowLatencyMode:true});
        _currentPlayer.loadSource(url);
        _currentPlayer.attachMedia(vid);
        _currentPlayer.on(Hls.Events.MANIFEST_PARSED,function(){
          vid.volume=getVolume();
          vid.play().catch(function(){});
        });
        _currentPlayer.on(Hls.Events.ERROR,function(e,data){
          if(data.fatal){
            console.error("HLS error:",data);
            if(_retryCount<_maxRetries&&_idx<_src.length-1){
              _retryCount++;
              _idx++;
              loadPlayer();
            }
          }
        });
        vid.onvolumechange=function(){saveVolume(vid.volume);};
      }else if(vid){
        vid.volume=getVolume();
        vid.src=url;
        vid.play().catch(function(){});
        vid.onvolumechange=function(){saveVolume(vid.volume);};
      }
    }else if(_currentPlayerType==="videojs"){
      p.innerHTML='<video id="vid" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay></video>';
      setTimeout(function(){
        if(typeof videojs!=="undefined"){
          _currentPlayer=videojs("vid",{autoplay:true,controls:true,fluid:true});
          _currentPlayer.src({src:url,type:"application/x-mpegURL"});
          _currentPlayer.volume(getVolume());
          _currentPlayer.on('volumechange',function(){saveVolume(_currentPlayer.volume());});
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
                _currentPlayer=new Plyr(vid,{autoplay:true,volume:getVolume()});
                _currentPlayer.on('volumechange',function(){saveVolume(_currentPlayer.volume);});
              });
            }else{
              vid.src=url;
              _currentPlayer=new Plyr(vid,{autoplay:true,volume:getVolume()});
              _currentPlayer.on('volumechange',function(){saveVolume(_currentPlayer.volume);});
            }
          }
        }
      },100);
    }
  },300);
}

function sendBug(){
  var desc=$("bugDesc").value.trim();
  if(!desc){alert("⚠️ Veuillez décrire le problème");return;}
  $("bugDesc").disabled=true;
  var currentSource=_src[_idx]||{};
  fetch("/api/bug-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({wwId:_wwId,title:_channelName,sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:desc,embedType:"live"})})
  .then(function(r){return r.json()}).then(function(){
    $("bugModal").classList.remove("sh");
    alert("✅ Rapport envoyé avec succès !");
    $("bugDesc").disabled=false;
    $("bugDesc").value="";
  }).catch(function(){alert("❌ Erreur lors de l'envoi");$("bugDesc").disabled=false;});
}

function processAd(){
  if(_adIndex>=_ads.length){
    startPlayer();
    return;
  }
  
  var ad=_ads[_adIndex];
  
  fetch("/api/ads/click",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({adId:ad.id})
  }).catch(function(){});
  
  openAdPopup(ad.url);
  
  $("btnUnlock").classList.add("hi");
  if($("step1")){$("step1").classList.remove("active");$("step1").classList.add("done");}
  if($("step2"))$("step2").classList.add("active");
  if($("boxHelp"))$("boxHelp").classList.add("hi");
  if($("boxDone"))$("boxDone").classList.remove("hi");
  if($("progress"))$("progress").style.width="100%";
  if($("btnStart"))$("btnStart").classList.remove("hi");
  
  _adIndex++;
}

function startPlayer(){
  if(_started)return;
  _started=true;
  var ov=$("adOverlay");
  if(ov){
    ov.style.display="none";
    ov.classList.add("hi");
  }
  
  detectConnection();
  _idx=getLastSource();
  if(_idx>=_src.length)_idx=0;
  
  buildSourceList();
  if(_src&&_src.length){
    $("srcLabel").textContent=_src[_idx].name;
    loadPlayer();
  }
}

// Event listeners
$("sourceBtn")&&($("sourceBtn").onclick=function(){toggleDropdown("sourceMenu");});
$("settingsBtn")&&($("settingsBtn").onclick=function(){toggleDropdown("settingsMenu");});
$("playerSelector")&&($("playerSelector").onchange=function(){loadPlayer();});
$("reloadBtn")&&($("reloadBtn").onclick=function(){_retryCount=0;loadPlayer();toggleDropdown("settingsMenu");});

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

function togglePiP(){
  var vid=$("vid");
  if(!vid){toggleDropdown("settingsMenu");return;}
  if(document.pictureInPictureElement){
    document.exitPictureInPicture();
  }else if(vid.requestPictureInPicture){
    vid.requestPictureInPicture().catch(function(e){console.log('PiP error:',e);});
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
  }
  toggleDropdown("settingsMenu");
}

$("fullscreenBtn")&&($("fullscreenBtn").onclick=toggleFullscreen);
$("pipBtn")&&($("pipBtn").onclick=togglePiP);
$("castBtn")&&($("castBtn").onclick=initCast);

// Raccourcis clavier
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;
  var vid=$('vid');
  if(!vid)return;
  
  if(e.code==='Space'){
    e.preventDefault();
    if(vid.paused)vid.play();
    else vid.pause();
  }else if(e.code==='KeyF'){
    e.preventDefault();
    toggleFullscreen();
  }else if(e.code==='KeyM'){
    e.preventDefault();
    vid.muted=!vid.muted;
  }
});

// Initialisation
document.addEventListener("DOMContentLoaded",function(){
  buildSourceList();
  
  if(_hasAds&&_ads.length>0){
    var ov=$("adOverlay");
    if(ov)ov.style.display="flex";
    
    var btnUnlock=$("btnUnlock");
    var btnStart=$("btnStart");
    
    if(btnUnlock){
      btnUnlock.onclick=function(){
        processAd();
      };
    }
    
    if(btnStart){
      btnStart.onclick=function(){
        startPlayer();
      };
    }
  }else{
    startPlayer();
  }
});
</script>
</body>
</html>`

    return new NextResponse(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
  }catch(error){
    console.error("[v0] Live route error:",error)
    return NextResponse.json({error:"Internal server error"},{status:500})
  }
}
