(()=>{
  const ROOT_ID="study-helper-v3-root";
  const IGNORE=[/tasks completed/i,/\bup next\b/i,/\bsection complete\b/i,/\byour memory has been stored\b/i,/\bmemory strength\b/i,/\btime spent\b/i,/\bcurrent level\b/i,/^score$/im,/^total$/im,/\bxp\b/i,/choose where to store your memory/i];
  const ANCHORS=["reveal answer","choose an answer","type your answer","check answer","select an answer","drag","match","submit"];
  const NAV=new Set(["continue","next","back","close","skip","exit"]);
  const TASK_WORDS=/\b(what|which|where|when|why|how|who|name|complete|match|choose|select|fill|type|drag|connect|identify|state|calculate|write|put|sort|order|arrange)\b/i;
  const DRAG_WORDS=/\b(drag|drop|correct order|arrange|reorder|move the|sort)\b/i;
  let lastSignature="",dismissedSignature="",analysing=false,debounce,lastScanAt=0,pendingSignature="",pendingSince=0;
  const cache=new Map(),rapidAnalysed=new Set();

  function clean(s){return(s||"").replace(/\s+/g," ").trim();}
  function visible(el){if(!el||el.closest?.("#"+ROOT_ID))return false;const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>20&&r.height>10&&st.display!=="none"&&st.visibility!=="hidden"&&st.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  function ignored(text){return IGNORE.some(rx=>rx.test(text));}

  function interactiveStats(el){
    const controls=[...el.querySelectorAll('input:not([type="hidden"]),textarea,[contenteditable="true"],[role="radio"],[role="checkbox"],button,[role="button"]')].filter(visible);
    const meaningful=controls.filter(n=>{const label=clean(n.innerText||n.value||n.getAttribute("aria-label")||"").toLowerCase();return label.length>0&&label.length<120&&!NAV.has(label);});
    const typed=controls.some(n=>n.matches('input:not([type="hidden"]),textarea,[contenteditable="true"]'));
    const choiceCount=meaningful.filter(n=>{const label=clean(n.innerText||n.value||n.getAttribute("aria-label")||"").toLowerCase();return label&&!ANCHORS.some(w=>label.includes(w));}).length;
    const submit=meaningful.some(n=>/^(submit|check|done|finish)$/i.test(clean(n.innerText||n.value||n.getAttribute("aria-label")||"")));
    return{typed,choiceCount,submit,controlCount:controls.length};
  }

  function dragStats(el,text){
    const draggables=[...el.querySelectorAll('[draggable="true"],[role="listitem"],[aria-grabbed="true"],[data-draggable], [data-sortable]')].filter(visible);
    const lines=clean(text).split(/(?=[0-9]+\s)|\n/).filter(Boolean);
    const numbered=(clean(text).match(/(?:^|\s)[1-9][0-9]?\s+/g)||[]).length;
    const rowLike=[...el.children].filter(c=>visible(c)&&clean(c.innerText).length>12&&clean(c.innerText).length<260).length;
    return{draggableCount:draggables.length,numbered,rowLike,dragInstruction:DRAG_WORDS.test(text)};
  }

  function instructionLike(text){return /\?/.test(text)||TASK_WORDS.test(text);}
  function scoreCandidate(el){
    const text=clean(el.innerText);if(text.length<12||text.length>1600||ignored(text))return null;
    const stats=interactiveStats(el),drag=dragStats(el,text),lower=text.toLowerCase(),hasAnchor=ANCHORS.some(w=>lower.includes(w)),instruction=instructionLike(text);
    let score=0;
    if(instruction)score+=2;
    if(/\?/.test(text))score+=2;
    if(stats.typed)score+=3;
    if(stats.choiceCount>=2)score+=2;
    if(hasAnchor)score+=2;
    if(drag.dragInstruction)score+=3;
    if(drag.draggableCount>=2)score+=3;
    if(drag.numbered>=3)score+=2;
    if(drag.rowLike>=3&&drag.dragInstruction)score+=2;
    if(stats.submit&&instruction)score+=2;
    const dragActivity=drag.dragInstruction&&(drag.draggableCount>=2||drag.numbered>=3||drag.rowLike>=3||stats.submit);
    const answerActivity=stats.typed||stats.choiceCount>=2||hasAnchor||dragActivity;
    if(!answerActivity||score<4)return null;
    const r=el.getBoundingClientRect();
    return{text:text.slice(0,1400),score,centerDistance:Math.abs((r.top+r.bottom)/2-innerHeight/2),area:r.width*r.height};
  }

  function candidateText(){
    const all=[...document.querySelectorAll("body *")].filter(visible),candidates=new Map();
    for(const start of all){
      const text=clean(start.innerText);if(!text||text.length>1600)continue;
      const lower=text.toLowerCase();
      const likelyAnchor=ANCHORS.some(w=>lower.includes(w))||TASK_WORDS.test(text)||DRAG_WORDS.test(text)||start.matches('input:not([type="hidden"]),textarea,[contenteditable="true"],[role="radio"],[role="checkbox"],[draggable="true"],[role="listitem"],[aria-grabbed="true"],[data-draggable],[data-sortable]');
      if(!likelyAnchor)continue;
      let el=start;
      for(let i=0;i<10&&el;i++,el=el.parentElement){
        if(!visible(el))continue;
        const scored=scoreCandidate(el);
        if(scored){const prev=candidates.get(el);if(!prev||scored.score>prev.score)candidates.set(el,scored);}
      }
    }
    const ranked=[...candidates.values()].sort((a,b)=>b.score-a.score||a.centerDistance-b.centerDistance||a.area-b.area);
    return ranked[0]?.text||"";
  }

  function signature(q){return q.toLowerCase().replace(/\s+/g," ").trim().slice(0,1000);}
  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}

  function mount(question){
    if(!question||question.length<8)return;
    const sig=signature(question);if(sig===dismissedSignature)return;if(sig===lastSignature&&document.getElementById(ROOT_ID))return;
    lastSignature=sig;dismissedSignature="";removeRoot();
    const root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V3.4</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label">High-confidence question detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>`;
    root.querySelector(".sh-question").textContent=question.slice(0,500);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",question,root);
    root.querySelector(".sh-explain").onclick=()=>analyse("explain",question,root);
    root.querySelector(".sh-answer").onclick=()=>analyse("answer",question,root);
    root.querySelector(".sh-copy").onclick=async()=>{const t=root.querySelector(".sh-response").textContent;try{await navigator.clipboard.writeText(t);root.querySelector(".sh-copy").textContent="Copied!";setTimeout(()=>root.querySelector(".sh-copy").textContent="Copy answer",1200);}catch(_){}};
    document.documentElement.appendChild(root);
    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse&&!rapidAnalysed.has(sig)){rapidAnalysed.add(sig);analyse("answer",question,root);}});
  }

  async function analyse(mode,question,root){
    if(analysing||!root.isConnected)return;analysing=true;
    const sig=signature(question),status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy"),key=mode+"|"+sig;
    if(cache.has(key)){status.textContent="Cached result";response.textContent=cache.get(key).text;copy.hidden=mode!=="answer";analysing=false;return;}
    status.textContent="Analysing…";response.textContent="";copy.hidden=true;
    try{const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,question});if(!r?.ok)throw new Error(r?.error||"Analysis failed");cache.set(key,r);if(cache.size>40)cache.delete(cache.keys().next().value);if(root.isConnected){status.textContent="AI: "+r.provider;response.textContent=r.text;copy.hidden=mode!=="answer";}}catch(e){if(root.isConnected)status.textContent="Error: "+e.message;}finally{analysing=false;}
  }

  function scan(){
    const now=Date.now();if(now-lastScanAt<500)return;lastScanAt=now;
    const q=candidateText();if(!q){pendingSignature="";pendingSince=0;return;}
    const sig=signature(q);if(sig!==pendingSignature){pendingSignature=sig;pendingSince=now;return;}
    if(now-pendingSince>=500)mount(q);
  }

  const observer=new MutationObserver(()=>{clearTimeout(debounce);debounce=setTimeout(scan,700);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(debounce);debounce=setTimeout(scan,500)},{passive:true});
  setTimeout(scan,1200);setInterval(scan,3000);
})();