import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  try {
    const { wwId } = await params

    if (!wwId) {
      return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })
    }

    console.log("[v0] Streaming request for wwId:", wwId)

    const parsed = parseWWId(wwId)
    console.log("[v0] Parsed wwId:", parsed)

    if (!parsed) {
      console.log("[v0] Invalid WW ID format")
      return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })
    }

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    // Fetch ads
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""
    const adCount = ads ? ads.length : 0

    // Get TMDB data for title
    const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)

    let episodeData = null
    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      episodeData = await getEpisodeDetails(tmdbId, seasonNumber, episodeNumber)
    }

    let title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown Media"
    if (episodeData) {
      title = title + " - S" + seasonNumber + "E" + episodeNumber
    }

    // Get streaming links
    let streamingQuery = supabase
      .from("streaming_links")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("is_active", true)
      .eq("status", "approved")

    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      streamingQuery = streamingQuery.eq("season_number", seasonNumber).eq("episode_number", episodeNumber)
    }

    const { data: userLinks } = await streamingQuery

    // Get auto-generated from APIs
    const { data: apis } = await supabase
      .from("third_party_apis")
      .select("*")
      .eq("api_type", "streaming")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    const autoLinks = (apis || [])
      .filter((api) => {
        if (mediaType === "movie") {
          return !!(api.url_pattern_movie || api.url_pattern)
        } else {
          return !!api.url_pattern_tv
        }
      })
      .map((api, index) => {
        let url: string
        if (mediaType === "movie") {
          const pattern = api.url_pattern_movie || api.url_pattern || ""
          url = pattern
            .replace(/{tmdb_id}/g, String(tmdbId))
            .replace(/{media_type}/g, "movie")
            .replace(/{season}/g, "")
            .replace(/{episode}/g, "")
            .replace(/\/+$/g, "") // Remove trailing slashes
            .replace(/\/\/+/g, "/") // Replace multiple slashes with single slash
        } else {
          const pattern = api.url_pattern_tv || api.url_pattern || ""
          url = pattern
            .replace(/{tmdb_id}/g, String(tmdbId))
            .replace(/{media_type}/g, "tv")
            .replace(/{season}/g, String(seasonNumber || 1))
            .replace(/{episode}/g, String(episodeNumber || 1))
        }
        return { name: "Source #" + (index + 1), url, quality: "HD" }
      })

    const allSources = [
      ...autoLinks,
      ...(userLinks || []).map((l, i) => ({
        name: "Source #" + (autoLinks.length + i + 1),
        url: l.source_url,
        quality: l.quality || "HD",
      })),
    ]

    console.log("[v0] All sources generated:", allSources.length)
    console.log("[v0] Sources:", JSON.stringify(allSources, null, 2))

    // Log embed view
    await supabase.from("embed_views").insert({
      ww_id: wwId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      season_number: seasonNumber ?? null,
      episode_number: episodeNumber ?? null,
      embed_type: "streaming",
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    })

    const sourcesJson = JSON.stringify(allSources).replace(/'/g, "\\'")

    const ids = {
      overlay: generateRandomId("m"),
      player: generateRandomId("p"),
      sources: generateRandomId("s"),
      timer: generateRandomId("t"),
      progress: generateRandomId("g"),
      btnUnlock: generateRandomId("u"),
      btnPlay: generateRandomId("y"),
      boxTime: generateRandomId("bt"),
      boxHelp: generateRandomId("bh"),
      boxThanks: generateRandomId("bk"),
      boxDone: generateRandomId("bd"),
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;overflow-x:hidden}
.vp{width:100%;height:100vh;display:flex;flex-direction:column}
.vf{flex:1;position:relative;background:#000;min-height:0}
.vf iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.vs{padding:8px;background:#162230;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-shrink:0}
.vs::-webkit-scrollbar{display:none}
.vb{padding:8px 14px;background:#1e3a4f;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px;white-space:nowrap;flex-shrink:0;transition:background 0.2s}
.vb:hover,.vb:active{background:#2a5a7f}
.vb.va{background:#14B8A6}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.mo.mh{display:none}
.mc{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center;max-height:90vh;overflow-y:auto}
.mc h2{color:#5b6b8a;margin-bottom:16px;font-size:18px}
.bx{border-radius:8px;padding:10px 12px;margin:8px 0;text-align:left}
.bw{background:#fef3cd;border:2px solid #ffc107;color:#856404}
.bh{background:#ffe4d6;border:2px solid #ff9a6c;color:#c44d00}
.bi{background:#fff3cd;border:2px solid #ffc107;color:#664d03}
.bo{background:#d4edda;border:2px solid #28a745;color:#155724}
.bx b{display:block;font-size:13px}
.bx span{font-size:11px;opacity:0.8}
.pb{height:5px;background:#e0e0e0;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s}
.bt{width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;transition:transform 0.1s}
.bt:active{transform:scale(0.98)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bg{background:#28a745;color:#fff}
.hd{display:none}
.ft{margin-top:12px;font-size:10px;color:#888}
.ft a{color:#667eea}
.tg{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
@media(max-width:480px){
.mc{padding:16px;border-radius:12px}
.mc h2{font-size:16px;margin-bottom:12px}
.bx{padding:8px 10px;margin:6px 0}
.bx b{font-size:12px}
.bx span{font-size:10px}
.bt{padding:10px;font-size:12px}
.vs{padding:6px}
.vb{padding:6px 10px;font-size:11px}
}
</style>
</head>
<body>
<div class="vp">
<div class="vf" id="${ids.player}"></div>
<div class="vs" id="${ids.sources}"></div>
</div>
<script>
(function(){
var _d=${sourcesJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _c=0;
var _ids=${JSON.stringify(ids)};

function _r(t,c,p){
var e=document.createElement(t);
if(c)e.className=c;
if(p)p.appendChild(e);
return e;
}

function _bs(){
var c=document.getElementById(_ids.sources);
if(!c)return;
if(_d.length===0){
c.innerHTML='<span style="color:#5a7a8a;padding:8px">Aucune source</span>';
return;
}
c.innerHTML="";
for(var i=0;i<_d.length;i++){
var b=_r("button","vb"+(i===0?" va":""),c);
b.textContent=_d[i].name+" ("+_d[i].quality+")";
b.setAttribute("data-idx",i);
b.onclick=function(){
var idx=parseInt(this.getAttribute("data-idx"));
_c=idx;
var all=document.querySelectorAll(".vb");
for(var j=0;j<all.length;j++)all[j].classList.remove("va");
this.classList.add("va");
_li();
};
}
}

function _li(){
var p=document.getElementById(_ids.player);
if(!p||_d.length===0)return;
var f=_r("iframe");
f.src=_d[_c].url;
f.setAttribute("allowfullscreen","true");
f.setAttribute("allow","accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");
p.innerHTML="";
p.appendChild(f);
}

function _sp(){
var o=document.getElementById(_ids.overlay);
if(o)o.classList.add("mh");
_bs();
_li();
}

function _cm(){
if(!_h||!_u){_sp();return;}
var o=_r("div","mo",document.body);
o.id=_ids.overlay;
var mc=_r("div","mc",o);
var h2=_r("h2",null,mc);
h2.textContent="Votre video vous attend";
var bw=_r("div","bx bw",mc);
bw.innerHTML="<b>Verification en cours</b><span>Merci de patienter</span>";
var bh=_r("div","bx bh",mc);
bh.id=_ids.boxHelp;
bh.innerHTML="<b>Cela aide a maintenir le service gratuit</b>";
var bi=_r("div","bx bi",mc);
bi.id=_ids.boxTime;
bi.innerHTML="<b>Temps estime : <span id='"+_ids.timer+"'>5</span> secondes</b><span>Cliquez, fermez la fenetre, et profitez !</span>";
var bk=_r("div","bx bo hd",mc);
bk.id=_ids.boxThanks;
bk.innerHTML="<b>Merci pour votre soutien !</b>";
var bd=_r("div","bx bo hd",mc);
bd.id=_ids.boxDone;
bd.innerHTML="<b>Pret !</b><span>Cliquez ci-dessous pour lancer</span>";
var pb=_r("div","pb",mc);
var pf=_r("div","pf",pb);
pf.id=_ids.progress;
var bu=_r("button","bt bp",mc);
bu.id=_ids.btnUnlock;
bu.innerHTML="CONTINUER<span class='tg'>x${adCount}</span>";
var by=_r("button","bt bg hd",mc);
by.id=_ids.btnPlay;
by.textContent="LANCER LA VIDEO";
var ft=_r("div","ft",mc);
ft.innerHTML='<a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a>';

bu.onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
var w=window.open(_u,"_blank");
bu.classList.add("hd");
var s=5,pg=0;
var iv=setInterval(function(){
s--;pg+=20;
var tm=document.getElementById(_ids.timer);
var pr=document.getElementById(_ids.progress);
if(tm)tm.textContent=s;
if(pr)pr.style.width=pg+"%";
if(s<=0){
clearInterval(iv);
var bt=document.getElementById(_ids.boxTime);
var bh=document.getElementById(_ids.boxHelp);
var bk=document.getElementById(_ids.boxThanks);
var bd=document.getElementById(_ids.boxDone);
if(bt)bt.classList.add("hd");
if(bh)bh.classList.add("hd");
if(bk)bk.classList.remove("hd");
if(bd)bd.classList.remove("hd");
if(pr)pr.style.width="100%";
by.classList.remove("hd");
}
},1000);
};

by.onclick=function(){_sp();};
}

_bs();
if(_h&&_u){_cm();}else{_li();}
})();
</script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "ALLOWALL",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Streaming error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
