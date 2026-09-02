(()=>{
  const ROOT_ID="study-helper-v3-root";
  const VERSION="3.8.0";
  const IGNORE=[
    /tasks completed/i,/\bup next\b/i,/\bsection complete\b/i,/your memory has been stored/i,
    /memory strength/i,/time spent/i,/current level/i,/\btotal xp\b/i,/choose where to store your memory/i,
    /summer revision/i,/^assignment$/i,/^quiz$/i,/^wrong answers$/i,/how do you want to learn/i
  ];
  const UI_PHRASES=/^(report a problem|start reading text|stop reading text|topic notes|collapse toolbar|expand toolbar|flag|close|scroll down to continue|switch the toggles|choose an answer|reveal answer|next|back|continue|skip|exit|home)$/i;
  const ACTION_RX=/\b(reveal answer|choose an answer|select an answer|type your answer|check answer|submit|switch the toggles|drag into the correct order|select all that apply|fill in|fill the gaps?|choose one)\b/i;
  const QUESTION_RX=/\b(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange|true|false|for what|to what|at what|in what|by what|percentage|percent|value|speed|distance|time|graph|diagram|image|figure|equation|formula|mass|volume|temperature|force|energy|velocity|resultant)\b/i;
  const DRAG_RX=/\b(drag|drop|correct order|arrange|reorder|sort|move)\b/i;
  const INPUT_SELECTOR='input:not([type="hidden"]),textarea,[contenteditable="true"]';
  let lastSignature="",dismissedSignature="",analysing=false,debounce,lastScanAt=0,pending="",pendingSince=0,dead=false;
  const cache=new Map(),rapidAnalysed=new Set();
  let observer=null,scanTimer=null;
  const clean=s=>(s||"").replace(/\u00a0/g," ").replace(/[ \t\r\f]+/g," ").replace(/\n{2,}/g,"\n").trim();
  const flat=s=>clean(s).replace(/\s+/g," ").trim();
  function contextAlive(){try{return !!chrome?.runtime?.id;}catch{return false;}}
  function killContext(){if(dead)return;dead=true;try{observer?.disconnect();}catch{};try{clearInterval(scanTimer);}catch{};clearTimeout(debounce);}
  async function sendMessage(message){
    if(!contextAlive()){killContext();return {ok:false,error:"Extension was reloaded. Refresh this Seneca tab."};}
    try{return await chrome.runtime.sendMessage(message);}catch(e){
      const msg=String(e?.message||e);
      if(/extension context invalidated|receiving end does not exist/i.test(msg)){killContext();return {ok:false,error:"Extension was reloaded. Refresh this Seneca tab."};}
      throw e;
    }
  }
  const log=(event,data={})=>{if(dead)return;sendMessage({type:"study-helper-log",event,data}).catch(()=>{});};
  function visible(el){
    if(!el||el.closest?.("#"+ROOT_ID))return false;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return r.width>10&&r.height>8&&s.display!=="none"&&s.visibility!=="hidden"&&s.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
  }
  const textOf=el=>flat(el?.innerText||el?.textContent||"");
  const labelOf=el=>flat(el?.innerText||el?.value||el?.getAttribute?.("aria-label")||el?.getAttribute?.("placeholder")||el?.getAttribute?.("name")||el?.getAttribute?.("title")||el?.getAttribute?.("data-testid")||"");
  const ignored=t=>!t||IGNORE.some(rx=>rx.test(t));
  const isTextInput=el=>!!el?.matches?.(INPUT_SELECTOR);
  function allControls(){
    const selector='button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input:not([type="hidden"]),textarea,[contenteditable="true"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]';
    return [...document.querySelectorAll(selector)].filter(el=>{
      if(!visible(el))return false;
      if(isTextInput(el)){
        const ph=labelOf(el).toLowerCase();
        return !/search|find|message|chat|copilot|email|password|login/i.test(ph);
      }
      const t=labelOf(el);
      if(!t||t.length>260||UI_PHRASES.test(t))return false;
      if(/^(settings|menu|more options|open|help|feedback|share|copy|listen|read aloud)$/i.test(t))return false;
      return true;
    });
  }
  function unique(items){
    const out=[],seen=new Set();
    for(const item of items){
      const t=flat(item).replace(/^(?:[A-Z]|\d+)[.)]\s*/,"");
      const k=t.toLowerCase();
      if(t.length>1&&t.length<300&&!seen.has(k)&&!UI_PHRASES.test(t)){seen.add(k);out.push(t);}
    }
    return out.slice(0,12);
  }
  function rect(el){return el.getBoundingClientRect();}
  function center(r){return {x:r.left+r.width/2,y:r.top+r.height/2};}
  function overlapX(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));}
  function controlGroups(list){
    const unused=new Set(list),groups=[];
    while(unused.size){
      const seed=unused.values().next().value;unused.delete(seed);
      const group=[seed];let changed=true;
      while(changed){
        changed=false;
        for(const el of [...unused]){
          const r=rect(el);
          const close=group.some(g=>{
            const q=rect(g),vGap=Math.min(Math.abs(r.top-q.bottom),Math.abs(q.top-r.bottom));
            const sameRow=Math.abs(center(r).y-center(q).y)<Math.max(r.height,q.height)*1.8;
            return vGap<180&&(overlapX(r,q)>Math.min(r.width,q.width)*0.12||sameRow);
          });
          if(close){group.push(el);unused.delete(el);changed=true;}
        }
      }
      groups.push(group);
    }
    return groups.filter(g=>g.length);
  }
  function candidateAncestors(seed,group){
    const out=[],seen=new Set();let el=seed;
    for(let depth=0;el&&depth<14;depth++,el=el.parentElement){
      if(seen.has(el))continue;seen.add(el);
      if(el===document.body||el===document.documentElement)break;
      const r=rect(el);if(r.width<180||r.height<40)continue;
      if(r.width>innerWidth*0.98&&r.height>innerHeight*0.9)continue;
      if(r.height>innerHeight*1.25)continue;
      const contained=group.every(c=>el.contains(c));
      if(contained)out.push(el);
    }
    return out;
  }
  function directTextBlocks(group){
    const nodes=[...group.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,label,span,div,article,section')];
    const out=[],seen=new Set();
    for(const el of nodes){
      if(!visible(el)||el.closest?.("#"+ROOT_ID))continue;
      if(el.querySelector('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input,textarea,select,[contenteditable="true"],[draggable="true"]'))continue;
      const raw=flat(el.innerText||el.textContent||"");
      if(raw.length<4||raw.length>650||ignored(raw)||UI_PHRASES.test(raw)||ACTION_RX.test(raw))continue;
      const r=rect(el);
      const key=raw.toLowerCase();
      if(seen.has(key))continue;seen.add(key);
      let score=0;
      if(/\?$/.test(raw))score+=70;
      if(QUESTION_RX.test(raw))score+=30;
      if(/\b(complete|fill|choose|select|calculate|state|identify|for what|to what|at what|in what)\b/i.test(raw))score+=22;
      if(raw.length>=12&&raw.length<=320)score+=14;
      if(/\b(graph|diagram|image|figure|chart|shown below|shown above|picture|photo)\b/i.test(raw))score+=18;
      out.push({el,text:raw,score,top:r.top,bottom:r.bottom,left:r.left,right:r.right});
    }
    return out;
  }
  function questionFromCard(card,controls){
    const blocks=directTextBlocks(card);
    const firstTop=Math.min(...controls.map(c=>rect(c).top));
    const relevant=blocks.filter(b=>b.bottom<=firstTop+35&&b.bottom>=firstTop-700);
    const scored=(relevant.length?relevant:blocks).sort((a,b)=>b.score-a.score||Math.abs(firstTop-b.bottom)-Math.abs(firstTop-a.bottom));
    if(!scored.length)return "";
    const anchor=scored[0];
    const parts=scored.filter(b=>b.bottom<=firstTop+35&&b.top>=anchor.top-240&&b.score>=anchor.score-24).sort((a,b)=>a.top-b.top).slice(0,8).map(b=>b.text);
    let q=flat(parts.join(" "));
    if(q.length<8)q=anchor.text;
    if(!QUESTION_RX.test(q)&&!/[?]$/.test(q)){
      const lines=flat(card.innerText||card.textContent||"").split(/\n+/).map(flat).filter(x=>x.length>=5&&x.length<500&&!UI_PHRASES.test(x)&&!ACTION_RX.test(x)&&!ignored(x));
      const qi=lines.findIndex(x=>/[?]$/.test(x)||QUESTION_RX.test(x));
      if(qi>=0)q=flat(lines.slice(Math.max(0,qi-2),Math.min(lines.length,qi+3)).join(" "));
    }
    return q.slice(0,800);
  }
  function fallbackQuestion(card,options){
    const optSet=new Set(options.map(x=>x.toLowerCase()));
    const lines=clean(card.innerText||card.textContent||"").split(/\n+/).map(flat).filter(Boolean);
    const usable=lines.filter(x=>x.length>=4&&x.length<=500&&!optSet.has(x.toLowerCase())&&!UI_PHRASES.test(x)&&!ACTION_RX.test(x)&&!ignored(x));
    let idx=usable.findIndex(x=>/[?]$/.test(x));
    if(idx<0)idx=usable.findIndex(x=>QUESTION_RX.test(x));
    return idx>=0?flat(usable.slice(Math.max(0,idx-2),Math.min(usable.length,idx+3)).join(" ")).slice(0,800):usable.find(x=>x.length>15&&x.length<320)||"";
  }
  function visualMeta(card){
    const imgs=[...card.querySelectorAll("img")].filter(visible).map(img=>({src:img.currentSrc||img.src,alt:flat(img.alt||img.getAttribute("aria-label")||""),width:img.naturalWidth||img.width,height:img.naturalHeight||img.height})).filter(x=>x.src);
    const canvases=[...card.querySelectorAll("canvas")].filter(visible).map(c=>{try{return {dataUrl:c.toDataURL("image/png"),width:c.width,height:c.height};}catch{return {width:c.width,height:c.height};}});
    const svg=[...card.querySelectorAll("svg")].filter(visible).length;
    const hasVisual=imgs.length>0||canvases.length>0||svg>0||/\b(graph|diagram|image|figure|chart|plot|shown below|shown above|picture|photo|illustration)\b/i.test(textOf(card));
    return {images:imgs.slice(0,6),canvases:canvases.slice(0,3),svgCount:svg,hasVisual};
  }
  function classify(controls,question,card){
    const inputs=controls.filter(isTextInput);
    const radios=controls.filter(x=>x.matches('[role="radio"],input[type="radio"]'));
    const checks=controls.filter(x=>x.matches('[role="checkbox"],[role="switch"],input[type="checkbox"]'));
    const drags=controls.filter(x=>x.matches('[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]'));
    const opts=unique(controls.filter(x=>!isTextInput(x)).map(labelOf));
    const lower=(question+" "+textOf(card)).toLowerCase();
    if(drags.length||DRAG_RX.test(lower))return {type:"ordering",options:opts};
    if(checks.length>=2||/select all that apply|which of these are true|switch the toggles/i.test(lower))return {type:"multi_select",options:opts};
    if(inputs.length)return {type:"text_input",options:[]};
    if(radios.length||opts.length>=2)return {type:"choice",options:opts};
    return null;
  }
  function buildActivity(card,controls){
    if(!card||!controls.length)return null;
    const question=questionFromCard(card,controls)||fallbackQuestion(card,[]);if(!question)return null;
    const kind=classify(controls,question,card);if(!kind)return null;
    if(kind.type!=="text_input"&&kind.options.length<2)return null;
    const visuals=visualMeta(card);
    const instruction=(clean(card.innerText||card.textContent||"").split(/\n+/).map(flat).find(x=>ACTION_RX.test(x)||DRAG_RX.test(x))||"");
    const activity={type:kind.type,question,options:kind.options.slice(0,12),instruction,evidence:20,visuals,cardRect:(()=>{const r=rect(card);return {left:r.left,top:r.top,width:r.width,height:r.height};})()};
    activity.signature=signature(activity);return activity;
  }
  function detectActivity(){
    const controls=allControls();if(!controls.length)return null;
    const groups=controlGroups(controls),candidates=[];
    for(const group of groups){
      const seed=group[0];
      for(const card of candidateAncestors(seed,group)){
        const local=controls.filter(c=>card.contains(c));
        if(local.length!==group.length&&local.length>Math.max(group.length+4,8))continue;
        const activity=buildActivity(card,group);if(!activity)continue;
        const r=rect(card),cr=group.map(rect);
        const centerY=cr.reduce((n,x)=>n+x.top+x.height/2,0)/cr.length;
        let rank=activity.evidence*100000;
        rank+=Math.min(180000,group.length*22000);
        rank+=Math.max(0,160000-Math.abs(centerY-innerHeight*.5)*1600);
        rank-=Math.max(0,r.width*r.height-innerWidth*innerHeight*.65)/8;
        rank-=Math.max(0,r.width-innerWidth*.95)*120;
        if(activity.type==="text_input")rank+=40000;
        if(activity.visuals.hasVisual)rank+=16000;
        if(/\?$/.test(activity.question))rank+=45000;
        candidates.push({activity,rank});
        break;
      }
    }
    candidates.sort((a,b)=>b.rank-a.rank);
    const result=candidates[0]?.activity||null;
    if(result)log("activity_detected",{type:result.type,question:result.question,optionCount:result.options.length,visual:!!result.visuals.hasVisual,groupCount:groups.length});
    return result;
  }
  function signature(a){return [a.type,a.question,...(a.options||[]),a.instruction||"",a.visuals?.hasVisual?"visual":""].join("|").toLowerCase().replace(/\s+/g," ").slice(0,2000);}
  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}
  function preview(a){const bits=[a.question];if(a.options?.length)bits.push("Options: "+a.options.join(" • "));if(a.visuals?.hasVisual)bits.push("Visual: image/graph detected");return clean(bits.join("\n")).slice(0,1000);}
  function mount(activity){
    const sig=activity.signature;if(!activity.question||sig===dismissedSignature)return;if(sig===lastSignature&&document.getElementById(ROOT_ID))return;
    lastSignature=sig;dismissedSignature="";removeRoot();
    const root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V${VERSION}</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label"><span class="sh-type"></span> activity detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>`;
    root.querySelector(".sh-type").textContent=activity.type.replace("_"," ");root.querySelector(".sh-question").textContent=preview(activity);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();log("activity_dismissed",{signature:sig.slice(0,120)});};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",activity,root);root.querySelector(".sh-explain").onclick=()=>analyse("explain",activity,root);root.querySelector(".sh-answer").onclick=()=>analyse("answer",activity,root);
    root.querySelector(".sh-copy").onclick=async()=>{const t=root.querySelector(".sh-response").textContent;try{await navigator.clipboard.writeText(t);root.querySelector(".sh-copy").textContent="Copied!";setTimeout(()=>root.querySelector(".sh-copy").textContent="Copy answer",1200);log("answer_copied");}catch(e){log("copy_failed",{error:e.message});}};
    document.documentElement.appendChild(root);log("panel_mounted",{type:activity.type,question:activity.question,visual:!!activity.visuals.hasVisual});
    if(contextAlive())chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse&&!rapidAnalysed.has(sig)){rapidAnalysed.add(sig);analyse("answer",activity,root);}});
  }
  async function prepareVisuals(visuals){
    const out=[];
    for(const c of visuals.canvases||[])if(c.dataUrl)out.push({type:"data",data:c.dataUrl,source:"canvas"});
    for(const img of visuals.images||[]){
      try{const r=await fetch(img.src,{credentials:"include",cache:"force-cache"});if(r.ok){const b=await r.blob();const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b);});out.push({type:"data",data,source:"img"});continue;}}catch{}
      out.push({type:"url",url:img.src,source:"img-url"});
    }
    return out.slice(0,5);
  }
  async function analyse(mode,activity,root){
    if(!root.isConnected||dead)return;
    const key=mode+"|"+activity.signature,status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy");
    if(cache.has(key)){status.textContent="Cached result";response.textContent=cache.get(key).text;copy.hidden=mode!=="answer";return;}
    if(analysing){status.textContent="Please wait for the current response…";return;}
    analysing=true;status.textContent=mode==="hint"?"Getting hint…":mode==="answer"?"Getting quick answer…":"Explaining…";response.textContent="";copy.hidden=true;
    log("analysis_started",{mode,type:activity.type,question:activity.question,visual:!!activity.visuals.hasVisual});
    try{
      const prepared={...activity,visualInputs:await prepareVisuals(activity.visuals||{})};
      if(activity.visuals?.hasVisual){
        const shot=await sendMessage({type:"study-helper-capture-tab"});
        if(shot?.ok&&shot.dataUrl)prepared.visualInputs=[...prepared.visualInputs,{type:"data",data:shot.dataUrl,source:"tab-capture"}].slice(0,6);
        log("visual_capture",{ok:!!shot?.ok,sourceCount:prepared.visualInputs.length});
      }
      const r=await sendMessage({type:"study-helper-analyse",mode,activity:prepared});
      if(!r?.ok)throw new Error(r?.error||"Analysis failed");
      if(!flat(r.text))throw new Error("AI returned an empty response");
      cache.set(key,r);if(cache.size>80)cache.delete(cache.keys().next().value);
      if(root.isConnected){status.textContent="AI: "+r.provider;response.textContent=r.text;copy.hidden=mode!=="answer";}
      log("analysis_succeeded",{mode,provider:r.provider,chars:String(r.text).length,visual:!!activity.visuals.hasVisual});
    }catch(e){if(root.isConnected)status.textContent="Error: "+e.message;log("analysis_failed",{mode,error:String(e?.message||e)});}finally{analysing=false;}
  }
  function scan(){
    if(dead)return;
    const now=Date.now();if(now-lastScanAt<120)return;lastScanAt=now;
    const activity=detectActivity();if(!activity){pending="";pendingSince=0;return;}
    const sig=activity.signature;
    if(sig!==pending){pending=sig;pendingSince=now;clearTimeout(debounce);debounce=setTimeout(()=>{if(dead)return;const confirmed=detectActivity();if(confirmed&&confirmed.signature===sig)mount(confirmed);},260);return;}
    if(now-pendingSince>=160)mount(activity);
  }
  observer=new MutationObserver(()=>{if(dead)return;clearTimeout(debounce);debounce=setTimeout(scan,130);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{if(dead)return;clearTimeout(debounce);debounce=setTimeout(scan,120)},{passive:true});
  addEventListener("resize",()=>{if(dead)return;clearTimeout(debounce);debounce=setTimeout(scan,120)});
  setTimeout(scan,500);scanTimer=setInterval(scan,700);
  log("content_loaded",{version:VERSION,url:location.href});
})();
