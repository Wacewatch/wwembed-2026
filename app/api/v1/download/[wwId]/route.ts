import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"

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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title} - Telechargements WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;padding:12px}
.header{display:flex;gap:12px;margin-bottom:16px;align-items:center}
.poster{width:60px;border-radius:6px;flex-shrink:0}
.title{font-size:16px;font-weight:600;line-height:1.3}
.links{background:#162230;border-radius:8px;overflow:hidden;border:1px solid #1e3a4f}
.link{display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid #1e3a4f}
.link:last-child{border-bottom:none}
.link-info{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.link-name{font-weight:500;font-size:14px}
.badge{padding:2px 6px;background:#1e3a4f;border-radius:4px;font-size:10px;color:#8ba3b5}
.dl-btn{padding:10px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;width:100%;transition:background 0.2s}
.dl-btn:active{background:#0d9488;transform:scale(0.98)}
.empty{color:#5a7a8a;padding:20px;text-align:center;font-size:14px}
.footer{text-align:center;color:#5a7a8a;font-size:11px;margin-top:16px}
.footer a{color:#14B8A6}
.overlay{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:12px}
.overlay.show{display:flex}
.card{background:#fff;border-radius:16px;padding:20px;max-width:380px;width:100%;text-align:center;max-height:90vh;overflow-y:auto}
.card h2{color:#5b6b8a;margin-bottom:16px;font-size:16px}
.box{border-radius:8px;padding:10px;margin:8px 0;text-align:left}
.box-warn{background:#fef3cd;border:2px solid #ffc107;color:#856404}
.box-help{background:#ffe4d6;border:2px solid #ff9a6c;color:#c44d00}
.box-time{background:#fff3cd;border:2px solid #ffc107;color:#664d03}
.box-ok{background:#d4edda;border:2px solid #28a745;color:#155724}
.box b{display:block;font-size:12px}
.box span{font-size:10px;opacity:0.8}
.bar{height:5px;background:#e0e0e0;border-radius:3px;margin:12px 0;overflow:hidden}
.bar-fill{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s}
.btn{width:100%;padding:12px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;transition:transform 0.1s}
.btn:active{transform:scale(0.98)}
.btn-purple{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.btn-green{background:#28a745;color:#fff}
.hide{display:none}
.card-footer{margin-top:12px;font-size:10px;color:#888}
.card-footer a{color:#667eea}
.ad-badge{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
@media(min-width:480px){
.link{flex-direction:row;justify-content:space-between;align-items:center}
.dl-btn{width:auto;padding:8px 20px}
.poster{width:80px}
.title{font-size:18px}
}
</style>
</head>
<body>
${
  hasAds
    ? `
<div class="overlay" id="overlay">
<div class="card">
<h2>Votre telechargement vous attend</h2>
<div class="box box-warn"><b>Bloqueur de pub detecte</b><span>Autorisez les popups pour ce site</span></div>
<div class="box box-help" id="boxHelp"><b>Cela aide WaveWatch a rester gratuit</b></div>
<div class="box box-time" id="boxTime"><b>Temps estime : <span id="timer">5</span> secondes</b><span>Cliquez, fermez les pubs, et hop !</span></div>
<div class="box box-ok hide" id="boxThanks"><b>Merci d'avoir soutenu WaveWatch !</b></div>
<div class="box box-ok hide" id="boxDone"><b>Pubs validees !</b><span>Cliquez pour telecharger</span></div>
<div class="bar"><div class="bar-fill" id="progress"></div></div>
<button class="btn btn-purple" id="btnUnlock">DEBLOQUER<span class="ad-badge">x${adCount}</span></button>
<button class="btn btn-green hide" id="btnDownload">TELECHARGER</button>
<div class="card-footer">Nos sites <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>
</div>
</div>
`
    : ""
}
<div class="header">
${poster ? `<img src="${poster}" alt="${title}" class="poster">` : ""}
<div class="title">${title}</div>
</div>
<div class="links" id="linksContainer"></div>
<div class="footer">par <a href="https://wavewatch.xyz" target="_blank">wavewatch.xyz</a></div>
<script>
(function(){
var links = ${linksJson};
var adUrl = "${adUrl}";
var adId = "${adId}";
var hasAds = ${hasAds};
var pendingUrl = null;

function buildLinks(){
  var c = document.getElementById("linksContainer");
  if(!c) return;
  if(links.length === 0){
    c.innerHTML = '<div class="empty">Aucun lien disponible</div>';
    return;
  }
  var h = "";
  for(var i=0;i<links.length;i++){
    var l = links[i];
    h += '<div class="link">';
    h += '<div class="link-info">';
    h += '<span class="link-name">' + l.name + '</span>';
    h += '<span class="badge">' + l.quality + '</span>';
    if(l.size) h += '<span class="badge">' + l.size + '</span>';
    h += '</div>';
    h += '<button class="dl-btn" data-url="' + l.url + '">Telecharger</button>';
    h += '</div>';
  }
  c.innerHTML = h;
  
  var btns = document.querySelectorAll(".dl-btn");
  for(var j=0;j<btns.length;j++){
    btns[j].onclick = function(){
      var url = this.getAttribute("data-url");
      if(hasAds && adUrl){
        showAd(url);
      } else {
        window.open(url,"_blank");
      }
    };
  }
}

function showAd(url){
  pendingUrl = url;
  var o = document.getElementById("overlay");
  var btnU = document.getElementById("btnUnlock");
  var btnD = document.getElementById("btnDownload");
  var bt = document.getElementById("boxTime");
  var bh = document.getElementById("boxHelp");
  var bth = document.getElementById("boxThanks");
  var bd = document.getElementById("boxDone");
  var pr = document.getElementById("progress");
  var tm = document.getElementById("timer");
  if(bt) bt.classList.remove("hide");
  if(bh) bh.classList.remove("hide");
  if(bth) bth.classList.add("hide");
  if(bd) bd.classList.add("hide");
  if(pr) pr.style.width = "0";
  if(tm) tm.textContent = "5";
  if(btnU) btnU.classList.remove("hide");
  if(btnD) btnD.classList.add("hide");
  if(o) o.classList.add("show");
}

var btnUnlock = document.getElementById("btnUnlock");
var btnDownload = document.getElementById("btnDownload");

if(btnUnlock){
  btnUnlock.onclick = function(){
    fetch("/api/ads/click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adId:adId})});
    window.open(adUrl,"_blank");
    btnUnlock.classList.add("hide");
    var sec = 5;
    var prog = 0;
    var iv = setInterval(function(){
      sec--;
      prog += 20;
      var tm = document.getElementById("timer");
      var pr = document.getElementById("progress");
      if(tm) tm.textContent = sec;
      if(pr) pr.style.width = prog + "%";
      if(sec <= 0){
        clearInterval(iv);
        var bt = document.getElementById("boxTime");
        var bh = document.getElementById("boxHelp");
        var bth = document.getElementById("boxThanks");
        var bd = document.getElementById("boxDone");
        if(bt) bt.classList.add("hide");
        if(bh) bh.classList.add("hide");
        if(bth) bth.classList.remove("hide");
        if(bd) bd.classList.remove("hide");
        if(pr) pr.style.width = "100%";
        if(btnDownload) btnDownload.classList.remove("hide");
      }
    },1000);
  };
}

if(btnDownload){
  btnDownload.onclick = function(){
    var o = document.getElementById("overlay");
    if(o) o.classList.remove("show");
    if(pendingUrl){
      window.open(pendingUrl,"_blank");
      pendingUrl = null;
    }
  };
}

buildLinks();
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
