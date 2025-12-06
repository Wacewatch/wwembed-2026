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

    const parsed = parseWWId(wwId)

    if (!parsed) {
      return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })
    }

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    // Fetch ads
    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

    const hasAds = ads && ads.length > 0
    const adUrl = hasAds ? ads[0].ad_url : ""
    const adId = hasAds ? ads[0].id : ""

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
      .select("*, language, is_anonymous")
      .eq("api_type", "streaming")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    let anonymousCounter = 0

    const autoLinks = (apis || [])
      .filter((api) => {
        if (mediaType === "movie") {
          return !!(api.url_pattern_movie || api.url_pattern)
        } else {
          return !!api.url_pattern_tv
        }
      })
      .map((api) => {
        const pattern =
          mediaType === "movie"
            ? api.url_pattern_movie || api.url_pattern || ""
            : api.url_pattern_tv || api.url_pattern || ""

        let url = pattern.replace(/{tmdb_id}/g, String(tmdbId)).replace(/{media_type}/g, mediaType)

        if (mediaType === "movie") {
          url = url
            .replace(/{season}/g, "")
            .replace(/{episode}/g, "")
            .replace(/{season_number}/g, "")
            .replace(/{episode_number}/g, "")
        } else {
          url = url
            .replace(/{season}/g, String(seasonNumber || 1))
            .replace(/{episode}/g, String(episodeNumber || 1))
            .replace(/{season_number}/g, String(seasonNumber || 1))
            .replace(/{episode_number}/g, String(episodeNumber || 1))
        }

        url = url.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/g, "")

        const isAnonymous = api.is_anonymous || false
        const language = api.language || "VO"

        if (isAnonymous) {
          anonymousCounter++
        }

        return {
          name: isAnonymous ? `Source #${anonymousCounter}` : api.name,
          url,
          quality: "HD",
          language: language,
        }
      })
      .filter((link) => link.url && link.url.length > 0)

    const allSources = [
      ...autoLinks,
      ...(userLinks || []).map((l, i) => ({
        name: l.source_name || "Source #" + (autoLinks.length + i + 1),
        url: l.source_url,
        quality: l.quality || "HD",
        language: l.language || "VO",
      })),
    ]

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
      step1: generateRandomId("s1"),
      step2: generateRandomId("s2"),
      step3: generateRandomId("s3"),
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:system-ui,-apple-system,sans-serif;background:#0a0f1a;color:#fff;height:100%;overflow:hidden}
.vp{width:100%;height:100%;display:flex;flex-direction:column}
.vf{flex:1;position:relative;background:#000;min-height:0}
.vf iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
/* Sources modernes et compactes */
.vs{padding:6px 8px;background:linear-gradient(180deg,#0d1526 0%,#141e30 100%);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;flex-shrink:0;max-height:80px;overflow-y:auto}
.vs::-webkit-scrollbar{width:3px;height:3px}
.vs::-webkit-scrollbar-track{background:#0d1526}
.vs::-webkit-scrollbar-thumb{background:#2a5a7f;border-radius:3px}
.vb{padding:6px 12px;background:linear-gradient(135deg,#1a2a40 0%,#0d1526 100%);border:1px solid #2a4060;border-radius:20px;color:#a0c4e8;cursor:pointer;font-size:11px;white-space:nowrap;transition:all 0.2s;display:inline-flex;align-items:center;gap:5px}
.vb:hover{background:linear-gradient(135deg,#2a4060 0%,#1a2a40 100%);border-color:#3a6090;color:#fff;transform:translateY(-1px)}
.vb.va{background:linear-gradient(135deg,#14B8A6 0%,#0d9488 100%);border-color:#14B8A6;color:#fff;box-shadow:0 2px 8px rgba(20,184,166,0.4)}
.vb .lang{background:rgba(255,255,255,0.15);padding:2px 6px;border-radius:10px;font-size:9px;font-weight:600;text-transform:uppercase}
.vb.va .lang{background:rgba(255,255,255,0.25)}
/* Modal pub */
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;backdrop-filter:blur(8px);overflow-y:auto}
.mo.mh{display:none}
.mc{background:rgba(255,255,255,0.98);border-radius:16px;padding:20px;max-width:380px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);margin:auto;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto}
.mc h2{color:#1a1a2e;margin-bottom:6px;font-size:clamp(16px,4vw,20px);font-weight:700}
.mc-sub{color:#6b7280;font-size:clamp(11px,3vw,13px);margin-bottom:16px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{flex-shrink:0;width:18px;height:18px}
.bx-content{min-width:0}
.bx-content b{display:block;font-size:clamp(12px,3.5vw,14px);margin-bottom:2px}
.bx-content span{font-size:clamp(10px,2.8vw,12px);opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d}
.bi{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.bo{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46}
.pb{height:5px;background:#e5e7eb;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width 0.3s;border-radius:3px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:clamp(12px,3.5vw,14px);font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bt:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.bt:active{transform:scale(0.98)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 4px 14px rgba(102,126,234,0.4)}
.bg{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 14px rgba(16,185,129,0.4)}
.hd{display:none}
.ft{margin-top:12px;font-size:clamp(9px,2.5vw,11px);color:#9ca3af}
.ft a{color:#667eea;text-decoration:none;font-weight:500}
.tg{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;font-weight:600}
.ns{display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:14px}
/* Mobile: sources en grille compacte */
@media(max-width:480px){
.vs{padding:4px 6px;gap:4px;max-height:70px}
.vb{padding:5px 10px;font-size:10px;border-radius:16px}
.vb .lang{padding:1px 4px;font-size:8px}
}
@media(max-height:500px){
.mc{padding:16px;border-radius:12px}
.bx{padding:10px;margin:6px 0}
.steps{margin-bottom:12px}
.pb{margin:10px 0}
.bt{padding:10px}
.vs{max-height:60px}
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
c.innerHTML='<span style="color:#5a7a8a;padding:8px">Aucune source disponible</span>';
var p=document.getElementById(_ids.player);
if(p)p.innerHTML='<div class="ns">Aucune source de streaming disponible</div>';
return;
}
c.innerHTML="";
for(var i=0;i<_d.length;i++){
var b=_r("button","vb"+(i===0?" va":""),c);
var nameSpan=_r("span",null,b);
nameSpan.textContent=_d[i].name;
var langSpan=_r("span","lang",b);
langSpan.textContent=_d[i].language||"VO";
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
h2.textContent="Votre video est prête";
var sub=_r("div","mc-sub",mc);
sub.textContent="Une dernière étape pour accéder au contenu";

var steps=_r("div","steps",mc);
var s1=_r("div","step active",steps);s1.id=_ids.step1;
var s2=_r("div","step",steps);s2.id=_ids.step2;
var s3=_r("div","step",steps);s3.id=_ids.step3;

var bw=_r("div","bx bw",mc);
bw.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>';

var bh=_r("div","bx bh",mc);
bh.id=_ids.boxHelp;
bh.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>';

var bi=_r("div","bx bi",mc);
bi.id=_ids.boxTime;
bi.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><div class="bx-content"><b>Temps restant: <span id="'+_ids.timer+'">3</span> seconde(s)</b><span>Cliquez et fermez la fenêtre</span></div>';

var bk=_r("div","bx bo hd",mc);
bk.id=_ids.boxThanks;
bk.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><div class="bx-content"><b>Merci pour votre soutien !</b><span>Vous aidez à maintenir le service</span></div>';

var bd=_r("div","bx bo hd",mc);
bd.id=_ids.boxDone;
bd.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><div class="bx-content"><b>Tout est prêt !</b><span>Cliquez pour lancer la lecture</span></div>';

var pb=_r("div","pb",mc);
var pf=_r("div","pf",pb);
pf.id=_ids.progress;

var bu=_r("button","bt bp",mc);
bu.id=_ids.btnUnlock;
bu.innerHTML="Continuer<span class='tg'>PUB</span>";

var by=_r("button","bt bg hd",mc);
by.id=_ids.btnPlay;
by.textContent="Lancer la vidéo";

var ft=_r("div","ft",mc);
ft.innerHTML='Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a>';

bu.onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
var w=window.open(_u,"_blank");
bu.classList.add("hd");
document.getElementById(_ids.step1).classList.remove("active");
document.getElementById(_ids.step1).classList.add("done");
document.getElementById(_ids.step2).classList.add("active");
var s=3,pg=0;
var iv=setInterval(function(){
s--;pg+=33.33;
var tm=document.getElementById(_ids.timer);
var pr=document.getElementById(_ids.progress);
if(tm)tm.textContent=s + " seconde" + (s>1?"s":"");
if(pr)pr.style.width=Math.min(pg,100)+"%";
if(s<=0){
clearInterval(iv);
document.getElementById(_ids.step2).classList.remove("active");
document.getElementById(_ids.step2).classList.add("done");
document.getElementById(_ids.step3).classList.add("active");
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
_cm();
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
    console.error("Streaming API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
