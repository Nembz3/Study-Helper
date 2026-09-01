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
  const labelOf=el=>clean(el?.innerText||el?.value||el?.getAttribute?.("aria-label")||el?.getAttribute?.("placeholder")||el?.getAttribute?.("name")||el?.getAttribute?.("title")||"");
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
      return x.length>=4&&x.length<=420&&!optionSet.has(l)&&!NAV.has(l)&&!ACTION_RX.test(x)&&!ignored(x);
    });
    let index=candidates.findIndex(x=>/\?$/.test(x));
    if(index<0)index=candidates.findIndex(x=>/^(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange)\b/i.test(x));
    if(index<0)index=candidates.findIndex(x=>x.length>15&&x.length<240);
    if(index<0)return "";

    const parts=[];
    for(let i=Math.max(0,index-2);i<=Math.min(candidates.length-1,index+2);i++){
      const t=candidates[i];
      if(!t||ACTION_RX.test(t))continue;
      parts.push(t);
    }
    return clean(parts.join(" ")).slice(0,700);
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
  // Build activities from tight clusters of answer controls, rather than scoring
  // large page ancestors. Seneca often keeps completed and current cards in one DOM tree.
  const INPUT_SELECTOR='input:not([type="hidden"]),textarea,[contenteditable="true"]';
  const isTextInput=el=>el?.matches?.(INPUT_SELECTOR);

  function answerControl(el){
    if(!visible(el)||el.closest?.("#"+ROOT_ID))return false;
    if(isTextInput(el))return true;
    const t=clean(labelOf(el)),l=t.toLowerCase();
    if(t.length<1||t.length>260)return false;
    if(NAV.has(l)||/^(submit|check answer|continue|reveal answer|scroll down to continue|switch the toggles|assignment|quiz|wrong answers)$/i.test(t))return false;
    if(/^(report a problem|start reading text|stop reading text|topic notes|collapse toolbar|expand toolbar|flag|close)$/i.test(t))return false;
    return el.matches('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]');
  }

  function clusterControls(controls){
    if(!controls.length)return [];
    const sorted=[...controls].sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
    const clusters=[];let current=[sorted[0]];
    for(let i=1;i<sorted.length;i++){
      const prev=sorted[i-1].getBoundingClientRect(),now=sorted[i].getBoundingClientRect();
      if(now.top-prev.bottom>95){clusters.push(current);current=[sorted[i]];}
      else current.push(sorted[i]);
    }
    if(current.length)clusters.push(current);
    return clusters;
  }

  function scoreControlCluster(cluster){
    const singleText=cluster.length===1&&isTextInput(cluster[0]);
    if(cluster.length<2&&!singleText)return -Infinity;
    const rects=cluster.map(x=>x.getBoundingClientRect());
    const top=Math.min(...rects.map(r=>r.top)),bottom=Math.max(...rects.map(r=>r.bottom));
    const widths=rects.map(r=>r.width),avg=widths.reduce((a,b)=>a+b,0)/widths.length;
    const variance=widths.reduce((a,w)=>a+Math.abs(w-avg),0)/widths.length;
    let score=cluster.length*100+Math.max(0,120-variance);
    if(singleText)score+=180;
    if(top>-50&&bottom<innerHeight+50)score+=80;
    score-=Math.abs((top+bottom)/2-innerHeight*.52)/5;
    return score;
  }

  function getBestControlCluster(controls){
    let best=null,bestScore=-Infinity;
    for(const cluster of clusterControls(controls)){
      const score=scoreControlCluster(cluster);
      if(score>bestScore){bestScore=score;best=cluster;}
    }
    return best;
  }

  function getTextCandidates(group,firstOptionTop){
    const gr=group.getBoundingClientRect(),out=[],seen=new Set();
    for(const el of group.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div,label,article,section")){
      if(!visible(el)||el.closest?.("#"+ROOT_ID))continue;
      const r=el.getBoundingClientRect();
      if(r.top>firstOptionTop+15||r.bottom<Math.max(gr.top,firstOptionTop-750)||r.width<40||r.height<8)continue;
      if(el.querySelector('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input,select'))continue;
      const raw=clean(el.innerText||el.textContent||"");
      if(!raw||raw.length<6||raw.length>500)continue;
      const key=raw.toLowerCase();
      if(seen.has(key)||ignored(raw)||ACTION_RX.test(raw))continue;
      if(/^(assignment|quiz|wrong answers|how do you want to learn|scroll down to continue|report a problem|start reading text|topic notes|collapse toolbar)$/i.test(raw))continue;
      seen.add(key);
      let score=0;
      if(/\?$/.test(raw))score+=30;
      if(TASK_RX.test(raw))score+=15;
      if(/\b(true|false|correct|incorrect|following|statement|speed|calculate|distance|time|graph|best|most|least)\b/i.test(raw))score+=5;
      score+=Math.max(0,20-Math.max(0,firstOptionTop-r.bottom)/30);
      if(raw.length>15&&raw.length<250)score+=8;
      out.push({text:raw,score,top:r.top,bottom:r.bottom});
    }
    return out;
  }

  function questionNear(group,controls){
    if(!controls?.length)return "";
    const firstTop=Math.min(...controls.map(c=>c.getBoundingClientRect().top));
    const candidates=getTextCandidates(group,firstTop);
    if(!candidates.length)return "";
    candidates.sort((a,b)=>b.score-a.score||b.bottom-a.bottom||b.text.length-a.text.length);
    const best=candidates[0];
    const nearby=candidates.filter(x=>x.score>=best.score-8&&x.bottom<=firstTop+10&&x.top>=best.top-120&&x.top<=best.bottom+120).sort((a,b)=>a.top-b.top);
    if(nearby.length>1){
      const combined=clean([...new Set(nearby.map(x=>x.text))].join(" "));
      if(combined.length>=best.text.length&&combined.length<=400)return combined;
    }
    return best.text;
  }

  function focusedActivity(group,controls){
    const raw=textOf(group);
    if(raw.length<6||raw.length>3000||ignored(raw))return null;
    const answerCluster=getBestControlCluster(controls);
    if(!answerCluster?.length)return null;

    const typedCluster=answerCluster.length===1&&isTextInput(answerCluster[0]);
    const options=typedCluster
      ?[]
      :uniqueOptions(answerCluster.map(labelOf).filter(x=>!(/^(report a problem|start reading text|stop reading text|topic notes|collapse toolbar|expand toolbar)$/i.test(x)||NAV.has(x.toLowerCase()))));

    if(!typedCluster&&options.length<2)return null;

    const lines=(group.innerText||group.textContent||"").split(/\n+/).map(clean).filter(Boolean);
    const question=questionNear(group,answerCluster)||findQuestionLine(lines,options);
    if(!question)return null;

    const cls=classify(group,raw);
    let type=cls.type;
    const toggleCount=answerCluster.filter(x=>x.matches('[role="checkbox"],[role="switch"],[aria-pressed="true"],[aria-pressed="false"]')).length;
    if(typedCluster)type="text_input";
    else if(toggleCount>=2||/select all that apply|which of these are true|switch the toggles/i.test(raw))type="multi_select";
    else if(DRAG_RX.test(raw)||answerCluster.some(x=>x.matches('[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')))type="ordering";
    else if(answerCluster.some(isTextInput))type="text_input";
    else type="choice";

    const instruction=lines.find(x=>ACTION_RX.test(x)||DRAG_RX.test(x))||"";
    const activity={type,question:clean(question),options:options.slice(0,10),instruction,evidence:typedCluster?16:15};
    activity.signature=signature(activity);
    return activity;
  }

  function detectActivity(){
    const controls=[...document.querySelectorAll('button,[role="button"],[role="radio"],[role="checkbox"],[role="switch"],input:not([type="hidden"]),textarea,[contenteditable="true"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable]')].filter(answerControl);
    if(!controls.length)return null;

    const candidates=[],seen=new Set();
    for(const seed of controls){
      let el=seed.parentElement;
      for(let depth=0;el&&depth<10;depth++,el=el.parentElement){
        if(seen.has(el)||!visible(el))continue;
        seen.add(el);

        const r=el.getBoundingClientRect();
        if(r.width<140||r.height<45||r.width*r.height>innerWidth*innerHeight*2.2)continue;

        const local=controls.filter(c=>el.contains(c));
        if(!local.length)continue;

        const typedLocal=local.filter(isTextInput);
        const hasChoiceLike=local.length>=2;
        if(!hasChoiceLike&&!typedLocal.length)continue;

        // For text-entry questions, evaluate each input as its own answer cluster.
        const possibleClusters=[];
        const normal=getBestControlCluster(local);
        if(normal)possibleClusters.push(normal);
        for(const input of typedLocal)possibleClusters.push([input]);

        for(const cluster of possibleClusters){
          const uniqueKey=cluster.map(x=>controls.indexOf(x)).join(",");
          if(!uniqueKey)continue;
          const activity=focusedActivity(el,cluster);
          if(!activity)continue;

          const optionTop=Math.min(...cluster.map(c=>c.getBoundingClientRect().top));
          const area=r.width*r.height;
          let rank=activity.evidence*100000-area/12-Math.abs(optionTop-innerHeight*.48)*5+cluster.length*20000;
          if(activity.type==="text_input")rank+=35000;
          if(r.top>-120&&r.bottom<innerHeight+120)rank+=200000;
          candidates.push({activity,rank,area,top:r.top});
        }
      }
    }

    candidates.sort((a,b)=>b.rank-a.rank||a.area-b.area||b.top-a.top);
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
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V3.6.0</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label"><span class="sh-type"></span> activity detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>`;
    root.querySelector(".sh-type").textContent=activity.type.replace("_"," ");
    root.querySelector(".sh-question").textContent=preview(activity);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",activity,root);
    root.querySelector(".sh-explain").onclick=()=>analyse("explain",activity,root);
    root.querySelector(".sh-answer").onclick=()=>analyse("answer",activity,root);
    root.querySelector(".sh-copy").onclick=async()=>{const t=root.querySelector(".sh-response").textContent;try{await navigator.clipboard.writeText(t);root.querySelector(".sh-copy").textContent="Copied!";setTimeout(()=>root.querySelector(".sh-copy").textContent="Copy answer",1200);}catch(e){}};
    document.documentElement.appendChild(root);
    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse&&!rapidAnalysed.has(sig)){rapidAnalysed.add(sig);analyse("answer",activity,root);}});
  }
  async function analyse(mode,activity,root){
    if(!root.isConnected)return;
    const key=mode+"|"+activity.signature,status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy");
    if(cache.has(key)){
      status.textContent="Cached result";
      response.textContent=cache.get(key).text;
      copy.hidden=mode!=="answer";
      return;
    }

    if(analysing){
      status.textContent="Please wait for the current response…";
      return;
    }

    analysing=true;
    status.textContent=mode==="hint"?"Getting hint…":mode==="answer"?"Getting quick answer…":"Explaining…";
    response.textContent="";
    copy.hidden=true;

    try{
      const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,activity});
      if(!r?.ok)throw new Error(r?.error||"Analysis failed");
      if(!String(r.text||"").trim())throw new Error("AI returned an empty response");
      cache.set(key,r);
      if(cache.size>60)cache.delete(cache.keys().next().value);
      if(root.isConnected){
        status.textContent="AI: "+r.provider;
        response.textContent=r.text;
        copy.hidden=mode!=="answer";
      }
    }catch(e){
      if(root.isConnected)status.textContent="Error: "+e.message;
    }finally{
      analysing=false;
    }
  }
  function scan(){
    const now=Date.now();
    if(now-lastScanAt<180)return;
    lastScanAt=now;
    const activity=detectActivity();

    if(!activity){
      pending="";
      pendingSince=0;
      return;
    }

    const sig=activity.signature;
    if(sig!==pending){
      pending=sig;
      pendingSince=now;
      setTimeout(()=>{
        const confirmed=detectActivity();
        if(confirmed&&confirmed.question&&(confirmed.type==="text_input"||confirmed.options?.length>=2))mount(confirmed);
      },180);
      return;
    }

    if(now-pendingSince>=180)mount(activity);
  }
  const observer=new MutationObserver(()=>{clearTimeout(debounce);debounce=setTimeout(scan,180);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(debounce);debounce=setTimeout(scan,180)},{passive:true});
  setTimeout(scan,500);setInterval(scan,900);
})();