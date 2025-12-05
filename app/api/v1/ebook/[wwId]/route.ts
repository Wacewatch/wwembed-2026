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
  const adUrl = hasAds ? ads[0].ad_url : ""
  const adId = hasAds ? ads[0].id : ""
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

  // Find reader URL (for PDF viewing)
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
    overlay: generateRandomId("m"),
    reader: generateRandomId("r"),
    downloads: generateRandomId("d"),
    timer: generateRandomId("t"),
    progress: generateRandomId("g"),
    btnUnlock: generateRandomId("u"),
    btnRead: generateRandomId("p"),
    boxTime: generateRandomId("bt"),
    boxHelp: generateRandomId("bh"),
    boxThanks: generateRandomId("bk"),
    boxDone: generateRandomId("bd"),
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - WWEmbed Reader</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;display:flex;flex-direction:column}
.hd{padding:12px;background:#162230;display:flex;gap:12px;align-items:center;border-bottom:1px solid #1e3a4f}
.cv{width:50px;height:70px;object-fit:cover;border-radius:4px;background:#1e3a4f}
.ti{flex:1}
.ti h1{font-size:16px;font-weight:600;margin-bottom:4px}
.ti p{font-size:12px;color:#8ba3b5}
.tb{display:flex;gap:8px}
.tb button{padding:8px 12px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;transition:background 0.2s}
.tb .rd{background:#14B8A6;color:#0c1520}
.tb .dl{background:#1e3a4f;color:#fff}
.rd-ct{flex:1;background:#fff;position:relative;min-height:0}
.rd-ct iframe{width:100%;height:100%;border:none}
.dl-ct{display:none;padding:12px;overflow-y:auto}
.dl-ct.sh{display:block}
.lk{background:#162230;border-radius:8px;margin-bottom:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.lk-nm{font-weight:500;font-size:14px}
.bg{padding:2px 6px;background:#1e3a4f;border-radius:4px;font-size:10px;color:#8ba3b5;margin-left:6px}
.lk-btn{padding:8px 16px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.mo.mh{display:none}
.mc{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center}
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
<p>${content.author || "Auteur inconnu"}</p>
</div>
<div class="tb">
<button class="rd" id="btnReader">Lire</button>
<button class="dl" id="btnDownloads">Telecharger</button>
</div>
</div>
<div class="rd-ct" id="${ids.reader}">
${readerUrl ? `<iframe src="${readerUrl}" allowfullscreen></iframe>` : '<div class="empty">Aucun lecteur disponible</div>'}
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
downloadsEl.innerHTML='<div class="empty">Aucun lien disponible</div>';
return;
}
var h="";
for(var i=0;i<_l.length;i++){
var l=_l[i];
h+='<div class="lk">';
h+='<div><span class="lk-nm">'+l.name+'</span><span class="bg">'+l.format+'</span>';
if(l.size)h+='<span class="bg">'+l.size+'</span>';
h+='</div>';
h+='<button class="lk-btn" data-url="'+l.url+'">Telecharger</button>';
h+='</div>';
}
downloadsEl.innerHTML=h;

var bs=document.querySelectorAll(".lk-btn");
for(var j=0;j<bs.length;j++){
bs[j].onclick=function(){
var url=this.getAttribute("data-url");
if(_unlocked||!_h){window.open(url,"_blank");}
else{_sa(url);}
};
}
}

function _sa(url){
_p=url;
var o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML='<div class="mc"><h2>Telechargement</h2><div class="bx bw"><b>Verification</b></div><div class="bx bi" id="'+_ids.boxTime+'"><b>Temps: <span id="'+_ids.timer+'">5</span>s</b></div><div class="bx bo hd-cls" id="'+_ids.boxDone+'"><b>Pret!</b></div><div class="pb"><div class="pf" id="'+_ids.progress+'"></div></div><button class="bt bp" id="'+_ids.btnUnlock+'">CONTINUER<span class="tg">x${adCount}</span></button><button class="bt bg-btn hd-cls" id="'+_ids.btnRead+'">TELECHARGER</button></div>';
document.body.appendChild(o);

document.getElementById(_ids.btnUnlock).onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
window.open(_u,"_blank");
this.classList.add("hd-cls");
var s=5,pg=0;
var iv=setInterval(function(){
s--;pg+=20;
document.getElementById(_ids.timer).textContent=s;
document.getElementById(_ids.progress).style.width=pg+"%";
if(s<=0){
clearInterval(iv);
document.getElementById(_ids.boxTime).classList.add("hd-cls");
document.getElementById(_ids.boxDone).classList.remove("hd-cls");
document.getElementById(_ids.btnRead).classList.remove("hd-cls");
_unlocked=true;
}
},1000);
};

document.getElementById(_ids.btnRead).onclick=function(){
document.getElementById(_ids.overlay).remove();
if(_p){window.open(_p,"_blank");_p=null;}
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
