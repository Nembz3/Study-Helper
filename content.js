(()=>{
  const ROOT_ID="study-helper-v3-root";
  const VERSION="3.7.0";
  const IGNORE=[/tasks completed/i,/\bup next\b/i,/\bsection complete\b/i,/your memory has been stored/i,/memory strength/i,/time spent/i,/current level/i,/\btotal xp\b/i,/choose where to store your memory/i,/summer revision/i,/^assignment$/i,/^quiz$/i,/^wrong answers$/i];
  const NAV=new Set(["continue","next","back","close","skip","exit","home","reveal answer"]);
  const ACTION_RX=/\b(reveal answer|choose an answer|select an answer|type your answer|check answer|submit|switch the toggles|drag into the correct order|select all that apply|fill in|fill the gaps?)\b/i;
  const TASK_RX=/\b(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange|true|false|percentage|percent|value|speed|distance|time|graph|diagram|image|figure|chart|plot|shown|above|below|equation|formula|mass|volume|temperature)\b/i;
  const DRAG_RX=/\b(drag|drop|correct order|arrange|reorder|sort|move)\b/i;
  const INPUT_SELECTOR='input:not([type="hidden"]),textarea,[contenteditable="true"]';
  let lastSignature="",dismissedSignature="",analysing=false,debounce,lastScanAt=0,pending="",pendingSince=0;
  const cache=new Map(),rapidAnalysed=new Set();
  const clean=s=>(s||"").replace(/\s+/g," ").trim();
  const log=(event,data={})=>{try{chrome.runtime.sendMessage({type:"study-helper-log",event,data});}catch(e){}};
  function visible(el){
    if(!el||el.closest?.("#"+ROOT_ID))return false;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return r.width>12&&r.height>8&&s.display!=="none"&&s.visibility!=="hidden"&&s.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
  }
  const textOf=el=>clean(el?.innerText||el?.textContent||"");
  const labelOf=el=>clean(el?.innerText||el?.value||el?.getAttribute?.("aria-label")||el?.getAttribute?.("placeholder")||el?.getAttribute?.("name")||el?.getAttribute?.("title")||"");
  const ignored=t=>IGNORE.some(rx=>rx.test(t));
  const isTextInput=el=>el?.matches?.(INPUT_SELECTOR);
  function controls(){
    return [...document.querySelectorAll('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input:not([type="hidden"]),textarea,[contenteditable="true"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')].filter(el=>{
      if(!visible(el)||el.closest?.("#"+ROOT_ID))return false;
      if(isTextInput(el))return true;
      const t=labelOf(el),l=t.toLowerCase();
      if(!t||t.length>280||NAV.has(l)||/^(report a problem|start reading text|stop reading text|topic notes|collapse toolbar|expand toolbar|flag|close|scroll down to continue|switch the toggles)$/i.test(t))return false;
      return true;
    });
  }
  function unique(items){
    const out=[],seen=new Set();
    for(const item of items){
      const t=clean(item).replace(/^(?:[A-Z]|\d+)[.)]\s*/,"");
      const k=t.toLowerCase();
      if(t.length>1&&t.length<300&&!seen.has(k)){seen.add(k);out.push(t);}
    }
    return out.slice(0,12);
  }
  function controlClusters(list){
    const sorted=[...list].sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
    const clusters=[];let cur=[];
    for(const el of sorted){
      const r=el.getBoundingClientRect(),prev=cur.at(-1)?.getBoundingClientRect();
      if(prev&&r.top-prev.bottom>110){if(cur.length)clusters.push(cur);cur=[];}
      cur.push(el);
    }
    if(cur.length)clusters.push(cur);
    return clusters;
  }
  function scoreCluster(c){
    if(c.length===1&&!isTextInput(c[0]))return -1e9;
    const rs=c.map(x=>x.getBoundingClientRect()),top=Math.min(...rs.map(r=>r.top)),bottom=Math.max(...rs.map(r=>r.bottom));
    const avg=rs.reduce((n,r)=>n+r.width,0)/rs.length;
    const variance=rs.reduce((n,r)=>n+Math.abs(r.width-avg),0)/rs.length;
    let s=c.length*120+Math.max(0,100-variance);
    if(c.length===1&&isTextInput(c[0]))s+=260;
    if(top>-80&&bottom<innerHeight+80)s+=100;
    s-=Math.abs((top+bottom)/2-innerHeight*.52)/4;
    return s;
  }
  function bestCluster(list){
    let best=null,score=-1e9;
    for(const c of controlClusters(list)){const s=scoreCluster(c);if(s>score){score=s;best=c;}}
    return best;
  }
  function textBlocks(group,firstTop){
    const gr=group.getBoundingClientRect(),out=[],seen=new Set();
    for(const el of group.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div,label,article,section")){
      if(!visible(el)||el.closest?.("#"+ROOT_ID))continue;
      const r=el.getBoundingClientRect();
      if(r.top>firstTop+24||r.bottom<Math.max(gr.top,firstTop-1000)||r.width<45||r.height<8)continue;
      if(el.querySelector('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input,select,textarea,[contenteditable="true"]'))continue;
      const raw=clean(el.innerText||el.textContent||"");
      if(!raw||raw.length<5||raw.length>700)continue;
      const k=raw.toLowerCase();
      if(seen.has(k)||ignored(raw)||ACTION_RX.test(raw))continue;
      if(/^(assignment|quiz|wrong answers|how do you want to learn|scroll down to continue|report a problem|start reading text|topic notes|collapse toolbar)$/i.test(raw))continue;
      seen.add(k);
      let score=0;
      if(/\?$/.test(raw))score+=45;
      if(TASK_RX.test(raw))score+=18;
      if(/\b(true|false|correct|incorrect|following|statement|speed|calculate|distance|time|graph|diagram|percentage|percent|value|equation|formula)\b/i.test(raw))score+=10;
      if(raw.length>12&&raw.length<320)score+=10;
      score+=Math.max(0,24-Math.max(0,firstTop-r.bottom)/28);
      out.push({text:raw,score,top:r.top,bottom:r.bottom});
    }
    return out;
  }
  function questionNear(group,cluster){
    const firstTop=Math.min(...cluster.map(c=>c.getBoundingClientRect().top));
    const candidates=textBlocks(group,firstTop).sort((a,b)=>b.score-a.score||b.bottom-a.bottom);
    if(!candidates.length)return "";
    const best=candidates[0];
    const nearby=candidates.filter(x=>x.bottom<=firstTop+20&&x.top>=best.top-260&&x.score>=best.score-14).sort((a,b)=>a.top-b.top);
    const parts=[];
    for(const item of nearby){
      if(parts.some(x=>x.toLowerCase()===item.text.toLowerCase()))continue;
      parts.push(item.text);
      if(parts.join(" ").length>=520)break;
    }
    return clean(parts.length?parts.join(" "):best.text).slice(0,700);
  }
  function fallbackQuestion(group,options){
    const optionSet=new Set(options.map(x=>x.toLowerCase()));
    const lines=(group.innerText||group.textContent||"").split(/\n+/).map(clean).filter(Boolean);
    const candidates=lines.filter(x=>x.length>=4&&x.length<=500&&!optionSet.has(x.toLowerCase())&&!NAV.has(x.toLowerCase())&&!ACTION_RX.test(x)&&!ignored(x));
    let idx=candidates.findIndex(x=>/\?$/.test(x));
    if(idx<0)idx=candidates.findIndex(x=>/^(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange|for what|to what|at what|in what|by what)\b/i.test(x));
    if(idx<0)return candidates.find(x=>x.length>15&&x.length<280)||"";
    return clean(candidates.slice(Math.max(0,idx-2),Math.min(candidates.length,idx+3)).join(" ")).slice(0,700);
  }
  function detectImages(group,question){
    const imgs=[...group.querySelectorAll("img")].filter(visible);
    const canvases=[...group.querySelectorAll("canvas")].filter(visible);
    const imageMeta=imgs.map(img=>({src:img.currentSrc||img.src,alt:clean(img.alt||img.getAttribute("aria-label")||""),width:img.naturalWidth||img.width,height:img.naturalHeight||img.height})).filter(x=>x.src);
    const canvasMeta=canvases.map(c=>{try{return {dataUrl:c.toDataURL("image/png"),width:c.width,height:c.height};}catch(e){return {width:c.width,height:c.height};}});
    const hasGraphText=/\b(graph|diagram|image|figure|chart|plot|shown|above|below|picture|photo|illustration)\b/i.test(question+" "+textOf(group));
    return {images:imageMeta.slice(0,4),canvases:canvasMeta.slice(0,2),hasVisual:hasGraphText||imageMeta.length>0||canvasMeta.length>0};
  }
  async function blobToDataUrl(blob){return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob);});}
  async function prepareVisuals(visuals){
    const out=[];
    for(const c of visuals.canvases||[]){if(c.dataUrl)out.push({type:"data",data:c.dataUrl});}
    for(const img of visuals.images||[]){
      try{
        const r=await fetch(img.src,{credentials:"include",cache:"force-cache"});
        if(r.ok){const data=await blobToDataUrl(await r.blob());out.push({type:"data",data});continue;}
      }catch(e){}
      out.push({type:"url",url:img.src});
    }
    return out.slice(0,4);
  }
  function focusedActivity(group,cluster){
    const raw=textOf(group);if(raw.length<5||raw.length>5000||ignored(raw))return null;
    const typed=cluster.length===1&&isTextInput(cluster[0]);
    const options=typed?[]:unique(cluster.map(labelOf));
    if(!typed&&options.length<2)return null;
    const question=questionNear(group,cluster)||fallbackQuestion(group,options);if(!question)return null;
    const lower=(question+" "+raw).toLowerCase();
    let type=typed?"text_input":"choice";
    const toggleCount=cluster.filter(x=>x.matches('[role="checkbox"],[role="switch"],[aria-pressed="true"],[aria-pressed="false"]')).length;
    if((!typed&&toggleCount>=2)||/select all that apply|which of these are true|switch the toggles/i.test(lower))type="multi_select";
    else if(DRAG_RX.test(lower)||cluster.some(x=>x.matches('[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')))type="ordering";
    else if(cluster.some(isTextInput))type="text_input";
    const instruction=raw.split(/\n+/).map(clean).find(x=>ACTION_RX.test(x)||DRAG_RX.test(x))||"";
    const visuals=detectImages(group,question);
    const activity={type,question:clean(question),options:options.slice(0,10),instruction,evidence:typed?18:16,visuals};
    activity.signature=signature(activity);
    return activity;
  }
  function detectActivity(){
    const list=controls();if(!list.length)return null;
    const candidates=[],seen=new Set();
    for(const seed of list){
      let el=seed.parentElement;
      for(let depth=0;el&&depth<11;depth++,el=el.parentElement){
        if(seen.has(el)||!visible(el))continue;seen.add(el);
        const r=el.getBoundingClientRect();if(r.width<140||r.height<45||r.width*r.height>innerWidth*innerHeight*2.8)continue;
        const local=list.filter(c=>el.contains(c));if(!local.length)continue;
        const normal=bestCluster(local),possible=[];if(normal)possible.push(normal);
        for(const input of local.filter(isTextInput))possible.push([input]);
        for(const cluster of possible){
          const activity=focusedActivity(el,cluster);if(!activity)continue;
          const top=Math.min(...cluster.map(c=>c.getBoundingClientRect().top));
          let rank=activity.evidence*100000-areaPenalty(r)-Math.abs(top-innerHeight*.48)*4+cluster.length*18000;
          if(activity.visuals?.hasVisual)rank+=12000;
          if(activity.type==="text_input")rank+=50000;
          if(r.top>-120&&r.bottom<innerHeight+120)rank+=250000;
          candidates.push({activity,rank});
        }
      }
    }
    candidates.sort((a,b)=>b.rank-a.rank);
    const result=candidates[0]?.activity||null;
    if(result)log("activity_detected",{type:result.type,question:result.question,optionCount:result.options.length,visual:!!result.visuals?.hasVisual});
    return result;
  }
  function areaPenalty(r){return Math.min(500000,(r.width*r.height)/10);}
  function signature(a){return [a.type,a.question,...(a.options||[]),a.instruction||"",a.visuals?.hasVisual?"visual":""].join("|").toLowerCase().replace(/\s+/g," ").slice(0,1800);}
  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}
  function preview(a){const bits=[a.question];if(a.options?.length)bits.push("Options: "+a.options.join(" • "));if(a.visuals?.hasVisual)bits.push("Visual: graph/image detected");return clean(bits.join("\n")).slice(0,900);}
  function mount(activity){
    const sig=activity.signature;if(!activity.question||sig===dismissedSignature)return;if(sig===lastSignature&&document.getElementById(ROOT_ID))return;
    lastSignature=sig;dismissedSignature="";removeRoot();
    const root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V${VERSION}</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label"><span class="sh-type"></span> activity detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>`;
    root.querySelector(".sh-type").textContent=activity.type.replace("_"," ");root.querySelector(".sh-question").textContent=preview(activity);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();log("activity_dismissed",{signature:sig.slice(0,120)});};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",activity,root);root.querySelector(".sh-explain").onclick=()=>analyse("explain",activity,root);root.querySelector(".sh-answer").onclick=()=>analyse("answer",activity,root);
    root.querySelector(".sh-copy").onclick=async()=>{const t=root.querySelector(".sh-response").textContent;try{await navigator.clipboard.writeText(t);root.querySelector(".sh-copy").textContent="Copied!";setTimeout(()=>root.querySelector(".sh-copy").textContent="Copy answer",1200);log("answer_copied");}catch(e){log("copy_failed",{error:e.message});}};
    document.documentElement.appendChild(root);log("panel_mounted",{type:activity.type,question:activity.question,visual:!!activity.visuals?.hasVisual});
    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse&&!rapidAnalysed.has(sig)){rapidAnalysed.add(sig);analyse("answer",activity,root);}});
  }
  async function analyse(mode,activity,root){
    if(!root.isConnected)return;
    const key=mode+"|"+activity.signature,status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy");
    if(cache.has(key)){status.textContent="Cached result";response.textContent=cache.get(key).text;copy.hidden=mode!=="answer";log("cache_hit",{mode});return;}
    if(analysing){status.textContent="Please wait for the current response…";return;}
    analysing=true;status.textContent=mode==="hint"?"Getting hint…":mode==="answer"?"Getting quick answer…":"Explaining…";response.textContent="";copy.hidden=true;
    log("analysis_started",{mode,type:activity.type,question:activity.question,visual:!!activity.visuals?.hasVisual});
    try{
      const prepared={...activity,visualInputs:await prepareVisuals(activity.visuals||{})};
      const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,activity:prepared});
      if(!r?.ok)throw new Error(r?.error||"Analysis failed");
      if(!String(r.text||"").trim())throw new Error("AI returned an empty response");
      cache.set(key,r);if(cache.size>80)cache.delete(cache.keys().next().value);
      if(root.isConnected){status.textContent="AI: "+r.provider;response.textContent=r.text;copy.hidden=mode!=="answer";}
      log("analysis_succeeded",{mode,provider:r.provider,chars:String(r.text).length,visual:!!activity.visuals?.hasVisual});
    }catch(e){if(root.isConnected)status.textContent="Error: "+e.message;log("analysis_failed",{mode,error:e.message});}
    finally{analysing=false;}
  }
  function scan(){
    const now=Date.now();if(now-lastScanAt<140)return;lastScanAt=now;
    const activity=detectActivity();if(!activity){pending="";pendingSince=0;return;}
    const sig=activity.signature;
    if(sig!==pending){pending=sig;pendingSince=now;setTimeout(()=>{const confirmed=detectActivity();if(confirmed&&confirmed.question&&(confirmed.type==="text_input"||confirmed.options?.length>=2))mount(confirmed);},220);return;}
    if(now-pendingSince>=180)mount(activity);
  }
  const observer=new MutationObserver(()=>{clearTimeout(debounce);debounce=setTimeout(scan,150);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(debounce);debounce=setTimeout(scan,120)},{passive:true});
  addEventListener("resize",()=>{clearTimeout(debounce);debounce=setTimeout(scan,120)});
  setTimeout(scan,450);setInterval(scan,750);
  log("content_loaded",{version:VERSION,url:location.href});
})();
