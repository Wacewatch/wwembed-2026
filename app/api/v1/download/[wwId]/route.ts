import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"

function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params
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
  const adCount = ads ? ads.length : 0

  // Get TMDB data
  const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)

  let title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown Media"
  if (seasonNumber !== undefined && episodeNumber !== undefined) {
    title = title + " - S" + seasonNumber + "E" + episodeNumber
  }

  const poster = tmdbData ? getPosterUrl(tmdbData.poster_path, "w200") : ""

  // Query download links
  let downloadQuery = supabase
    .from("download_links")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("is_active", true)
    .eq("status", "approved")

  if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
    downloadQuery = downloadQuery.eq("season_number", seasonNumber).eq("episode_number", episodeNumber)
  }

  const { data: links } = await downloadQuery.order("quality", { ascending: false })

  // Log embed view
  await supabase.from("embed_views").insert({
    ww_id: wwId,
    tmdb_id: tmdbId,
    media_type: mediaType,
    season_number: seasonNumber ?? null,
    episode_number: episodeNumber ?? null,
    embed_type: "download",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const downloadLinks = links || []

  const linksJson = JSON.stringify(
    downloadLinks.map((l) => ({
      name: l.source_name,
      url: l.source_url,
      quality: l.quality || "HD",
      size: l.file_size || "",
      type: l.link_type || "direct",
    })),
  )

  const ids = {
    overlay: generateRandomId("m"),
    container: generateRandomId("c"),
    timer: generateRandomId("t"),
    progress: generateRandomId("g"),
    btnUnlock: generateRandomId("u"),
    btnDownload: generateRandomId("d"),
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
<title>${title} - Telechargements WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;padding:12px}
.hd{display:flex;gap:12px;margin-bottom:16px;align-items:center}
.ps{width:60px;border-radius:6px;flex-shrink:0}
.tt{font-size:16px;font-weight:600;line-height:1.3}
.lk{background:#162230;border-radius:8px;overflow:hidden;border:1px solid #1e3a4f}
.li{display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid #1e3a4f}
.li:last-child{border-bottom:none}
.ln{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.nm{font-weight:500;font-size:14px}
.bg{padding:2px 6px;background:#1e3a4f;border-radius:4px;font-size:10px;color:#8ba3b5}
.db{padding:10px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;width:100%;transition:background 0.2s}
.db:active{background:#0d9488;transform:scale(0.98)}
.em{color:#5a7a8a;padding:20px;text-align:center;font-size:14px}
.ft{text-align:center;color:#5a7a8a;font-size:11px;margin-top:16px}
.ft a{color:#14B8A6}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px}
.mo.sh{display:flex}
.mc{background:#fff;border-radius:16px;padding:20px;max-width:380px;width:100%;text-align:center;max-height:90vh;overflow-y:auto}
.mc h2{color:#5b6b8a;margin-bottom:16px;font-size:16px}
.bx{border-radius:8px;padding:10px;margin:8px 0;text-align:left}
.bw{background:#fef3cd;border:2px solid #ffc107;color:#856404}
.bh{background:#ffe4d6;border:2px solid #ff9a6c;color:#c44d00}
.bi{background:#fff3cd;border:2px solid #ffc107;color:#664d03}
.bo{background:#d4edda;border:2px solid #28a745;color:#155724}
.bx b{display:block;font-size:12px}
.bx span{font-size:10px;opacity:0.8}
.pb{height:5px;background:#e0e0e0;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s}
.bt{width:100%;padding:12px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;transition:transform 0.1s}
.bt:active{transform:scale(0.98)}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:#28a745;color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:10px;color:#888}
.cf a{color:#667eea}
.tg{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
@media(min-width:480px){
.li{flex-direction:row;justify-content:space-between;align-items:center}
.db{width:auto;padding:8px 20px}
.ps{width:80px}
.tt{font-size:18px}
}
</style>
</head>
<body>
<div class="hd">
${poster ? `<img src="${poster}" alt="${title}" class="ps">` : ""}
<div class="tt">${title}</div>
</div>
<div class="lk" id="${ids.container}"></div>
<div class="ft">par <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>
<script>
(function(){
var _l=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};

function _r(t,c,p){
var e=document.createElement(t);
if(c)e.className=c;
if(p)p.appendChild(e);
return e;
}

function _bl(){
var c=document.getElementById(_ids.container);
if(!c)return;
if(_l.length===0){
c.innerHTML='<div class="em">Aucun lien disponible</div>';
return;
}
var h="";
for(var i=0;i<_l.length;i++){
var l=_l[i];
h+='<div class="li">';
h+='<div class="ln">';
h+='<span class="nm">'+l.name+'</span>';
h+='<span class="bg">'+l.quality+'</span>';
if(l.size)h+='<span class="bg">'+l.size+'</span>';
h+='</div>';
h+='<button class="db" data-url="'+l.url+'">Telecharger</button>';
h+='</div>';
}
c.innerHTML=h;

var bs=document.querySelectorAll(".db");
for(var j=0;j<bs.length;j++){
bs[j].onclick=function(){
var url=this.getAttribute("data-url");
if(_h&&_u){_sa(url);}else{window.open(url,"_blank");}
};
}
}

function _sa(url){
_p=url;
var o=document.getElementById(_ids.overlay);
if(!o){
o=_r("div","mo",document.body);
o.id=_ids.overlay;
var mc=_r("div","mc",o);
var h2=_r("h2",null,mc);
h2.textContent="Votre telechargement vous attend";
var bw=_r("div","bx bw",mc);
bw.innerHTML="<b>Verification en cours</b><span>Merci de patienter</span>";
var bh=_r("div","bx bh",mc);
bh.id=_ids.boxHelp;
bh.innerHTML="<b>Cela aide a maintenir le service gratuit</b>";
var bi=_r("div","bx bi",mc);
bi.id=_ids.boxTime;
bi.innerHTML="<b>Temps estime : <span id='"+_ids.timer+"'>5</span> secondes</b><span>Cliquez, fermez la fenetre</span>";
var bk=_r("div","bx bo hi",mc);
bk.id=_ids.boxThanks;
bk.innerHTML="<b>Merci pour votre soutien !</b>";
var bd=_r("div","bx bo hi",mc);
bd.id=_ids.boxDone;
bd.innerHTML="<b>Pret !</b><span>Cliquez pour telecharger</span>";
var pb=_r("div","pb",mc);
var pf=_r("div","pf",pb);
pf.id=_ids.progress;
var bu=_r("button","bt bp",mc);
bu.id=_ids.btnUnlock;
bu.innerHTML="CONTINUER<span class='tg'>x${adCount}</span>";
var bd=_r("button","bt bn hi",mc);
bd.id=_ids.btnDownload;
bd.textContent="TELECHARGER";
var cf=_r("div","cf",mc);
cf.innerHTML='<a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a>';

bu.onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
window.open(_u,"_blank");
bu.classList.add("hi");
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
var dn=document.getElementById(_ids.btnDownload);
if(bt)bt.classList.add("hi");
if(bh)bh.classList.add("hi");
if(bk)bk.classList.remove("hi");
if(bd)bd.classList.remove("hi");
if(pr)pr.style.width="100%";
if(dn)dn.classList.remove("hi");
}
},1000);
};

document.getElementById(_ids.btnDownload).onclick=function(){
var ov=document.getElementById(_ids.overlay);
if(ov)ov.classList.remove("sh");
if(_p){window.open(_p,"_blank");_p=null;}
};
}
// Reset overlay state
var bt=document.getElementById(_ids.boxTime);
var bh=document.getElementById(_ids.boxHelp);
var bk=document.getElementById(_ids.boxThanks);
var bd=document.getElementById(_ids.boxDone);
var pr=document.getElementById(_ids.progress);
var tm=document.getElementById(_ids.timer);
var bu=document.getElementById(_ids.btnUnlock);
var dn=document.getElementById(_ids.btnDownload);
if(bt)bt.classList.remove("hi");
if(bh)bh.classList.remove("hi");
if(bk)bk.classList.add("hi");
if(bd)bd.classList.add("hi");
if(pr)pr.style.width="0";
if(tm)tm.textContent="5";
if(bu)bu.classList.remove("hi");
if(dn)dn.classList.add("hi");
o.classList.add("sh");
}

_bl();
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
}
