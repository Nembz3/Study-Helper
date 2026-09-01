(()=>{
  const ROOT_ID="study-helper-v3-root";
  let lastSignature="";
  let analysing=false;
  let debounce;

  function clean(s){return (s||"").replace(/\s+/g," ").trim();}
  function visible(el){
    const r=el.getBoundingClientRect();
    const st=getComputedStyle(el);
    return r.width>20&&r.height>10&&st.display!=="none"&&st.visibility!=="hidden";
  }
  function candidateText(){
    const selectors=["button","input","textarea","[role=button]"];
    const controls=new Set([...document.querySelectorAll(selectors.join(","))].filter(visible));
    const textNodes=[...document.querySelectorAll("body *")].filter(el=>{
      if(!visible(el)||controls.has(el)) return false;
      const t=clean(el.innerText);
      return t.length>5&&t.length<800;
    });
    const phrases=["reveal answer","choose an answer","type your answer","scroll down to continue"];
    let anchors=[...document.querySelectorAll("*")].filter(el=>visible(el)&&phrases.some(p=>clean(el.innerText).toLowerCase().includes(p)));
    let scope=null;
    for(const a of anchors){
      let e=a;
      for(let i=0;i<6&&e;i++,e=e.parentElement){
        if(clean(e.innerText).length>20&&clean(e.innerText).length<1600){scope=e;break;}
      }
      if(scope) break;
    }
    if(!scope){
      scope=textNodes.sort((a,b)=>b.getBoundingClientRect().width*a.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0];
      if(scope) for(let i=0;i<3&&scope.parentElement;i++) scope=scope.parentElement;
    }
    if(!scope) return "";
    const raw=clean(scope.innerText);
    return raw.length>1800?raw.slice(0,1800):raw;
  }

  function removeRoot(){document.getElementById(ROOT_ID)?.remove();}
  function mount(question){
    if(!question||question.length<8) return;
    const sig=question.slice(0,700);
    if(sig===lastSignature&&document.getElementById(ROOT_ID)) return;
    lastSignature=sig;
    removeRoot();
    const root=document.createElement("div");
    root.id=ROOT_ID;
    root.innerHTML=`<div class="sh-card"><div class="sh-head"><strong>Study Helper V3</strong><button class="sh-close">×</button></div><div class="sh-label">Question detected</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Analyse answer</button></div><div class="sh-status"></div><div class="sh-response"></div></div>`;
    root.querySelector(".sh-question").textContent=question.slice(0,500);
    root.querySelector(".sh-close").onclick=()=>root.remove();
    root.querySelector(".sh-hint").onclick=()=>analyse("hint",question,root);
    root.querySelector(".sh-explain").onclick=()=>analyse("explain",question,root);
    root.querySelector(".sh-answer").onclick=()=>analyse("answer",question,root);
    document.documentElement.appendChild(root);
    chrome.storage.local.get(["rapidAutoAnalyse"],d=>{
      if(d.rapidAutoAnalyse) analyse("answer",question,root);
    });
  }

  async function analyse(mode,question,root){
    if(analysing) return;
    analysing=true;
    const status=root.querySelector(".sh-status"), response=root.querySelector(".sh-response");
    status.textContent="Analysing with AI…";
    response.textContent="";
    try{
      const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,question});
      if(!r?.ok) throw new Error(r?.error||"Analysis failed");
      status.textContent="AI: "+r.provider;
      response.textContent=r.text;
    }catch(e){status.textContent="Error: "+e.message}
    analysing=false;
  }

  function scan(){
    const q=candidateText();
    if(q) mount(q);
  }
  const observer=new MutationObserver(()=>{
    clearTimeout(debounce);
    debounce=setTimeout(scan,700);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setTimeout(scan,1200);
  setInterval(scan,2500);
})();