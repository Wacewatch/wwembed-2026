import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Anti-adblock: Generate random class names
function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params

  // Validate ww-ebook format
  if (!wwId.startsWith("ww-ebook-")) {
    return NextResponse.json({ error: "Invalid ebook WW ID format" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch the digital content
  const { data: content } = await supabase
    .from("digital_content")
    .select("*")
    .eq("ww_id", wwId)
    .eq("content_type", "ebook")
    .eq("is_active", true)
    .eq("status", "approved")
    .single()

  if (!content) {
    return NextResponse.json({ error: "Ebook not found" }, { status: 404 })
  }

  // Fetch download/reader links
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
    media_type: "ebook",
    embed_type: "reader",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const downloadLinks = links || []
  const readerLink = downloadLinks.find((l) => l.reader_url)
  const readerUrl = readerLink?.reader_url || ""

  const linksJson = JSON.stringify(
    downloadLinks.map((l) => ({
      name: l.source_name,
      url: l.source_url,
      reader: l.reader_url || "",
      format: l.file_format || "PDF",
      size: l.file_size || "",
    })),
  )

  const ids = {
    overlay: generateRandomId("ov"),
    reader: generateRandomId("rd"),
    downloads: generateRandomId("dl"),
    timer: generateRandomId("tm"),
    progress: generateRandomId("pg"),
    btnUnlock: generateRandomId("bu"),
    btnAccess: generateRandomId("ba"),
    boxWarn: generateRandomId("bw"),
    boxTime: generateRandomId("bt"),
    boxDone: generateRandomId("bd"),
    step1: generateRandomId("s1"),
    step2: generateRandomId("s2"),
    step3: generateRandomId("s3"),
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - Lecteur</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0f1a;color:#fff;min-height:100vh;display:flex;flex-direction:column}
.hd{padding:16px;background:linear-gradient(180deg,#141c2b 0%,#0d1219 100%);display:flex;gap:16px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08)}
.cv{width:60px;height:85px;object-fit:cover;border-radius:6px;background:#1a2436;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.ti{flex:1}
.ti h1{font-size:17px;font-weight:600;margin-bottom:6px;color:#fff}
.ti p{font-size:13px;color:#7a8ba3}
.tb{display:flex;gap:10px}
.tb button{padding:10px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s ease}
.tb .rd{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,0.3)}
.tb .dl{background:#1a2436;color:#a0aec0;border:1px solid rgba(255,255,255,0.1)}
.tb .dl:hover{background:#242f42;color:#fff}
.rd-ct{flex:1;background:#1a1a2e;position:relative;min-height:0}
.rd-ct iframe{width:100%;height:100%;border:none}
.dl-ct{display:none;padding:16px;overflow-y:auto;background:#0d1219}
.dl-ct.sh{display:block}
.lk{background:linear-gradient(135deg,#141c2b,#1a2436);border-radius:12px;margin-bottom:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,0.06);transition:all 0.2s ease}
.lk:hover{border-color:rgba(99,102,241,0.3);transform:translateY(-1px)}
.lk-nm{font-weight:500;font-size:14px;color:#e2e8f0}
.bg{padding:4px 8px;background:rgba(99,102,241,0.15);border-radius:6px;font-size:11px;color:#a5b4fc;margin-left:8px}
.lk-btn{padding:10px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(16,185,129,0.25)}
.lk-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,185,129,0.35)}
.lk-btn.rd-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 12px rgba(99,102,241,0.25)}
.lk-btn.rd-btn:hover{box-shadow:0 6px 16px rgba(99,102,241,0.35)}

/* Modal overlay - elegant dark glassmorphism */
.mo{position:fixed;inset:0;background:linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.97));backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
.mo.mh{display:none}
.mc{background:linear-gradient(180deg,#1e293b,#0f172a);border-radius:24px;padding:32px;max-width:420px;width:100%;text-align:center;border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px rgba(0,0,0,0.5)}
.mc-icon{width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(99,102,241,0.3)}
.mc-icon svg{width:32px;height:32px;fill:#fff}
.mc h2{color:#f1f5f9;margin-bottom:8px;font-size:22px;font-weight:700}
.mc-sub{color:#94a3b8;font-size:14px;margin-bottom:24px}

/* Steps indicator */
.steps{display:flex;justify-content:center;gap:8px;margin-bottom:24px}
.step{width:10px;height:10px;border-radius:50%;background:#334155;transition:all 0.3s ease}
.step.ac{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 12px rgba(99,102,241,0.5)}
.step.dn{background:#10b981}

/* Info boxes */
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

/* Progress bar */
.pb{height:6px;background:#1e293b;border-radius:3px;margin:20px 0;overflow:hidden}
.pf{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7);border-radius:3px;transition:width 0.3s ease}

/* Buttons */
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
<p>${content.author || "Auteur inconnu"}</p>
</div>
<div class="tb">
<button class="rd" id="btnReader">Lire</button>
<button class="dl" id="btnDownloads">Telecharger</button>
</div>
</div>
<div class="rd-ct" id="${ids.reader}">
${readerUrl ? `<iframe src="${readerUrl}" allowfullscreen></iframe>` : '<div class="empty">Selectionnez un lien pour commencer la lecture</div>'}
</div>
<div class="dl-ct" id="${ids.downloads}"></div>
<script>
(function(){
var _l=${linksJson};
var _u="${adUrl}";
var _i="${adId}";
var _h=${hasAds};
var _p=null;
var _ids=${JSON.stringify(ids)};
var _unlocked=!_h;

var btnReader=document.getElementById("btnReader");
var btnDownloads=document.getElementById("btnDownloads");
var readerEl=document.getElementById(_ids.reader);
var downloadsEl=document.getElementById(_ids.downloads);

btnReader.onclick=function(){
readerEl.style.display="block";
downloadsEl.classList.remove("sh");
btnReader.classList.add("rd");
btnReader.classList.remove("dl");
btnDownloads.classList.add("dl");
btnDownloads.classList.remove("rd");
};

btnDownloads.onclick=function(){
readerEl.style.display="none";
downloadsEl.classList.add("sh");
btnDownloads.classList.add("rd");
btnDownloads.classList.remove("dl");
btnReader.classList.add("dl");
btnReader.classList.remove("rd");
_bl();
};

function _bl(){
if(downloadsEl.innerHTML)return;
if(_l.length===0){
downloadsEl.innerHTML='<div class="empty">Aucun lien de telechargement disponible</div>';
return;
}
var h="";
for(var i=0;i<_l.length;i++){
var l=_l[i];
h+='<div class="lk">';
h+='<div><span class="lk-nm">'+l.name+'</span><span class="bg">'+l.format+'</span>';
if(l.size)h+='<span class="bg">'+l.size+'</span>';
h+='</div><div style="display:flex;gap:8px">';
if(l.reader)h+='<button class="lk-btn rd-btn" data-reader="'+l.reader+'">Lire</button>';
h+='<button class="lk-btn" data-url="'+l.url+'">Telecharger</button>';
h+='</div></div>';
}
downloadsEl.innerHTML=h;

document.querySelectorAll(".lk-btn").forEach(function(b){
b.onclick=function(){
var url=this.getAttribute("data-url")||this.getAttribute("data-reader");
if(_unlocked||!_h){window.open(url,"_blank");}
else{_sa(url);}
};
});
}

function _sa(url){
_p=url;
var o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML=\`<div class="mc">
<div class="mc-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
<h2>Acces Premium</h2>
<p class="mc-sub">Deux etapes pour acceder au contenu</p>
<div class="steps"><div class="step ac" id="${ids.step1}"></div><div class="step" id="${ids.step2}"></div></div>
<div class="bx bw" id="${ids.boxWarn}" style="display:none"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><div class="bx-txt"><b>Autorisez les popups</b><span>Desactivez votre bloqueur si necessaire</span></div></div>
<div class="bx bi" id="${ids.boxTime}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div><div class="bx-txt"><b>Soutenez le service</b><span>Votre clic nous aide a rester en ligne</span></div></div>
<div class="bx bo hd-cls" id="${ids.boxDone}"><div class="bx-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><div class="bx-txt"><b>Tout est pret!</b><span>Acces au contenu...</span></div></div>
<div class="pb"><div class="pf" id="${ids.progress}"></div></div>
<button class="bt bp" id="${ids.btnUnlock}">ETAPE 1 / 2 <span class="cnt">PUB</span></button>
<button class="bt bp hd-cls" id="${ids.btnAccess}">ETAPE 2 / 2 <span class="cnt">PUB</span></button>
</div>\`;
document.body.appendChild(o);

document.getElementById(_ids.btnUnlock).onclick=function(){
var x=new XMLHttpRequest();
x.open("POST","/api/ads/click",true);
x.setRequestHeader("Content-Type","application/json");
x.send(JSON.stringify({adId:_i}));
var w=window.open(_u,"_blank");
if(!w||w.closed||typeof w.closed=="undefined"){
document.getElementById(_ids.boxWarn).style.display="flex";
return;
}
this.classList.add("hd-cls");
document.getElementById(_ids.step1).classList.remove("ac");
document.getElementById(_ids.step1).classList.add("dn");
document.getElementById(_ids.step2).classList.add("ac");
document.getElementById(_ids.progress).style.width="50%";
document.getElementById(_ids.btnAccess).classList.remove("hd-cls");
};

document.getElementById(_ids.btnAccess).onclick=function(){
var x=new XMLHttpRequest();
x.open("POST","/api/ads/click",true);
x.setRequestHeader("Content-Type","application/json");
x.send(JSON.stringify({adId:_i}));
var w=window.open("https://foreignabnormality.com/fgntgn3c16?key=9a04e35a6ffb54c93c0c35724fbca3c5","_blank");
this.classList.add("hd-cls");
document.getElementById(_ids.step2).classList.remove("ac");
document.getElementById(_ids.step2).classList.add("dn");
document.getElementById(_ids.boxTime).classList.add("hd-cls");
document.getElementById(_ids.boxDone).classList.remove("hd-cls");
document.getElementById(_ids.progress).style.width="100%";
_unlocked=true;
setTimeout(function(){
document.getElementById(_ids.overlay).remove();
if(_p){window.open(_p,"_blank");_p=null;}
},350);
};
}
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
