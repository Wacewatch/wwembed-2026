import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Anti-adblock: Generate random class names
function generateRandomId(prefix = "x"): string {
  return prefix + Math.random().toString(36).substring(2, 10)
}

// Generic route for software and games downloads
export async function GET(request: NextRequest, { params }: { params: Promise<{ wwId: string }> }) {
  const { wwId } = await params

  // Validate format: ww-software-xxx or ww-game-xxx
  const match = wwId.match(/^ww-(software|game)-/)
  if (!match) {
    return NextResponse.json({ error: "Invalid digital content WW ID format" }, { status: 400 })
  }

  const contentType = match[1] as "software" | "game"
  const supabase = createAdminClient()

  // Fetch the digital content
  const { data: content } = await supabase
    .from("digital_content")
    .select("*")
    .eq("ww_id", wwId)
    .eq("content_type", contentType)
    .eq("is_active", true)
    .eq("status", "approved")
    .single()

  if (!content) {
    return NextResponse.json({ error: `${contentType} not found` }, { status: 404 })
  }

  // Fetch download links
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
    media_type: contentType,
    embed_type: "download",
    referrer: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
  })

  const downloadLinks = links || []

  const linksJson = JSON.stringify(
    downloadLinks.map((l) => ({
      name: l.source_name,
      url: l.source_url,
      format: l.file_format || "",
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
  }

  const typeLabel = contentType === "software" ? "Logiciel" : "Jeu"
  const typeIcon = contentType === "software" ? "💻" : "🎮"

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title} - WWEmbed</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0c1520;color:#fff;min-height:100vh;padding:16px}
.hd{display:flex;gap:16px;margin-bottom:20px;align-items:flex-start}
.cv{width:100px;height:100px;object-fit:cover;border-radius:12px;background:#1e3a4f;flex-shrink:0}
.ti{flex:1}
.ti h1{font-size:18px;font-weight:600;margin-bottom:6px}
.ti p{font-size:13px;color:#8ba3b5;margin-bottom:4px}
.tg{display:inline-block;padding:3px 8px;background:#14B8A6;color:#0c1520;border-radius:4px;font-size:11px;font-weight:600}
.lk{background:#162230;border-radius:10px;overflow:hidden;border:1px solid #1e3a4f}
.li{display:flex;flex-direction:column;gap:10px;padding:14px;border-bottom:1px solid #1e3a4f}
.li:last-child{border-bottom:none}
.ln{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nm{font-weight:500;font-size:14px}
.bg{padding:3px 8px;background:#1e3a4f;border-radius:4px;font-size:11px;color:#8ba3b5}
.db{padding:10px 18px;background:#14B8A6;color:#0c1520;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;width:100%;transition:all 0.2s}
.db:hover{background:#0d9488}
.db:active{transform:scale(0.98)}
.em{color:#5a7a8a;padding:24px;text-align:center;font-size:14px}
.ft{text-align:center;color:#5a7a8a;font-size:11px;margin-top:20px}
.ft a{color:#14B8A6}
.mo{position:fixed;inset:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}
.mo.sh{display:flex}
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
.bn{background:#28a745;color:#fff}
.hi{display:none}
.tag{background:#ff6b6b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px}
@media(min-width:480px){
.li{flex-direction:row;justify-content:space-between;align-items:center}
.db{width:auto;padding:10px 24px}
}
</style>
</head>
<body>
<div class="hd">
${content.cover_url ? `<img src="${content.cover_url}" alt="${content.title}" class="cv">` : '<div class="cv"></div>'}
<div class="ti">
<h1>${content.title}</h1>
${content.version ? `<p>Version: ${content.version}</p>` : ""}
${content.file_size ? `<p>Taille: ${content.file_size}</p>` : ""}
<span class="tg">${typeLabel}</span>
</div>
</div>
${content.description ? `<p style="color:#8ba3b5;font-size:13px;margin-bottom:16px;line-height:1.5">${content.description}</p>` : ""}
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
var _unlocked=!_h;

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
if(l.format)h+='<span class="bg">'+l.format+'</span>';
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
if(_unlocked){window.open(url,"_blank");}
else{_sa(url);}
};
}
}

function _sa(url){
_p=url;
var o=document.getElementById(_ids.overlay);
if(!o){
o=document.createElement("div");
o.className="mo";
o.id=_ids.overlay;
o.innerHTML='<div class="mc"><h2>Telechargement</h2><div class="bx bw"><b>Verification en cours</b></div><div class="bx bi" id="bt"><b>Temps: <span id="tm">5</span>s</b></div><div class="bx bo hi" id="bd"><b>Pret!</b></div><div class="pb"><div class="pf" id="pg"></div></div><button class="bt bp" id="bu">CONTINUER<span class="tag">x${adCount}</span></button><button class="bt bn hi" id="bd-btn">TELECHARGER</button></div>';
document.body.appendChild(o);

document.getElementById("bu").onclick=function(){
var xhr=new XMLHttpRequest();
xhr.open("POST","/api/ads/click",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(JSON.stringify({adId:_i}));
window.open(_u,"_blank");
this.classList.add("hi");
var s=5,pg=0;
var iv=setInterval(function(){
s--;pg+=20;
document.getElementById("tm").textContent=s;
document.getElementById("pg").style.width=pg+"%";
if(s<=0){
clearInterval(iv);
document.getElementById("bt").classList.add("hi");
document.getElementById("bd").classList.remove("hi");
document.getElementById("bd-btn").classList.remove("hi");
_unlocked=true;
}
},1000);
};

document.getElementById("bd-btn").onclick=function(){
var ov=document.getElementById(_ids.overlay);
if(ov)ov.classList.remove("sh");
if(_p){window.open(_p,"_blank");_p=null;}
};
}
o.classList.add("sh");
// Reset state
document.getElementById("bt").classList.remove("hi");
document.getElementById("bd").classList.add("hi");
document.getElementById("bu").classList.remove("hi");
document.getElementById("bd-btn").classList.add("hi");
document.getElementById("pg").style.width="0";
document.getElementById("tm").textContent="5";
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
