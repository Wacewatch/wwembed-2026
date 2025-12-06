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
  const randomAd = hasAds ? ads[Math.floor(Math.random() * ads.length)] : null
  const adUrl = randomAd?.ad_url || ""
  const adId = randomAd?.id || ""
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
    overlay: generateRandomId("ov"),
    player: generateRandomId("pl"),
    playlist: generateRandomId("ps"),
    downloads: generateRandomId("dl"),
    timer: generateRandomId("tm"),
    progress: generateRandomId("pg"),
    btnUnlock: generateRandomId("bu"),
    btnAccess: generateRandomId("ba"),
    audioProgress: generateRandomId("ap"),
    playBtn: generateRandomId("pb"),
    currentTime: generateRandomId("ct"),
    duration: generateRandomId("du"),
    step1: generateRandomId("s1"),
    step2: generateRandomId("s2"),
    step3: generateRandomId("s3"),
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - Lecteur Audio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0f1a;color:#fff;min-height:100vh;display:flex;flex-direction:column}
.hd{padding:24px;background:linear-gradient(180deg,#1a1f35 0%,#0d1219 100%);text-align:center}
.cv{width:160px;height:160px;object-fit:cover;border-radius:12px;background:#1a2436;margin:0 auto 16px;box-shadow:0 12px 40px rgba(0,0,0,0.4)}
.ti h1{font-size:20px;font-weight:700;margin-bottom:6px;color:#fff}
.ti p{font-size:14px;color:#7a8ba3}
.pl{padding:20px;background:linear-gradient(180deg,#141929,#0d1219)}
.pl-ct{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.pl-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(99,102,241,0.3);transition:all 0.2s ease}
.pl-btn:hover{transform:scale(1.05);box-shadow:0 12px 32px rgba(99,102,241,0.4)}
.pl-btn svg{fill:#fff;width:26px;height:26px}
.pl-pr{flex:1}
.pr-bar{height:8px;background:#1e293b;border-radius:4px;cursor:pointer;position:relative;overflow:hidden}
.pr-fill{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:4px;width:0%;transition:width 0.1s}
.pr-time{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-top:8px}
.tb{display:flex;gap:10px;margin-top:16px}
.tb button{flex:1;padding:12px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s ease}
.tb .ac{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 16px rgba(99,102,241,0.3)}
.tb .in{background:#1e293b;color:#94a3b8;border:1px solid rgba(255,255,255,0.1)}
.tb .in:hover{background:#2d3a4f;color:#fff}
.ct{flex:1;overflow-y:auto;background:#0d1219}
.trk{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.2s ease}
.trk:hover{background:rgba(99,102,241,0.1)}
.trk.ac{background:linear-gradient(90deg,rgba(99,102,241,0.2),transparent)}
.trk-num{width:28px;height:28px;background:#1e293b;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b}
.trk.ac .trk-num{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.trk-nm{flex:1;font-size:14px;color:#e2e8f0}
.trk-fm{font-size:11px;color:#64748b;background:#1e293b;padding:4px 8px;border-radius:6px}
.dl-ct{display:none;padding:16px;background:#0d1219}
.dl-ct.sh{display:block}
.lk{background:linear-gradient(135deg,#141c2b,#1a2436);border-radius:12px;margin-bottom:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,0.06);transition:all 0.2s ease}
.lk:hover{border-color:rgba(99,102,241,0.3);transform:translateY(-1px)}
.lk-nm{font-weight:500;font-size:14px;color:#e2e8f0}
.bg{padding:4px 8px;background:rgba(99,102,241,0.15);border-radius:6px;font-size:11px;color:#a5b4fc;margin-left:8px}
.lk-btn{padding:10px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(16,185,129,0.25)}
.lk-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,185,129,0.35)}

/* Modal overlay */
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.97));backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
.mo.mh{display:none}
.mc{background:linear-gradient(180deg,#1e293b,#0f172a);border-radius:24px;padding:32px;max-width:420px;width:100%;text-align:center;border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px rgba(0,0,0,0.5)}
.mc-icon{width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.mc-icon svg{width:32px;height:32px;fill:#fff}
.mc h2{color:#f1f5f9;margin-bottom:8px;font-size:22px;font-weight:700}
.mc-sub{color:#94a3b8;font-size:14px;margin-bottom:24px}
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:24px}
.step{width:10px;height:10px;border-radius:50%;background:#334155;transition:all 0.3s ease}
.step.ac{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 12px rgba(99,102,241,0.5)}
.step.dn{background:#10b981}
.bx{border-radius:12px;padding:14px 16px;margin:10px 0;text-align:left;display:flex;align-items:center;gap:12px}
.bx-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bx-icon svg{width:18px;height:18px}
.bw{background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3)}
.bw .bx-icon{background:rgba(251,191,36,0.2)}
.bw .bx-icon svg{fill:#fbbf24}
.bi{background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3)}
.bi .bx-icon{background:rgba(99,102,241,0.2)}
.bi .bx-icon svg{fill:#818cf8}
.bo{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3)}
.bo .bx-icon{background:rgba(16,185,129,0.2)}
.bo .bx-icon svg{fill:#10b981}
.bx-txt b{display:block;font-size:13px;color:#f1f5f9;margin-bottom:2px}
.bx-txt span{font-size:12px;color:#94a3b8}
.pb{height:6px;background:#1e293b;border-radius:3px;margin:20px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7);border-radius:3px;transition:width 0.3s ease}
.bt{width:100%;padding:14px 20px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;gap:8px}
.bp{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.bp:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(99,102,241,0.4)}
.bg-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 8px 24px rgba(16,185,129,0.3)}
.bg-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(16,185,129,0.4)}
.hd-cls{display:none}
.cnt{background:rgba(251,191,36,0.15);color:#fbbf24;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
.empty{color:#64748b;padding:40px 20px;text-align:center;font-size:14px}
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
var _cb=null;

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
h+='<div class="trk-num">'+(i+1)+'</div>';
h+='<span class="trk-nm">'+_s[i].name+'</span>';
h+='<span class="trk-fm">'+_s[i].format+'</span>';
h+='</div>';
}
}
playlistEl.innerHTML=h;
document.querySelectorAll(".trk").forEach(function(t){
t.onclick=function(){
var idx=parseInt(this.getAttribute("data-idx"));
loadTrack(idx);
if(_unlocked)playAudio();
else _sa(function(){playAudio();});
};
});
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
if(_ci<_s.length-1){loadTrack(_ci+1);playAudio();}
else{pauseAudio();}
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
downloadsEl.innerHTML='<div class="empty">Aucun lien de telechargement</div>';
return;
}
var h="";
for(var i=0;i<_d.length;i++){
var l=_d[i];
h+='<div class="lk">';
h+='<div><span class="lk-nm">'+l.name+'</span><span class="bg">'+l.format+'</span>';
if(l.size)h+='<span class="bg">'+l.size+'</span>';
h+='</div>';
h+='<button class="lk-btn" data-url="'+l.url+'">Telecharger</button>';
h+='</div>';
}
downloadsEl.innerHTML=h;
document.querySelectorAll(".lk-btn").forEach(function(b){
b.onclick=function(){
var url=this.getAttribute("data-url");
if(_unlocked){window.open(url,"_blank");}
else{_sa(function(){window.open(url,"_blank");});}
};
});
}

function _sa(cb){
_cb=cb;
var o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML=\`<div class="mc">
<div class="mc-icon"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>
<h2>Ecoute Premium</h2>
<p class="mc-sub">Une etape rapide pour deverrouiller l'audio</p>
<div class="steps"><div class="step ac" id="${ids.step1}"></div><div class="step" id="${ids.step2}"></div><div class="step" id="${ids.step3}"></div></div>
<div class="bx bw hd-cls" id="bxWarn"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><div class="bx-txt"><b>Autorisez les popups</b><span>Desactivez votre bloqueur si necessaire</span></div></div>
<div class="bx bi" id="bxTime"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div><div class="bx-txt"><b>Patientez <span id="${ids.timer}">5</span> secondes</b><span>Le compteur demarre apres le clic</span></div></div>
<div class="bx bo hd-cls" id="bxDone"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><div class="bx-txt"><b>Verification terminee!</b><span>La musique est maintenant deverrouillee</span></div></div>
<div class="pb"><div class="pf" id="pgBar"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">CONTINUER <span class="cnt">${adCount} pub</span></button>
<button class="bt bg-btn hd-cls" id="${ids.btnAccess}">LANCER LA LECTURE</button>
</div>\`;
document.body.appendChild(o);

document.getElementById(_ids.btnUnlock).onclick=function(){
var x=new XMLHttpRequest();
x.open("POST","/api/ads/click",true);
x.setRequestHeader("Content-Type","application/json");
x.send(JSON.stringify({adId:_i}));
var w=window.open(_u,"_blank");
if(!w||w.closed||typeof w.closed=="undefined"){
document.getElementById("bxWarn").classList.remove("hd-cls");
return;
}
this.classList.add("hd-cls");
document.getElementById(_ids.step1).classList.remove("ac");
document.getElementById(_ids.step1).classList.add("dn");
document.getElementById(_ids.step2).classList.add("ac");
var s=5,pg=0;
var iv=setInterval(function(){
s--;pg+=20;
document.getElementById(_ids.timer).textContent=s;
document.getElementById("pgBar").style.width=pg+"%";
if(s<=0){
clearInterval(iv);
document.getElementById(_ids.step2).classList.remove("ac");
document.getElementById(_ids.step2).classList.add("dn");
document.getElementById(_ids.step3).classList.add("ac");
document.getElementById("bxTime").classList.add("hd-cls");
document.getElementById("bxDone").classList.remove("hd-cls");
document.getElementById(_ids.btnAccess).classList.remove("hd-cls");
_unlocked=true;
}
},1000);
};

document.getElementById(_ids.btnAccess).onclick=function(){
document.getElementById(_ids.overlay).remove();
if(_cb)_cb();_cb=null;
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
