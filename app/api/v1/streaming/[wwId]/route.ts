import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseWWId, getMovieDetails, getTVDetails, getEpisodeDetails } from "@/lib/tmdb"

export async function GET(request: NextRequest, props: { params: Promise<{ wwId: string }> }) {
  try {
    const params = await props.params
    const { wwId } = params
    if (!wwId) return NextResponse.json({ error: "Missing WW ID" }, { status: 400 })

    const parsed = parseWWId(wwId)
    if (!parsed) return NextResponse.json({ error: "Invalid WW ID format" }, { status: 400 })

    const { mediaType, tmdbId, seasonNumber, episodeNumber } = parsed
    const supabase = createAdminClient()

    const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)
    const activeAds = ads || []
    const hasAds = activeAds.length > 0
    const adsJson = JSON.stringify(activeAds.map((a) => ({ id: a.id, url: a.ad_url, name: a.name }))).replace(
      /</g,
      "\\u003c",
    )

    const tmdbData = mediaType === "movie" ? await getMovieDetails(tmdbId) : await getTVDetails(tmdbId)
    let episodeData = null
    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      episodeData = await getEpisodeDetails(tmdbId, seasonNumber, episodeNumber)
    }

    let title = tmdbData ? ("title" in tmdbData ? tmdbData.title : tmdbData.name) : "Unknown Media"
    if (episodeData) title = title + " - S" + seasonNumber + "E" + episodeNumber

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

    const { data: apis } = await supabase
      .from("third_party_apis")
      .select("*, language, is_anonymous")
      .eq("api_type", "streaming")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    let anonymousCounter = 0
    const autoLinks = (apis || [])
      .filter((api) => (mediaType === "movie" ? !!(api.url_pattern_movie || api.url_pattern) : !!api.url_pattern_tv))
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
        if (api.is_anonymous) anonymousCounter++
        return {
          name: api.is_anonymous ? `Source #${anonymousCounter}` : api.name,
          url,
          quality: "HD",
          language: api.language || "VO",
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

    const sourcesJson = JSON.stringify(allSources).replace(/</g, "\\u003c")

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - WWEMBED</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif;background:#0a0a0f;color:#fff}
.wrap{display:flex;flex-direction:column;height:100%}
.hdr{display:flex;align-items:center;padding:10px 14px;background:#151520;border-bottom:1px solid #222;gap:12px}
.logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#00d4aa}
.ttl{flex:1;font-size:13px;font-weight:600;color:#ccc;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hdr-actions{display:flex;gap:8px}
.src-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:linear-gradient(135deg,#00d4aa,#00a388);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
.src-btn:hover{opacity:.9}
.rpt-btn{background:#ef4444;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.rpt-btn:hover{background:#dc2626}
.player{flex:1;background:#000;position:relative}
.player iframe{width:100%;height:100%;border:none;position:absolute;inset:0}
.no-src{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:8px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:100;padding:16px}
.modal.sh{display:flex}
.modal-box{background:#1a1a28;border-radius:14px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;border:1px solid #333}
.modal-hdr{padding:16px 20px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center}
.modal-ttl{font-size:18px;font-weight:700;color:#00d4aa}
.modal-sub{font-size:12px;color:#888;margin-top:2px}
.modal-close{width:32px;height:32px;border-radius:50%;background:#333;border:none;color:#fff;cursor:pointer;font-size:18px}
.modal-body{padding:16px 20px;overflow-y:auto}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:380px){.grid{grid-template-columns:1fr}}
.card{background:#1e1e2c;border:1px solid #333;border-radius:10px;padding:14px;cursor:pointer;position:relative}
.card:hover{border-color:#00d4aa}
.card.act{border-color:#00d4aa;background:#1a3a2a}
.card-badge{position:absolute;top:10px;right:10px;padding:3px 7px;background:#22c55e;border-radius:5px;font-size:9px;font-weight:700}
.card-icon{width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,#00d4aa,#00a388);display:flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff;font-size:20px}
.card-name{font-size:13px;font-weight:600;margin-bottom:6px}
.card-tags{display:flex;gap:4px}
.tag{padding:3px 6px;border-radius:4px;font-size:9px;font-weight:600}
.tag-vf{background:#3b82f6;color:#fff}
.tag-vost{background:#f97316;color:#fff}
.tag-multi{background:#a855f7;color:#fff}
.tag-vo{background:#6b7280;color:#fff}
.rpt-form{display:flex;flex-direction:column;gap:12px}
.rpt-form textarea{width:100%;min-height:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px;color:#fff;font-size:14px;resize:vertical}
.rpt-form textarea:focus{outline:none;border-color:#00d4aa}
.rpt-form button{background:#ef4444;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer}
.rpt-form button:hover{background:#dc2626}
.rpt-form button:disabled{opacity:0.5;cursor:not-allowed}
.rpt-success{color:#10b981;text-align:center;padding:20px}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;backdrop-filter:blur(8px)}
.mc{background:rgba(255,255,255,0.98);border-radius:20px;padding:24px;max-width:400px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4)}
.mc h2{color:#1a1a2e;margin-bottom:8px;font-size:18px;font-weight:700}
.mc-sub{color:#6b7280;font-size:13px;margin-bottom:16px}
.ad-counter{background:#667eea;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:12px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:16px}
.step{width:10px;height:10px;border-radius:50%;background:#e5e7eb;transition:all 0.3s}
.step.active{background:linear-gradient(135deg,#667eea,#764ba2);transform:scale(1.2)}
.step.done{background:#10b981}
.bx{border-radius:10px;padding:12px;margin:8px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
.bx svg{width:24px;height:24px;flex-shrink:0}
.bx-content{flex:1}
.bx b{display:block;font-size:13px;margin-bottom:2px}
.bx span{font-size:11px;opacity:0.8;display:block}
.bw{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e}
.bh{background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6}
.pg{background:#e5e7eb;border-radius:3px;margin:14px 0;overflow:hidden;height:5px}
.bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:0.5px;transition:all 0.2s}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bn{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.hi{display:none}
.cf{margin-top:12px;font-size:10px;color:#9ca3af}
.cf a{color:#667eea;text-decoration:none}
.tg{background:#8b5cf6;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px;font-weight:600}
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
<div class="mo" id="adOverlay">
<div class="mc">
<h2>Accéder au contenu</h2>
<div class="mc-sub">Une dernière étape pour regarder</div>
<div class="ad-counter" id="adCounter">Pub 1/1</div>
<div class="steps"><div class="step active" id="step1"></div><div class="step" id="step2"></div><div class="step" id="step3"></div></div>
<div class="bx bw">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<div class="bx-content"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
</div>
<div class="bx bh" id="boxSupport">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
<div class="bx-content"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
</div>
<button class="bt bp" id="btnContinue">Continuer<span class="tg">PUB</span></button>
<button class="bt bn hi" id="btnPlay">Lancer le lecteur</button>
<div class="pg"></div>
<div class="cf">Propulsé par <a href="https://wavewatch.xyz" target="_blank">WaveWatch</a></div>
</div>
</div>
<div class="wrap">
<div class="hdr">
<div class="logo">▶ WWEMBED</div>
<div class="ttl">${title}</div>
<div class="hdr-actions">
<button class="src-btn" id="srcBtn">☰ <span id="srcLabel">Source #1</span></button>
<button class="rpt-btn" id="rptBtn" title="Signaler un problème">⚠</button>
</div>
</div>
<div class="player" id="player"><div class="no-src">Chargement...</div></div>
</div>
<div class="modal" id="srcModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl">Choisir un lecteur</div><div class="modal-sub">Sélectionnez une source</div></div>
<button class="modal-close" id="closeModal">×</button>
</div>
<div class="modal-body"><div class="grid" id="srcGrid"></div></div>
</div>
</div>
<div class="modal" id="rptModal">
<div class="modal-box">
<div class="modal-hdr">
<div><div class="modal-ttl" style="color:#ef4444">Signaler un problème</div><div class="modal-sub">Aidez-nous à améliorer le service</div></div>
<button class="modal-close" id="rptClose">×</button>
</div>
<div class="modal-body">
<div class="rpt-form" id="rptForm">
<p style="color:#94a3b8;font-size:13px;margin-bottom:8px">Décrivez le problème rencontré</p>
<textarea id="rptMsg" placeholder="Décrivez le problème..."></textarea>
<button type="button" id="rptSubmit">Envoyer le signalement</button>
</div>
<div class="rpt-success hi" id="rptSuccess">
<div style="font-size:48px;margin-bottom:12px">✓</div>
<p style="font-weight:600;margin-bottom:4px">Merci pour votre signalement !</p>
<p style="color:#94a3b8;font-size:13px">Nous allons examiner ce problème.</p>
</div>
</div>
</div>
<script>
(function(){
var _src=${sourcesJson};
var _ads=${adsJson};
var _hasAds=${hasAds};
var _adIndex=0;
var _idx=0;
var _started=false;
var _wwId="${wwId}";
var _title="${title.replace(/"/g, '\\"')}";
var _mediaType="${mediaType}";
var _tmdbId=${tmdbId};
var _seasonNumber=${seasonNumber ?? "null"};
var _episodeNumber=${episodeNumber ?? "null"};

function $(id){return document.getElementById(id);}

function tagClass(l){
l=(l||"").toUpperCase();
if(l.indexOf("VF")>=0||l.indexOf("FRENCH")>=0||l.indexOf("FRANÇAIS")>=0)return"tag-vf";
if(l.indexOf("VOST")>=0)return"tag-vost";
if(l.indexOf("MULTI")>=0)return"tag-multi";
return"tag-vo";
}

function buildGrid(){
var g=$("srcGrid");
if(!g)return;
if(!_src||!_src.length){
g.innerHTML="<div style='grid-column:1/-1;text-align:center;padding:30px;color:#666'>Aucune source disponible</div>";
return;
}
g.innerHTML="";
for(var i=0;i<_src.length;i++){
(function(index){
var s=_src[index];
var d=document.createElement("div");
d.className="card"+(index===_idx?" act":"");
d.innerHTML="<div class='card-badge'>"+(s.quality||"HD")+"</div><div class='card-icon'>▶</div><div class='card-name'>"+s.name+"</div><div class='card-tags'><span class='tag "+tagClass(s.language)+"'>"+(s.language||"VO").toUpperCase()+"</span></div>";
d.onclick=function(){
_idx=index;
var cards=document.querySelectorAll(".card");
for(var j=0;j<cards.length;j++){cards[j].classList.toggle("act",j===index);}
$("srcLabel").textContent=s.name;
toggleModal("srcModal");
if(_started){loadPlayer();}
};
g.appendChild(d);
})(i);
}
}

function toggleModal(id){
var m=$(id);
if(m)m.classList.toggle("sh");
}

function loadPlayer(){
var p=$("player");
if(!p||!_src||!_src.length)return;
var s=_src[_idx];
if(!s||!s.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
p.innerHTML='<iframe src="'+s.url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
}

function startPlayer() {
var overlay = document.getElementById("adOverlay");
if (overlay) {
overlay.style.display = "none";
overlay.classList.add("hi");
}
if (_src.length > 0 && !_started) {
_started = true;
_idx = 0;
$("srcLabel").textContent = _src[0].name;
loadPlayer();
}
}

function loadSource(source){
var p=$("player");
if(!p)return;
if(!source||!source.url){p.innerHTML="<div class='no-src'>Source indisponible</div>";return;}
p.innerHTML='<iframe src="'+source.url+'" allowfullscreen allow="autoplay;fullscreen"></iframe>';
}

function updateAdCounter(){
var el=$("adCounter");
if(el)el.textContent="Pub "+(_adIndex+1)+"/"+_ads.length;
}

function resetAdUI(){
var s1=$("step1"),s2=$("step2"),s3=$("step3");
var boxSupport=$("boxSupport");
var btnContinue=$("btnContinue"),btnPlay=$("btnPlay");
if(s1){s1.classList.add("active");s1.classList.remove("done");}
if(s2){s2.classList.remove("active");s2.classList.remove("done");}
if(s3){s3.classList.remove("active");s3.classList.remove("done");}
if(boxSupport)boxSupport.style.opacity = "1";
if(btnContinue)btnContinue.classList.remove("hi");
if(btnPlay)btnPlay.classList.add("hi");
updateAdCounter();
}

function processAd(){
var ad=_ads[_adIndex];
if(!ad)return startPlayer();
var opened = false;
try {
  var w = window.open(ad.url,"_blank","noopener,noreferrer");
  if(w) opened = true;
} catch(e) {}
if(!opened) {
  try {
    var a = document.createElement('a');
    a.href = ad.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch(e) {}
}
var s1=$("step1"),s2=$("step2"),s3=$("step3");
var boxSupport=$("boxSupport");
var btnContinue=$("btnContinue"),btnPlay=$("btnPlay");
if(s1){s1.classList.remove("active");s1.classList.add("done");}
if(s2){s2.classList.remove("active");s2.classList.add("done");}
if(s3){s3.classList.add("active");s3.classList.add("done");}
if(boxSupport)boxSupport.style.opacity = "0.5";
if(btnContinue)btnContinue.classList.add("hi");
if(btnPlay)btnPlay.classList.remove("hi");
if(_adIndex<_ads.length-1){
_adIndex++;
resetAdUI();
}else{
}
}

var srcBtn=$("srcBtn");
var closeModal=$("closeModal");
var srcModal=$("srcModal");
if(srcBtn)srcBtn.onclick=function(){toggleModal("srcModal")};
if(closeModal)closeModal.onclick=function(){toggleModal("srcModal")};
if(srcModal)srcModal.onclick=function(e){if(e.target===srcModal)toggleModal("srcModal");};

var rptBtn=$("rptBtn");
var rptModal=$("rptModal");
var rptClose=$("rptClose");
var rptSubmit=$("rptSubmit");
var rptMsg=$("rptMsg");
var rptForm=$("rptForm");
var rptSuccess=$("rptSuccess");
if(rptBtn)rptBtn.onclick=function(){toggleModal("rptModal")};
if(rptClose)rptClose.onclick=function(){toggleModal("rptModal")};
if(rptModal)rptModal.onclick=function(e){if(e.target===rptModal)toggleModal("rptModal");};
if(rptSubmit)rptSubmit.onclick=function(){
  var msg=rptMsg.value.trim();
  if(!msg){alert("Veuillez décrire le problème");return}
  rptSubmit.disabled=true;
  rptSubmit.textContent="Envoi...";
  var currentSource=_src[_idx]||{};
  fetch("/api/bug-reports",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({wwId:_wwId,mediaType:_mediaType,tmdbId:_tmdbId,seasonNumber:_seasonNumber,episodeNumber:_episodeNumber,title:_title,sourceName:currentSource.name||"",sourceUrl:currentSource.url||"",message:msg,embedType:"streaming"})
  }).then(function(r){return r.json()}).then(function(){
    rptForm.classList.add("hi");
    rptSuccess.classList.remove("hi");
    setTimeout(function(){toggleModal("rptModal");rptForm.classList.remove("hi");rptSuccess.classList.add("hi");rptMsg.value="";rptSubmit.disabled=false;rptSubmit.textContent="Envoyer le signalement"},2000);
  }).catch(function(){alert("Erreur lors de l'envoi");rptSubmit.disabled=false;rptSubmit.textContent="Envoyer le signalement";});
};

document.addEventListener("DOMContentLoaded", function() {
buildGrid();
var btnContinue = document.getElementById("btnContinue");
var btnPlay = document.getElementById("btnPlay");
if (btnContinue) {
btnContinue.addEventListener("click", function(e) {
e.preventDefault();
processAd();
});
}
if (btnPlay) {
btnPlay.addEventListener("click", function(e) {
e.preventDefault();
startPlayer();
});
}
if (_hasAds) {
var overlay = document.getElementById("adOverlay");
if (overlay) overlay.style.display = "flex";
} else {
if (_src.length > 0) {
_started = true;
_idx = 0;
$("srcLabel").textContent = _src[0].name;
loadPlayer();
}
}
});
})();
</script>
</body>
</html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
