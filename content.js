(()=>{
  const ROOT_ID="study-helper-v3-root";
  let lastSignature="",dismissedSignature="",analysing=false,debounce,lastScanAt=0;
  const cache=new Map();

  function clean(s){return(s||"").replace(/\s+/g," ").trim();}
  function visible(el){if(el.closest?.("#"+ROOT_ID))return false;const r=el.getBoundingClientRect(),st=getComputedStyle(el);return r.width>20&&r.height>10&&st.display!=="none"&&st.visibility!=="hidden"&&st.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  function candidateText(){
    const phrases=["reveal answer","choose an answer","type your answer","scroll down to continue","check answer","continue"];
    const all=[...document.querySelectorAll("body *")].filter(visible);
    const anchors=all.filter(el=>{const t=clean(el.innerText).toLowerCase();return t&&phrases.some(p=>t.includes(p));});
    const candidates=[];
    for(const anchor of anchors){let el=anchor;for(let i=0;i<7&&el;i++,el=el.parentElement){if(!visible(el))continue;const text=clean(el.innerText),r=el.getBoundingClientRect();if(text.length>=15&&text.length<=1200&&r.height>=80&&r.height<=innerHeight*1.25)candidates.push(el);}}
    const unique=[...new Set(candidates)].sort((a,b)=>{const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return ra.width*ra.height+Math.abs((ra.top+ra.bottom)/2-innerHeight/2)*100-ra.width*ra.height-(rb.width*rb.height+Math.abs((rb.top+rb.bottom)/2-innerHeight/2)*100)+rb.width*rb.height;});
    for(const el of unique){const text=clean(el.innerText);if(text.length>20)return text.slice(0,1200);}
    return "";
  }
  function signature(q){return q.slice(0,900);}
  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}
  function mount(question){
    if(!question||question.length<8)return;
    const sig=signature(question);if(sig===dismissedSignature)return;if(sig===lastSignature&&document.getElementById(ROOT_ID))return;
    lastSignature=sig;dismissedSignature="";removeRoot();
    const root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V3.2</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label">Current question detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>`;
    root.querySelector(".sh-question").textContent=question.slice(0,500);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",question,root);
    root.querySelector(".sh-explain").onclick=()=>analyse("explain",question,root);
    root.querySelector(".sh-answer").onclick=()=>analyse("answer",question,root);
    root.querySelector(".sh-copy").onclick=async()=>{const t=root.querySelector(".sh-response").textContent;try{await navigator.clipboard.writeText(t);root.querySelector(".sh-copy").textContent="Copied!";setTimeout(()=>root.querySelector(".sh-copy").textContent="Copy answer",1200);}catch(e){}};
    document.documentElement.appendChild(root);
    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse)analyse("answer",question,root);});
  }
  async function analyse(mode,question,root){
    if(analysing||!root.isConnected)return;analysing=true;
    const sig=signature(question),status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy"),key=mode+"|"+sig;
    if(cache.has(key)){status.textContent="Cached result";response.textContent=cache.get(key).text;copy.hidden=mode!=="answer";analysing=false;return;}
    status.textContent="Analysing…";response.textContent="";copy.hidden=true;
    try{const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,question});if(!r?.ok)throw new Error(r?.error||"Analysis failed");cache.set(key,r);if(cache.size>30)cache.delete(cache.keys().next().value);if(root.isConnected){status.textContent="AI: "+r.provider;response.textContent=r.text;copy.hidden=mode!=="answer";}}catch(e){if(root.isConnected)status.textContent="Error: "+e.message;}finally{analysing=false;}
  }
  function scan(){const now=Date.now();if(now-lastScanAt<250)return;lastScanAt=now;const q=candidateText();if(q)mount(q);}
  const observer=new MutationObserver(()=>{clearTimeout(debounce);debounce=setTimeout(scan,500);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(debounce);debounce=setTimeout(scan,350)},{passive:true});
  setTimeout(scan,1000);setInterval(scan,2500);
})();