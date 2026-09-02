(()=>{
  const ROOT_ID="study-helper-v3-root";
  const BAD=/^(report a problem|start reading text|stop reading text|topic notes|collapse toolbar|expand toolbar|next|back|continue|settings|help|share|copy|listen|read aloud|more options|menu|close|home|exit)$/i;
  const NOISE=/^(assignment|quiz|wrong answers|tasks completed|up next|section complete|how do you want to learn)$/i;
  const CUE=/\b(best way|feature|purpose|method|effect|cause|reason|used|what|which|where|when|why|how|who|name|complete|fill|type|calculate|state|identify|value|percentage|distance|time|force|energy|resultant|describe|explain|give|find|work out|according|advantage|disadvantage|difference)\b/i;
  const VISUAL=/\b(graph|diagram|image|figure|chart|plot|picture|illustration|table|map|shown below|shown above)\b/i;
  const clean=s=>(s||"").replace(/\u00a0/g," ").replace(/[ \t\r\f]+/g," ").replace(/\n{2,}/g,"\n").trim();
  const flat=s=>clean(s).replace(/\s+/g," ").trim();
  const visible=e=>{if(!e||e.closest?.("#"+ROOT_ID))return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>8&&r.height>6&&s.display!=="none"&&s.visibility!=="hidden"&&s.opacity!=="0"&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
  const inputSel='input[type="text"],input[type="number"],input[type="tel"],input[type="url"],input[type="email"],textarea,[contenteditable="true"],[role="textbox"]';
  const optionSel='button,[role="button"],[role="option"],[role="radio"],[role="checkbox"],[role="switch"],input[type="radio"],input[type="checkbox"],select,[draggable="true"],[aria-grabbed="true"],[data-draggable],[data-sortable],[data-option],[data-answer],[data-choice]';
  const isInput=e=>!!e?.matches?.(inputSel);
  function label(e){
    let t=flat(e?.innerText||e?.value||e?.getAttribute?.("aria-label")||e?.getAttribute?.("placeholder")||e?.getAttribute?.("name")||e?.getAttribute?.("title")||e?.getAttribute?.("data-testid")||e?.getAttribute?.("data-label")||e?.getAttribute?.("data-option")||e?.getAttribute?.("data-answer")||e?.getAttribute?.("data-choice")||"");
    if(!t&&e?.getAttribute?.("aria-labelledby"))t=flat(e.getAttribute("aria-labelledby").split(/\s+/).map(id=>document.getElementById(id)?.innerText||document.getElementById(id)?.textContent||"").join(" "));
    if(!t&&e?.matches?.('input[type="radio"],input[type="checkbox"],[role="radio"],[role="checkbox"],[role="switch"]'))t=flat(e.closest("label")?.innerText||"");
    return t;
  }
  function controls(){return [...document.querySelectorAll(inputSel+','+optionSel)].filter(e=>{if(!visible(e))return false;if(isInput(e)){const s=label(e).toLowerCase();return !/search|find|message|chat|copilot|password|login|comment|feedback/i.test(s);}const t=label(e);if(!t||t.length>180||BAD.test(t))return false;return true;});}
  function cardFor(seed){
    let el=seed,best=seed;
    for(let i=0;el&&i<16;i++,el=el.parentElement){
      if(el===document.body)break;
      const r=el.getBoundingClientRect();
      if(r.width<240||r.height<55||r.width>innerWidth*.99||r.height>innerHeight*1.5)continue;
      const cs=[...el.querySelectorAll(inputSel+','+optionSel)].filter(visible);
      if(cs.length<1||cs.length>14)continue;
      const t=flat(el.innerText||el.textContent||"");
      if(t.length>=10&&t.length<6000){best=el;if(cs.length>=2)break;}
    }
    return best;
  }
  function lines(card){return clean(card.innerText||card.textContent||"").split(/\n+/).map(flat).filter(x=>x.length>=3&&x.length<=650&&!BAD.test(x)&&!NOISE.test(x));}
  function question(card,cs){
    const top=Math.min(...cs.map(e=>e.getBoundingClientRect().top));
    const controlText=new Set(cs.map(label).filter(Boolean).map(x=>x.toLowerCase()));
    const ls=lines(card).filter(x=>!controlText.has(x.toLowerCase()));
    const scored=ls.map((x,i)=>{let s=0;if(/\?$/.test(x))s+=100;if(CUE.test(x))s+=45;if(VISUAL.test(x))s+=20;if(x.length>=12&&x.length<=420)s+=15;const el=[...card.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,label,span,div")].find(n=>flat(n.innerText||n.textContent||"")===x);if(el){const r=el.getBoundingClientRect();if(r.bottom<=top+100&&r.bottom>=top-1000)s+=20;}s-=i*.15;return {x,s};}).sort((a,b)=>b.s-a.s);
    return scored[0]?.x||"";
  }
  function visualMeta(card){
    const imgs=[...card.querySelectorAll("img")].filter(visible).map(img=>({src:img.currentSrc||img.src,alt:flat(img.alt||img.getAttribute("aria-label")||""),width:img.naturalWidth||img.width,height:img.naturalHeight||img.height})).filter(x=>x.src).slice(0,4);
    const canvases=[...card.querySelectorAll("canvas")].filter(visible).map(c=>{try{return {dataUrl:c.toDataURL("image/png"),width:c.width,height:c.height};}catch{return {width:c.width,height:c.height};}}).slice(0,2);
    const svg=[...card.querySelectorAll("svg")].filter(visible).length;
    const t=flat(card.innerText||card.textContent||"");
    return {images:imgs,canvases,svgCount:svg,hasVisual:imgs.length>0||canvases.length>0||svg>0||VISUAL.test(t)};
  }
  function makeActivity(card,cs){
    const q=question(card,cs);if(!q)return null;
    const inputs=cs.filter(isInput);
    const opts=cs.filter(e=>!isInput(e)&&e.tagName!=="SELECT").map(label).filter(x=>x&&!BAD.test(x)).filter((x,i,a)=>a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i).slice(0,12);
    if(!inputs.length&&opts.length<2)return null;
    const r=card.getBoundingClientRect(),visuals=visualMeta(card);
    const type=inputs.length?"text_input":(cs.some(e=>e.matches('[role="checkbox"],[role="switch"],input[type="checkbox"]'))?"multi_select":"choice");
    return {type,question:q,options:opts,instruction:"",visuals,cardRect:{left:r.left,top:r.top,width:r.width,height:r.height},controlCount:cs.length};
  }
  async function ask(mode,a,root){
    const status=root.querySelector(".sh-status"),response=root.querySelector(".sh-response"),copy=root.querySelector(".sh-copy");
    status.textContent=mode==="answer"?"Getting quick answer…":mode==="hint"?"Getting hint…":"Explaining…";
    try{const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,activity:a});if(!r?.ok)throw Error(r?.error||"Analysis failed");status.textContent="AI: "+r.provider;response.textContent=r.text||"No response returned.";copy.hidden=mode!=="answer";}catch(e){status.textContent="Error: "+e.message;}
  }
  function mount(a){
    if(document.getElementById(ROOT_ID)||!a)return;
    const sig=(a.type+"|"+a.question+"|"+a.options.join("|")).toLowerCase();if(mount.last===sig)return;mount.last=sig;
    const root=document.createElement("div");root.id=ROOT_ID;
    root.innerHTML='<div class="sh-card"><div class="sh-head"><strong>Study Helper V4.1</strong><button class="sh-close">×</button></div><div class="sh-label"><span class="sh-type"></span> recovery detection</div><div class="sh-question"></div><div class="sh-actions"><button class="sh-hint">Hint</button><button class="sh-explain">Explain</button><button class="sh-answer">Quick answer</button></div><div class="sh-status"></div><div class="sh-response"></div><button class="sh-copy" hidden>Copy answer</button></div>';
    root.querySelector(".sh-type").textContent=a.type.replace("_"," ");root.querySelector(".sh-question").textContent=a.question+(a.options.length?"\nOptions: "+a.options.join(" • "):"");
    root.querySelector(".sh-close").onclick=()=>root.remove();root.querySelector(".sh-hint").onclick=()=>ask("hint",a,root);root.querySelector(".sh-explain").onclick=()=>ask("explain",a,root);root.querySelector(".sh-answer").onclick=()=>ask("answer",a,root);root.querySelector(".sh-copy").onclick=()=>navigator.clipboard?.writeText(root.querySelector(".sh-response").textContent);document.documentElement.appendChild(root);
    try{chrome.runtime.sendMessage({type:"study-helper-log",event:"recovery_activity_detected",data:{type:a.type,question:a.question,optionCount:a.options.length,visual:a.visuals?.hasVisual||false}});}catch{}
  }
  function scan(){if(document.getElementById(ROOT_ID))return;const cs=controls();if(!cs.length)return;for(const seed of cs){const card=cardFor(seed);const local=[...card.querySelectorAll(inputSel+','+optionSel)].filter(visible);if(local.length===1&&!isInput(local[0]))continue;const a=makeActivity(card,local);if(a){mount(a);break;}}}
  const observer=new MutationObserver(()=>{clearTimeout(scan.timer);scan.timer=setTimeout(scan,180);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener("scroll",()=>{clearTimeout(scan.timer);scan.timer=setTimeout(scan,180)},{passive:true});
  addEventListener("resize",()=>{clearTimeout(scan.timer);scan.timer=setTimeout(scan,180)});
  setTimeout(scan,700);setInterval(scan,1200);
})();
