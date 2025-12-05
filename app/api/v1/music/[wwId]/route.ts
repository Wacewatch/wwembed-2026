import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Anti-adblock: Generate random class names
function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params

  // Validate ww-music format
  if (!wwId.startsWith("ww-music-")) {
    return NextResponse.json({ error: "Invalid music WW ID format" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch the digital content
  const { data: content } = await supabase
    .from("digital_content")
    .select("*")
    .eq("ww_id", wwId)
    .eq("content_type", "music")
    .eq("is_active", true)
    .eq("status", "approved")
    .single()

  if (!content) {
    return NextResponse.json({ error: "Music not found" }, { status: 404 })
  }

  // Fetch download/stream links
  const { data: links } = await supabase
    .from("digital_download_links")
    .select("*")
    .eq("ww_id", wwId)
    .eq("is_active", true)
    .eq("status", "approved")

  // Fetch ads
  const { data: ads } = await supabase.from("ads").select("id, name, ad_url, ad_type").eq("is_active", true)

  const hasAds = ads && ads.length > 0
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""
  const adCount = ads ? ads.length : 0

  // Log embed view
  await supabase.from("embed_views").insert({
    ww_id: wwId,
    tmdb_id: 0,
    media_type: "music",
    embed_type: "player",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const downloadLinks = links || []

  // Find streaming URLs
  const streamLinks = downloadLinks.filter((l) => l.reader_url || l.link_type === "stream")

  const streamsJson = JSON.stringify(
    streamLinks.map((l, i) => ({
      name: l.source_name || `Piste ${i + 1}`,
      url: l.reader_url || l.source_url,
      format: l.file_format || "MP3",
    })),
  )

  const downloadsJson = JSON.stringify(
    downloadLinks.map((l) => ({
      name: l.source_name,
      url: l.source_url,
      format: l.file_format || "MP3",
      size: l.file_size || "",
    })),
  )

  const ids = {
    overlay: generateRandomId("m"),
    player: generateRandomId("p"),
    playlist: generateRandomId("pl"),
    downloads: generateRandomId("d"),
    timer: generateRandomId("t"),
    progress: generateRandomId("g"),
    btnUnlock: generateRandomId("u"),
    btnPlay: generateRandomId("y"),
    audioProgress: generateRandomId("ap"),
    playBtn: generateRandomId("pb"),
    currentTime: generateRandomId("ct"),
    duration: generateRandomId("du"),
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - WWEmbed Player</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;display:flex;flex-direction:column}
.hd{padding:16px;background:linear-gradient(180deg,#1e3a4f 0%,#162230 100%);text-align:center}
.cv{width:150px;height:150px;object-fit:cover;border-radius:8px;background:#1e3a4f;margin:0 auto 12px}
.ti h1{font-size:18px;font-weight:600;margin-bottom:4px}
.ti p{font-size:14px;color:#8ba3b5}
.pl{padding:16px;background:#162230}
.pl-ct{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.pl-btn{width:50px;height:50px;border-radius:50%;background:#14B8A6;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
.pl-btn svg{fill:#0c1520;width:24px;height:24px}
.pl-pr{flex:1}
.pr-bar{height:6px;background:#1e3a4f;border-radius:3px;cursor:pointer;position:relative}
.pr-fill{height:100%;background:#14B8A6;border-radius:3px;width:0%;transition:width 0.1s}
.pr-time{display:flex;justify-content:space-between;font-size:11px;color:#8ba3b5;margin-top:4px}
.tb{display:flex;gap:8px;margin-top:12px}
.tb button{flex:1;padding:10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500}
.tb .ac{background:#14B8A6;color:#0c1520}
.tb .in{background:#1e3a4f;color:#fff}
.ct{flex:1;overflow-y:auto}
.trk{padding:12px 16px;border-bottom:1px solid #1e3a4f;display:flex;align-items:center;gap:12px;cursor:pointer}
.trk:hover{background:#1e3a4f}
.trk.ac{background:#14B8A6;color:#0c1520}
.trk-nm{flex:1;font-size:14px}
.trk-fm{font-size:11px;color:#8ba3b5;background:#1e3a4f;padding:2px 6px;border-radius:4px}
.trk.ac .trk-fm{background:rgba(0,0,0,0.2);color:#0c1520}
.dl-ct{display:none;padding:12px}
.dl-ct.sh{display:block}
.lk{background:#1e3a4f;border-radius:8px;margin-bottom:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.lk-btn{padding:8px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.mo.mh{display:none}
.mc{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center}
.mc h2{color:#5b6b8a;margin-bottom:16px;font-size:18px}
.bx{border-radius:8px;padding:10px 12px;margin:8px 0;text-align:left}
.bw{background:#fef3cd;border:2px solid #ffc107;color:#856404}
.bi{background:#fff3cd;border:2px solid #ffc107;color:#664d03}
.bo{background:#d4edda;border:2px solid #28a745;color:#155724}
.bx b{display:block;font-size:13px}
.pb{height:5px;background:#e0e0e0;border-radius:3px;margin:12px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.3s}
.bt{width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;text-transform:uppercase}
.bp{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
.bg-btn{background:#28a745;color:#fff}
.hd-cls{display:none}
.tg{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
.empty{color:#5a7a8a;padding:20px;text-align:center}
</style>
</head>
<body>
<div class="hd">
${content.cover_url ? `<img src="${content.cover_url}" alt="${content.title}" class="cv">` : '<div class="cv"></div>'}
<div class="ti">
<h1>${content.title}</h1>
<p>${content.author || "Artiste inconnu"}</p>
</div>
</div>
<div class="pl">
<div class="pl-ct">
<button class="pl-btn" id="${ids.playBtn}">
<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
</button>
<div class="pl-pr">
<div class="pr-bar" id="${ids.audioProgress}"><div class="pr-fill" id="${ids.progress}"></div></div>
<div class="pr-time"><span id="${ids.currentTime}">0:00</span><span id="${ids.duration}">0:00</span></div>
</div>
</div>
<div class="tb">
<button class="ac" id="btnTracks">Pistes</button>
<button class="in" id="btnDl">Telecharger</button>
</div>
</div>
<div class="ct" id="${ids.playlist}"></div>
<div class="dl-ct" id="${ids.downloads}"></div>
<audio id="audioEl" style="display:none"></audio>
<script>
(function(){
var _s=${streamsJson};
var _d=${downloadsJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _ids=${JSON.stringify(ids)};
var _unlocked=!_h;
var _ci=0;
var _playing=false;

var audio=document.getElementById("audioEl");
var playBtn=document.getElementById(_ids.playBtn);
var progressBar=document.getElementById(_ids.audioProgress);
var progressFill=document.getElementById(_ids.progress);
var currentTimeEl=document.getElementById(_ids.currentTime);
var durationEl=document.getElementById(_ids.duration);
var playlistEl=document.getElementById(_ids.playlist);
var downloadsEl=document.getElementById(_ids.downloads);
var btnTracks=document.getElementById("btnTracks");
var btnDl=document.getElementById("btnDl");

function formatTime(s){
var m=Math.floor(s/60);
var sec=Math.floor(s%60);
return m+":"+(sec<10?"0":"")+sec;
}

function loadTrack(idx){
if(_s.length===0)return;
_ci=idx;
audio.src=_s[idx].url;
updatePlaylist();
}

function updatePlaylist(){
var h="";
if(_s.length===0){
h='<div class="empty">Aucune piste disponible</div>';
}else{
for(var i=0;i<_s.length;i++){
h+='<div class="trk'+(i===_ci?" ac":"")+'" data-idx="'+i+'">';
h+='<span class="trk-nm">'+_s[i].name+'</span>';
h+='<span class="trk-fm">'+_s[i].format+'</span>';
h+='</div>';
}
}
playlistEl.innerHTML=h;
var trks=document.querySelectorAll(".trk");
for(var j=0;j<trks.length;j++){
trks[j].onclick=function(){
var idx=parseInt(this.getAttribute("data-idx"));
loadTrack(idx);
playAudio();
};
}
}

function playAudio(){
if(_s.length===0)return;
audio.play();
_playing=true;
playBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
}

function pauseAudio(){
audio.pause();
_playing=false;
playBtn.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
}

playBtn.onclick=function(){
if(_s.length===0)return;
if(_unlocked){
if(_playing)pauseAudio();else playAudio();
}else{
_sa(function(){playAudio();});
}
};

audio.ontimeupdate=function(){
var pct=(audio.currentTime/audio.duration)*100||0;
progressFill.style.width=pct+"%";
currentTimeEl.textContent=formatTime(audio.currentTime);
};

audio.onloadedmetadata=function(){
durationEl.textContent=formatTime(audio.duration);
};

audio.onended=function(){
if(_ci<_s.length-1){
loadTrack(_ci+1);
playAudio();
}else{
pauseAudio();
}
};

progressBar.onclick=function(e){
var rect=this.getBoundingClientRect();
var pct=(e.clientX-rect.left)/rect.width;
audio.currentTime=pct*audio.duration;
};

btnTracks.onclick=function(){
playlistEl.style.display="block";
downloadsEl.classList.remove("sh");
btnTracks.className="ac";
btnDl.className="in";
};

btnDl.onclick=function(){
playlistEl.style.display="none";
downloadsEl.classList.add("sh");
btnDl.className="ac";
btnTracks.className="in";
_bl();
};

function _bl(){
if(downloadsEl.innerHTML)return;
if(_d.length===0){
downloadsEl.innerHTML='<div class="empty">Aucun lien</div>';
return;
}
var h="";
for(var i=0;i<_d.length;i++){
var l=_d[i];
h+='<div class="lk">';
h+='<div><span>'+l.name+'</span></div>';
h+='<button class="lk-btn" data-url="'+l.url+'">Telecharger</button>';
h+='</div>';
}
downloadsEl.innerHTML=h;
var bs=document.querySelectorAll(".lk-btn");
for(var j=0;j<bs.length;j++){
bs[j].onclick=function(){
var url=this.getAttribute("data-url");
if(_unlocked){window.open(url,"_blank");}
else{_sa(function(){window.open(url,"_blank");});}
};
}
}

function _sa(cb){
var o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML='<div class="mc"><h2>Verification</h2><div class="bx bw"><b>Merci de patienter</b></div><div class="bx bi" id="bt"><b>Temps: <span id="tm">5</span>s</b></div><div class="bx bo hd-cls" id="bd"><b>Pret!</b></div><div class="pb"><div class="pf" id="pg"></div></div><button class="bt bp" id="bu">CONTINUER<span class="tg">x${adCount}</span></button><button class="bt bg-btn hd-cls" id="bp">LANCER</button></div>';
document.body.appendChild(o);

document.getElementById("bu").onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
window.open(_u,"_blank");
this.classList.add("hd-cls");
var s=5,pg=0;
var iv=setInterval(function(){
s--;pg+=20;
document.getElementById("tm").textContent=s;
document.getElementById("pg").style.width=pg+"%";
if(s<=0){
clearInterval(iv);
document.getElementById("bt").classList.add("hd-cls");
document.getElementById("bd").classList.remove("hd-cls");
document.getElementById("bp").classList.remove("hd-cls");
_unlocked=true;
}
},1000);
};

document.getElementById("bp").onclick=function(){
document.getElementById(_ids.overlay).remove();
if(cb)cb();
};
}

updatePlaylist();
if(_s.length>0)loadTrack(0);
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
