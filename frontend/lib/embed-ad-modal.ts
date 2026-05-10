/**
 * Unified 2-step ad modal for all embed routes.
 *
 * Public API (server-side, returns CSS / HTML / JS strings to inline):
 *   buildAdModal2Step({ variant, ad1, ad2, title, subtitle, doneText, finalBtnLabel, autoShow })
 *     → { css, html, js, ids }
 *
 * Client-side (after the JS is injected):
 *   window._wwAdModal.show(payload, onComplete)
 *     - payload: any value passed back to onComplete after both ads are clicked
 *     - onComplete: function(payload) executed once the user finishes step 2
 *
 * Variants change the OVERLAY background color so each section keeps its identity:
 *   - "streaming" → dark blue (existing streaming look)
 *   - "download"  → purple/violet gradient (existing download look)
 *   - "livetv"    → orange gradient
 */

export type AdModalVariant = "streaming" | "download" | "livetv"

export interface AdModalIds {
  overlay: string
  step1: string
  step2: string
  btnUnlock1: string
  btnUnlock2: string
  btnFinal: string
  boxHelp: string
  boxThanks: string
  boxDone: string
  progress: string
}

function rid(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 10)
}

export function genAdModalIds(): AdModalIds {
  return {
    overlay: rid("ov"),
    step1: rid("s1"),
    step2: rid("s2"),
    btnUnlock1: rid("u1"),
    btnUnlock2: rid("u2"),
    btnFinal: rid("uf"),
    boxHelp: rid("bh"),
    boxThanks: rid("bk"),
    boxDone: rid("bd"),
    progress: rid("pg"),
  }
}

const VARIANTS: Record<AdModalVariant, { overlayBg: string; cardBg: string; cardBorder: string; titleColor: string; subColor: string; stepBg: string; stepActive: string; bp1: string; bp2: string; cfColor: string; cfLink: string; tagBg: string; tag2Bg: string; bw: string; bh: string; bi: string; bo: string }> = {
  streaming: {
    overlayBg: "background:rgba(20,25,40,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)",
    cardBg: "#1e2535",
    cardBorder: "#2e3a50",
    titleColor: "#dde4f0",
    subColor: "#8894aa",
    stepBg: "#2a3550",
    stepActive: "#667eea",
    bp1: "linear-gradient(135deg,#667eea,#764ba2)",
    bp2: "linear-gradient(135deg,#f59e0b,#ef4444)",
    cfColor: "#4a5570",
    cfLink: "#667eea",
    tagBg: "background:#2a3550;color:#8ba3d4",
    tag2Bg: "background:#2a3550;color:#f87171",
    bw: "background:#272215;border:1px solid #40341a;color:#c9972e",
    bh: "background:#271520;border:1px solid #402030;color:#b06890",
    bi: "background:#1e1a2e;border:1px solid #302848;color:#8a7ab8",
    bo: "background:#152218;border:1px solid #1e3a22;color:#3dba6a",
  },
  download: {
    overlayBg:
      "background:linear-gradient(135deg,rgba(102,126,234,0.95) 0%,rgba(118,75,162,0.95) 50%,rgba(240,147,251,0.95) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)",
    cardBg: "#ffffff",
    cardBorder: "rgba(0,0,0,0.06)",
    titleColor: "#1a1a2e",
    subColor: "#6b7280",
    stepBg: "#e5e7eb",
    stepActive: "#667eea",
    bp1: "linear-gradient(135deg,#667eea,#764ba2)",
    bp2: "linear-gradient(135deg,#f59e0b,#ef4444)",
    cfColor: "#9ca3af",
    cfLink: "#667eea",
    tagBg: "background:#fff;color:#667eea",
    tag2Bg: "background:#fff;color:#ef4444",
    bw: "background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e",
    bh: "background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d",
    bi: "background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:1px solid #8b5cf6;color:#5b21b6",
    bo: "background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46",
  },
  livetv: {
    overlayBg:
      "background:linear-gradient(135deg,rgba(251,146,60,0.95),rgba(234,88,12,0.95));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)",
    cardBg: "#ffffff",
    cardBorder: "rgba(0,0,0,0.06)",
    titleColor: "#1a1a2e",
    subColor: "#6b7280",
    stepBg: "#e5e7eb",
    stepActive: "#ea580c",
    bp1: "linear-gradient(135deg,#fb923c,#ea580c)",
    bp2: "linear-gradient(135deg,#dc2626,#991b1b)",
    cfColor: "#9ca3af",
    cfLink: "#ea580c",
    tagBg: "background:#fff;color:#ea580c",
    tag2Bg: "background:#fff;color:#dc2626",
    bw: "background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e",
    bh: "background:linear-gradient(135deg,#fce7f3,#fbcfe8);border:1px solid #ec4899;color:#9d174d",
    bi: "background:linear-gradient(135deg,#ffedd5,#fed7aa);border:1px solid #ea580c;color:#9a3412",
    bo: "background:linear-gradient(135deg,#d1fae5,#a7f3d0);border:1px solid #10b981;color:#065f46",
  },
}

export interface BuildAdModalOpts {
  ids?: AdModalIds
  variant: AdModalVariant
  ad1: string
  ad2: string
  title: string
  subtitle: string
  doneText: string // text shown in the "all set" green box: e.g. "Cliquez pour voir le lien"
  finalBtnLabel: string // label of the optional final action button: e.g. "VOIR LE LIEN"
  showFinalBtn: boolean // true = render a final action button user must click; false = auto-fire onComplete after step 2
  autoShow?: boolean // if true, the modal opens at page load (streaming/livetv flow). default false.
  /** JS expression evaluating to a function that becomes the default onComplete when autoShow=true.
   *  Example: "function(){startPlayer();}". Required only if autoShow=true and you don't pass a callback at .show() */
  defaultOnComplete?: string
}

/**
 * Returns CSS / HTML / JS strings + ids to be inlined into a Next.js HTML route.
 */
export function buildAdModal2Step(opts: BuildAdModalOpts): {
  ids: AdModalIds
  css: string
  html: string
  js: string
} {
  const ids = opts.ids || genAdModalIds()
  const v = VARIANTS[opts.variant]
  const showFinal = opts.showFinalBtn

  // ── CSS ──────────────────────────────────────────────────────────────────
  // Scoped via #${ids.overlay} so multiple modals with different variants
  // would not collide if ever rendered on the same page. We still expose the
  // generic .mo / .mc / .step / .bt / .bx classes inside the overlay only.
  const css = `
#${ids.overlay}{position:fixed;inset:0;${v.overlayBg};display:none;align-items:center;justify-content:center;z-index:9999;padding:12px;overflow-y:auto}
#${ids.overlay}.sh{display:flex}
#${ids.overlay} .ww-mc{background:${v.cardBg};border:1px solid ${v.cardBorder};border-radius:16px;padding:22px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,.35);max-height:min(90vh,90dvh);overflow-y:auto;-webkit-overflow-scrolling:touch;margin:auto}
#${ids.overlay} .ww-mc h2{color:${v.titleColor};margin:0 0 6px;font-size:20px;font-weight:700;line-height:1.25}
#${ids.overlay} .ww-mc-sub{color:${v.subColor};font-size:13px;margin-bottom:14px}
#${ids.overlay} .ww-steps{display:flex;justify-content:center;gap:8px;margin-bottom:14px}
#${ids.overlay} .ww-step{width:10px;height:10px;border-radius:50%;background:${v.stepBg};transition:all .3s}
#${ids.overlay} .ww-step.active{background:${v.stepActive};transform:scale(1.2)}
#${ids.overlay} .ww-step.done{background:#10b981}
#${ids.overlay} .ww-bx{border-radius:10px;padding:11px;margin:7px 0;text-align:left;display:flex;align-items:flex-start;gap:10px}
#${ids.overlay} .ww-bx svg{flex-shrink:0;width:18px;height:18px;min-width:18px}
#${ids.overlay} .ww-bx-c{flex:1;min-width:0}
#${ids.overlay} .ww-bx-c b{display:block;font-size:13px;margin-bottom:2px;line-height:1.25}
#${ids.overlay} .ww-bx-c span{font-size:12px;opacity:.85;display:block;word-break:break-word;line-height:1.35}
#${ids.overlay} .ww-bw{${v.bw}}
#${ids.overlay} .ww-bh{${v.bh}}
#${ids.overlay} .ww-bi{${v.bi}}
#${ids.overlay} .ww-bo{${v.bo}}
#${ids.overlay} .ww-pb{height:4px;background:${v.stepBg};border-radius:3px;margin:12px 0;overflow:hidden}
#${ids.overlay} .ww-pf{height:100%;width:0;background:linear-gradient(90deg,#667eea,#764ba2,#ec4899);transition:width .3s;border-radius:3px}
#${ids.overlay} .ww-bt{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:7px;text-transform:uppercase;letter-spacing:.5px;transition:opacity .15s,transform .15s;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px}
#${ids.overlay} .ww-bt:active{opacity:.85;transform:translateY(1px)}
#${ids.overlay} .ww-bp1{background:${v.bp1};color:#fff}
#${ids.overlay} .ww-bp2{background:${v.bp2};color:#fff}
#${ids.overlay} .ww-bg{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
#${ids.overlay} .ww-hi{display:none !important}
#${ids.overlay} .ww-cf{margin-top:10px;font-size:11px;color:${v.cfColor}}
#${ids.overlay} .ww-cf a{color:${v.cfLink};text-decoration:none}
#${ids.overlay} .ww-tag{${v.tagBg};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
#${ids.overlay} .ww-tag2{${v.tag2Bg};padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
@media(max-width:479px){
  #${ids.overlay}{padding:8px}
  #${ids.overlay} .ww-mc{padding:16px;border-radius:14px}
  #${ids.overlay} .ww-mc h2{font-size:17px}
  #${ids.overlay} .ww-mc-sub{font-size:12px;margin-bottom:11px}
  #${ids.overlay} .ww-bx{padding:9px;gap:8px;border-radius:9px}
  #${ids.overlay} .ww-bt{padding:11px;font-size:13px;border-radius:9px}
}
@media(max-width:360px){
  #${ids.overlay} .ww-mc{padding:14px}
  #${ids.overlay} .ww-bt{padding:10px;font-size:12px}
}
`.trim()

  // ── HTML ─────────────────────────────────────────────────────────────────
  const finalBtnHtml = showFinal
    ? `<button class="ww-bt ww-bg ww-hi" id="${ids.btnFinal}">${opts.finalBtnLabel}</button>`
    : ""

  const html = `
<div id="${ids.overlay}">
  <div class="ww-mc">
    <h2>${opts.title}</h2>
    <div class="ww-mc-sub">${opts.subtitle}</div>
    <div class="ww-steps">
      <div class="ww-step active" id="${ids.step1}"></div>
      <div class="ww-step" id="${ids.step2}"></div>
    </div>
    <div class="ww-bx ww-bw">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div class="ww-bx-c"><b>Popup requis</b><span>Autorisez les popups pour continuer</span></div>
    </div>
    <div class="ww-bx ww-bh" id="${ids.boxHelp}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <div class="ww-bx-c"><b>Soutenez le service gratuit</b><span>Votre clic nous aide à rester en ligne</span></div>
    </div>
    <div class="ww-bx ww-bi ww-hi" id="${ids.boxThanks}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="ww-bx-c"><b>Étape 1 validée !</b><span>Cliquez sur le 2ème bouton pour continuer</span></div>
    </div>
    <div class="ww-bx ww-bo ww-hi" id="${ids.boxDone}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="ww-bx-c"><b>Tout est prêt !</b><span>${opts.doneText}</span></div>
    </div>
    <div class="ww-pb"><div class="ww-pf" id="${ids.progress}"></div></div>
    <button class="ww-bt ww-bp1" id="${ids.btnUnlock1}">ÉTAPE 1 / 2<span class="ww-tag">PUB</span></button>
    <button class="ww-bt ww-bp2 ww-hi" id="${ids.btnUnlock2}">ÉTAPE 2 / 2<span class="ww-tag2">PUB</span></button>
    ${finalBtnHtml}
    <div class="ww-cf">Propulsé par <a href="https://wavewatch.top" target="_blank">WaveWatch</a></div>
  </div>
</div>
`.trim()

  // ── JS ───────────────────────────────────────────────────────────────────
  const autoShowJs = opts.autoShow
    ? `try{window._wwAdModal.show(null, ${opts.defaultOnComplete || "null"});}catch(e){}`
    : ""

  const finalBlockJs = showFinal
    ? `
        var bf=document.getElementById(_ids.btnFinal);
        if(bf){bf.classList.remove("ww-hi");bf.onclick=function(){
          document.getElementById(_ids.overlay).classList.remove("sh");
          if(typeof _onComp==="function"){var p=_payload;_payload=null;var c=_onComp;_onComp=null;c(p);}
          else{_payload=null;_onComp=null;}
        };}`
    : `
        setTimeout(function(){
          document.getElementById(_ids.overlay).classList.remove("sh");
          if(typeof _onComp==="function"){var p=_payload;_payload=null;var c=_onComp;_onComp=null;c(p);}
          else{_payload=null;_onComp=null;}
        },350);`

  const js = `
window._wwAdModal=(function(){
  var _ids=${JSON.stringify(ids)};
  var _payload=null,_onComp=null,_adStep=0;
  function $$(id){return document.getElementById(id);}
  function _openAd(url){
    if(!url)return;
    var a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }
  function show(payload,onComplete){
    _payload=(typeof payload==="undefined")?null:payload;
    _onComp=(typeof onComplete==="function")?onComplete:null;
    _adStep=0;
    var s1=$$(_ids.step1),s2=$$(_ids.step2);
    if(s1)s1.className="ww-step active";
    if(s2)s2.className="ww-step";
    var pr=$$(_ids.progress);if(pr)pr.style.width="0%";
    var b1=$$(_ids.btnUnlock1),b2=$$(_ids.btnUnlock2),bf=$$(_ids.btnFinal);
    if(b1)b1.classList.remove("ww-hi");
    if(b2)b2.classList.add("ww-hi");
    if(bf)bf.classList.add("ww-hi");
    var bh=$$(_ids.boxHelp),bk=$$(_ids.boxThanks),bd=$$(_ids.boxDone);
    if(bh)bh.classList.remove("ww-hi");
    if(bk)bk.classList.add("ww-hi");
    if(bd)bd.classList.add("ww-hi");
    var ov=$$(_ids.overlay);if(ov)ov.classList.add("sh");
  }
  var _b1=$$(_ids.btnUnlock1);
  if(_b1){_b1.onclick=function(){
    if(_adStep>=1)return;
    _adStep=1;
    _openAd(${JSON.stringify(opts.ad1)});
    var s1=$$(_ids.step1),s2=$$(_ids.step2);
    if(s1)s1.className="ww-step done";
    if(s2)s2.className="ww-step active";
    var pr=$$(_ids.progress);if(pr)pr.style.width="50%";
    _b1.classList.add("ww-hi");
    var b2=$$(_ids.btnUnlock2);if(b2)b2.classList.remove("ww-hi");
    var bh=$$(_ids.boxHelp);if(bh)bh.classList.add("ww-hi");
    var bk=$$(_ids.boxThanks);if(bk)bk.classList.remove("ww-hi");
  };}
  var _b2=$$(_ids.btnUnlock2);
  if(_b2){_b2.onclick=function(){
    if(_adStep>=2)return;
    _adStep=2;
    _openAd(${JSON.stringify(opts.ad2)});
    var s2=$$(_ids.step2);if(s2)s2.className="ww-step done";
    var pr=$$(_ids.progress);if(pr)pr.style.width="100%";
    _b2.classList.add("ww-hi");
    var bk=$$(_ids.boxThanks);if(bk)bk.classList.add("ww-hi");
    var bd=$$(_ids.boxDone);if(bd)bd.classList.remove("ww-hi");
    ${finalBlockJs}
  };}
  return {show:show};
})();
${autoShowJs}
`.trim()

  return { ids, css, html, js }
}
