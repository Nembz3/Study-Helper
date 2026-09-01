(()=>{
  const ROOT_ID="study-helper-v3-root";
  const IGNORE=[/tasks completed/i,/\bup next\b/i,/\bsection complete\b/i,/your memory has been stored/i,/memory strength/i,/time spent/i,/current level/i,/\btotal xp\b/i,/choose where to store your memory/i,/summer revision/i];
  const NAV=new Set(["continue","next","back","close","skip","exit","home"]);
  const ACTION_RX=/\b(reveal answer|choose an answer|select an answer|type your answer|check answer|submit|switch the toggles|drag into the correct order|select all that apply|match|fill in)\b/i;
  const TASK_RX=/\b(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange|true|false)\b/i;
  const DRAG_RX=/\b(drag|drop|correct order|arrange|reorder|sort|move)\b/i;
  let lastSignature="",dismissedSignature="",analysing=false,debounce,lastScanAt=0,pending="",pendingSince=0;
  const cache=new Map(),rapidAnalysed=new Set();

  const clean=s=>(s||"").replace(/\s+/g," ").trim();
  function visible(el){
    if(!el||el.closest?.("#"+ROOT_ID))return false;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return r.width>20&&r.height>10&&s.display!=="none"&&s.visibility!=="hidden"&&s.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
  }
  const textOf=el=>clean(el?.innerText||el?.textContent||"");
  const labelOf=el=>clean(el?.innerText||el?.value||el?.getAttribute?.("aria-label")||el?.getAttribute?.("title")||"");
  const ignored=t=>IGNORE.some(rx=>rx.test(t));

  function controlsIn(root){
    return [...root.querySelectorAll('input:not([type="hidden"]),textarea,[contenteditable="true"],[role="radio"],[role="checkbox"],[role="switch"],button,[role="button"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')].filter(visible);
  }
  function usefulControls(root){
    return controlsIn(root).filter(el=>{
      const t=labelOf(el).toLowerCase();
      return !NAV.has(t)&&t.length>0&&t.length<220;
    });
  }
  function uniqueOptions(items){
    const out=[],seen=new Set();
    for(const item of items){
      const t=clean(item).replace(/^(?:[A-Z]|\d+)[.)]\s*/,"");
      const k=t.toLowerCase();
      if(t.length>1&&t.length<260&&!seen.has(k)){seen.add(k);out.push(t);}
    }
    return out.slice(0,12);
  }
  function classify(root,text){
    const c=usefulControls(root), lower=text.toLowerCase();
    const typed=c.some(x=>x.matches('input:not([type="hidden"]),textarea,[contenteditable="true"]'));
    const draggables=c.filter(x=>x.matches('[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')).length;
    const selects=c.filter(x=>x.matches('select')).length;
    const toggleLike=c.filter(x=>x.matches('[role="checkbox"],[role="switch"],[aria-pressed="true"],[aria-pressed="false"]')).length;
    const buttons=c.filter(x=>x.matches('button,[role="button"],[role="radio"]'));
    const labels=uniqueOptions(buttons.map(labelOf));
    const numbered=(text.match(/(?:^|\s)[1-9][0-9]?\s+(?=[A-Za-z])/g)||[]).length;
    let type="unknown",score=0;
    if(DRAG_RX.test(text)&&(draggables>=2||numbered>=3||/correct order|reorder|arrange/i.test(text))){type="ordering";score+=7;}
    else if(toggleLike>=3||/switch the toggles|select all that apply|which of these are true/i.test(text)){type="multi_select";score+=6;}
    else if(typed){type="text_input";score+=5;}
    else if(selects){type="dropdown";score+=5;}
    else if(labels.length>=2){type="choice";score+=5;}
    else if(/match/i.test(text)&&c.length>=3){type="matching";score+=5;}
    if(/\?/.test(text))score+=2;
    if(ACTION_RX.test(text))score+=3;
    if(TASK_RX.test(text))score+=1;
    if(ignored(text))score-=10;
    return {type,score,labels,draggables,toggleLike,typed,selects,numbered};
  }
  function findQuestionLine(lines,options){
    const optionSet=new Set(options.map(x=>x.toLowerCase()));
    const candidates=lines.filter(x=>{
      const l=x.toLowerCase();
      return x.length>=8&&x.length<=320&&!optionSet.has(l)&&!NAV.has(l)&&!ACTION_RX.test(x);
    });
    return candidates.find(x=>/\?$/.test(x))||
      candidates.find(x=>/^(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange)\b/i.test(x))||
      candidates.find(x=>x.length>15&&x.length<180)||
      "";
  }
  function extractActivity(root){
    const raw=textOf(root);
    if(raw.length<8||raw.length>2200||ignored(raw))return null;
    const cls=classify(root,raw);
    if(cls.score<5)return null;
    const lines=(root.innerText||root.textContent||"").split(/\n+/).map(clean).filter(Boolean);
    const options=cls.labels.length?cls.labels:uniqueOptions(
      lines.filter(x=>x.length>2&&x.length<260&&!/^(submit|check|reveal answer|continue)$/i.test(x))
    );
    const question=findQuestionLine(lines,options);
    const instruction=lines.find(x=>ACTION_RX.test(x)||DRAG_RX.test(x))||"";
    if(!question&&cls.type==="unknown")return null;
    const compact={
      type:cls.type,
      question:question||lines[0]||"",
      options:options.slice(0,10),
      instruction,
      evidence:cls.score
    };
    const combined=[compact.question,...compact.options,compact.instruction].join(" ");
    if(combined.length<12)return null;
    compact.signature=signature(compact);
    return compact;
  }
  function scoreRoot(root){
    const activity=extractActivity(root);
    if(!activity)return null;
    const r=root.getBoundingClientRect();
    const center=Math.abs((r.top+r.bottom)/2-innerHeight/2);
    const area=r.width*r.height;
    return {root,activity,rank:activity.evidence*1000000-area/50-center};
  }
  function detectActivity(){
    const seeds=[];
    for(const el of [...document.querySelectorAll('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input:not([type="hidden"]),textarea,[contenteditable="true"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')]){
      if(!visible(el))continue;
      const label=labelOf(el),parentText=textOf(el.parentElement);
      if(!label&&!parentText)continue;
      seeds.push(el);
    }
    const seen=new Set(),candidates=[];
    for(const seed of seeds){
      let el=seed.parentElement;
      for(let depth=0;el&&depth<9;depth++,el=el.parentElement){
        if(seen.has(el)||!visible(el))continue;
        seen.add(el);
        const t=textOf(el);
        if(t.length>2200)break;
        const scored=scoreRoot(el);
        if(scored)candidates.push(scored);
      }
    }
    candidates.sort((a,b)=>b.rank-a.rank||a.root.getBoundingClientRect().width-b.root.getBoundingClientRect().width);
    return candidates[0]?.activity||null;
  }
  function signature(a){
    return [a.type,a.question,...(a.options||[])].join("|").toLowerCase().replace(/\s+/g," ").slice(0,1400);
  }
  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}
  function preview(activity){
    const bits=[activity.question];
    if(activity.options?.length)bits.push("Options: "+activity.options.join(" • "));
    return clean(bits.join("\n")).slice(0,700);
  }
  function mount(activity){
    const sig=activity.signature;
    if(!activity.question||sig===dismissedSignature)return;
    if(sig===lastSignature&&document.getElementById(ROOT_ID))return;
    lastSignature=sig;dismissedSignature="";removeRoot();
    const root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V3.5</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label"><span class="sh-type"></span> activity detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>`;
    root.querySelector(".sh-type").textContent=activity.type.replace("_"," ");
    root.querySelector(".sh-question").textContent=preview(activity);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",activity,root);
    root.querySelector(".sh-explain").onclick=()=>analyse("explain",activity,root);
    root.querySelector(".sh-answer").onclick=()=>analyse("answer",activity,root);
    root.querySelector(".sh-copy").onclick=async()=>{const t=root.querySelector(".sh-response").textContent;try{await navigator.clipboard.writeText(t);root.querySelector(".sh-copy").textContent="Copied!";setTimeout(()=>root.querySelector(".sh-copy").textContent="Copy answer",1200);}catch(_){}};
    document.documentElement.appendChild(root);
    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse&&!rapidAnalysed.has(sig)){rapidAnalysed.add(sig);analyse("answer",activity,root);}});
  }
  async function analyse(mode,activity,root){
    if(analysing||!root.isConnected)return;analysing=true;
    const key=mode+"|"+activity.signature,status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy");
    if(cache.has(key)){status.textContent="Cached result";response.textContent=cache.get(key).text;copy.hidden=mode!=="answer";analysing=false;return;}
    status.textContent="Analysing compact question…";response.textContent="";copy.hidden=true;
    try{
      const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,activity});
      if(!r?.ok)throw new Error(r?.error||"Analysis failed");
      cache.set(key,r);if(cache.size>60)cache.delete(cache.keys().next().value);
      if(root.isConnected){status.textContent="AI: "+r.provider;response.textContent=r.text;copy.hidden=mode!=="answer";}
    }catch(e){if(root.isConnected)status.textContent="Error: "+e.message;}
    finally{analysing=false;}
  }
  function scan(){
    const now=Date.now();if(now-lastScanAt<700)return;lastScanAt=now;
    const activity=detectActivity();
    if(!activity){pending="";pendingSince=0;return;}
    const sig=activity.signature;
    if(sig!==pending){pending=sig;pendingSince=now;return;}
    if(now-pendingSince>=650)mount(activity);
  }
  const observer=new MutationObserver(()=>{clearTimeout(debounce);debounce=setTimeout(scan,800);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(debounce);debounce=setTimeout(scan,650)},{passive:true});
  setTimeout(scan,1400);setInterval(scan,3500);
})();