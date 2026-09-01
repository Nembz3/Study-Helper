(()=>{
  const ROOT_ID="study-helper-v3-root";
  let lastSignature="";
  let dismissedSignature="";
  let analysing=false;
  let debounce;
  let lastScanAt=0;

  function clean(s){return (s||"").replace(/\s+/g," ").trim();}
  function visible(el){
    if(el.closest?.("#"+ROOT_ID)) return false;
    const r=el.getBoundingClientRect(), st=getComputedStyle(el);
    return r.width>20&&r.height>10&&st.display!=="none"&&st.visibility!=="hidden"&&st.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
  }

  function candidateText(){
    const phrases=["reveal answer","choose an answer","type your answer","scroll down to continue","check answer","continue"];
    const all=[...document.querySelectorAll("body *")].filter(visible);
    const anchors=all.filter(el=>{
      const t=clean(el.innerText).toLowerCase();
      return t.length>0&&phrases.some(p=>t.includes(p));
    });

    const candidates=[];
    for(const anchor of anchors){
      let el=anchor;
      for(let i=0;i<7&&el;i++,el=el.parentElement){
        if(!visible(el)) continue;
        const text=clean(el.innerText), r=el.getBoundingClientRect();
        if(text.length>=15&&text.length<=1800&&r.height>=80&&r.height<=innerHeight*1.25) candidates.push(el);
      }
    }

    [...new Set(candidates)].sort((a,b)=>{
      const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
      const areaA=ra.width*ra.height, areaB=rb.width*rb.height;
      const distA=Math.abs((ra.top+ra.bottom)/2-innerHeight/2);
      const distB=Math.abs((rb.top+rb.bottom)/2-innerHeight/2);
      return (areaA/10000+distA)-(areaB/10000+distB);
    });

    for(const el of [...new Set(candidates)]){
      const text=clean(el.innerText);
      if(text.length>20) return text.slice(0,1800);
    }

    const fallback=all.filter(el=>{
      const t=clean(el.innerText), r=el.getBoundingClientRect();
      return t.length>20&&t.length<700&&r.width>150&&r.height>30;
    }).sort((a,b)=>{
      const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
      return Math.abs((ra.top+ra.bottom)/2-innerHeight/2)-Math.abs((rb.top+rb.bottom)/2-innerHeight/2);
    })[0];

    return fallback?clean(fallback.innerText).slice(0,1800):"";
  }

  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}
  function signature(question){return question.slice(0,900);}
  function mount(question){
    if(!question||question.length<8) return;
    const sig=signature(question);
    if(sig===dismissedSignature) return;
    if(sig===lastSignature&&document.getElementById(ROOT_ID)) return;

    lastSignature=sig;
    dismissedSignature="";
    removeRoot();

    const root=document.createElement("div");
    root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V3.1</strong><button class="sh-close" title="Hide this question">×</button></div><div class="sh-label">Current question detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Analyse answer</button></div><div class="sh-status"></div><div class="sh-response"></div></div>`;
    root.querySelector(".sh-question").textContent=question.slice(0,500);
    root.querySelector(".sh-close").onclick=()=>{dismissedSignature=sig;root.remove();};
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",question,root);
    root.querySelector(".sh-explain").onclick=()=>analyse("explain",question,root);
    root.querySelector(".sh-answer").onclick=()=>analyse("answer",question,root);
    document.documentElement.appendChild(root);

    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{if(d.rapidAutoAnalyse) analyse("answer",question,root);});
  }

  async function analyse(mode,question,root){
    if(analysing||!root.isConnected) return;
    analysing=true;
    const status=root.querySelector(".sh-status"), response=root.querySelector(".sh-response");
    status.textContent="Analysing with AI…";
    response.textContent="";
    try{
      const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,question});
      if(!r?.ok) throw new Error(r?.error||"Analysis failed");
      if(root.isConnected){status.textContent="AI: "+r.provider;response.textContent=r.text;}
    }catch(e){if(root.isConnected) status.textContent="Error: "+e.message;}
    finally{analysing=false;}
  }

  function scan(){
    const now=Date.now();
    if(now-lastScanAt<150) return;
    lastScanAt=now;
    const q=candidateText();
    if(q) mount(q);
  }

  const observer=new MutationObserver(()=>{
    clearTimeout(debounce);
    debounce=setTimeout(scan,500);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(debounce);debounce=setTimeout(scan,350)},{passive:true});
  setTimeout(scan,1000);
  setInterval(scan,2500);
})();