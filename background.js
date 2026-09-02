const VERSION="4.0.0";
const PROVIDERS=[
  {id:"Groq",key:"groqKey",model:"groqModel",type:"openai",url:"https://api.groq.com/openai/v1/chat/completions"},
  {id:"Gemini",key:"geminiKey",model:"geminiModel",type:"gemini"},
  {id:"OpenRouter",key:"openrouterKey",model:"openrouterModel",type:"openai",url:"https://openrouter.ai/api/v1/chat/completions"}
];
const clean=s=>(s||"").replace(/\s+/g," ").trim();
const GROQ_VISION_MODELS=new Set(["qwen/qwen3.6-27b","qwen/qwen3.8-27b"]);
const GEMINI_MIGRATIONS={"gemini-2.0-flash":"gemini-3.6-flash","gemini-2.0-flash-001":"gemini-3.6-flash","gemini-2.0-flash-lite":"gemini-3.1-flash-lite","gemini-2.0-flash-lite-001":"gemini-3.1-flash-lite"};
async function safeLog(event,data={}){try{const d=await chrome.storage.local.get("studyHelperLogs"),logs=Array.isArray(d.studyHelperLogs)?d.studyHelperLogs:[];logs.push({time:new Date().toISOString(),event,data});await chrome.storage.local.set({studyHelperLogs:logs.slice(-500)});}catch{}}
function normaliseActivity(input){
  if(typeof input==="string")return {type:"manual",question:clean(input).slice(0,1600),options:[],instruction:"",visualInputs:[]};
  return {type:input?.type||"unknown",question:clean(input?.question).slice(0,1600),options:Array.isArray(input?.options)?input.options.slice(0,12):[],instruction:clean(input?.instruction).slice(0,500),visualInputs:Array.isArray(input?.visualInputs)?input.visualInputs.slice(0,6):[]};
}
function promptFor(mode,a){
  const goals={hint:"Give a useful hint that helps the student solve it themselves. Do not give the final answer unless it is unavoidable.",explain:"Explain how to solve the question in short, clear numbered steps. Use the supplied options and visual evidence.",answer:"Give the best answer directly and explicitly. Start with 'Answer:'. For multi-select list every option. For ordering give the exact order. Give one short reason."};
  const lines=[`Task: ${goals[mode]||goals.explain}`,`Activity type: ${a.type}`,`Question: ${a.question}`];
  if(a.options.length)lines.push(`Options: ${a.options.join(" | ")}`);
  if(a.instruction)lines.push(`Instruction: ${a.instruction}`);
  if(a.visualInputs.length)lines.push("Visual evidence is attached. Carefully inspect the Seneca question card image/graph/diagram. Ignore browser chrome and the Copilot/sidebar.");
  lines.push("Return plain text. Never return an empty response.");
  return lines.join("\n");
}
function openAIContent(prompt,visuals){if(!visuals.length)return prompt;return [{type:"text",text:prompt},...visuals.map(v=>v.type==="data"?{type:"image_url",image_url:{url:v.data}}:{type:"image_url",image_url:{url:v.url}})];}
async function callOpenAI(p,key,model,prompt,maxTokens,visuals){
  const body={model,messages:[{role:"system",content:"You are an accurate, concise UK secondary-school study tutor. Always return plain text. If an image is attached, inspect it carefully. Focus on the Seneca question card and ignore browser chrome, sidebars and extension UI."},{role:"user",content:openAIContent(prompt,visuals)}],temperature:0.15,max_tokens:maxTokens};
  const r=await fetch(p.url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${p.id}: ${j?.error?.message||r.statusText||r.status}`);
  const text=j?.choices?.[0]?.message?.content||"";if(!clean(text))throw new Error(`${p.id}: Empty response`);return clean(text);
}
async function callGemini(key,model,prompt,maxTokens,visuals){
  const parts=[{text:"You are an accurate, concise UK secondary-school study tutor. Always return plain text. Focus on the Seneca question card and ignore browser chrome, sidebars and extension UI.\n\n"+prompt}];
  for(const v of visuals){if(v.type==="data"){const m=String(v.data).match(/^data:([^;]+);base64,(.+)$/s);if(m)parts.push({inlineData:{mimeType:m[1],data:m[2]}});}}
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key);
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{maxOutputTokens:maxTokens}})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Gemini: ${j?.error?.message||r.statusText||r.status}`);
  const text=(j?.candidates||[]).flatMap(c=>c?.content?.parts||[]).map(x=>x?.text||"").join(" ");if(!clean(text))throw new Error("Gemini: Empty response");return clean(text);
}
async function loadSettings(){return await chrome.storage.local.get(PROVIDERS.flatMap(p=>[p.key,p.model]));}
async function ask(mode,input){
  const a=normaliseActivity(input);if(!a.question)throw new Error("No question detected");
  const settings=await loadSettings();await safeLog("request_started",{mode,type:a.type,question:a.question,optionCount:a.options.length,visualCount:a.visualInputs.length});
  const base=promptFor(mode,a),budgets=[700,1000];let lastErr="";
  for(const p of PROVIDERS){
    let key=settings[p.key],model=settings[p.model];
    if(p.id==="Gemini"&&GEMINI_MIGRATIONS[model]){const migrated=GEMINI_MIGRATIONS[model];await chrome.storage.local.set({[p.model]:migrated});await safeLog("model_migrated",{provider:p.id,from:model,to:migrated});model=migrated;}
    if(!key||!model){await safeLog("provider_skipped",{provider:p.id,reason:"not_configured"});continue;}
    if(a.visualInputs.length&&p.id==="Groq"&&!GROQ_VISION_MODELS.has(model)){await safeLog("provider_skipped",{provider:p.id,model,reason:"model_has_no_vision"});continue;}
    for(let attempt=0;attempt<2;attempt++){
      try{
        const prompt=attempt?base+"\nBe concise but complete; do not omit the answer or explanation.":base;
        const text=p.type==="gemini"?await callGemini(key,model,prompt,budgets[attempt],a.visualInputs):await callOpenAI(p,key,model,prompt,budgets[attempt],a.visualInputs);
        await safeLog("provider_success",{provider:p.id,mode,chars:text.length,visualCount:a.visualInputs.length});
        await chrome.storage.local.set({lastResult:{time:new Date().toISOString(),mode,type:a.type,question:a.question,text,provider:p.id}});
        return {ok:true,text,provider:p.id};
      }catch(e){lastErr=String(e?.message||e);await safeLog("provider_failure",{provider:p.id,attempt:attempt+1,error:lastErr});}
    }
  }
  throw new Error(lastErr||"No AI provider is configured");
}
chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg?.type==="study-helper-log"){safeLog(msg.event,msg.data).catch(()=>{});return;}
  if(msg?.type==="study-helper-get-logs"){chrome.storage.local.get("studyHelperLogs").then(d=>sendResponse({ok:true,logs:d.studyHelperLogs||[]}));return true;}
  if(msg?.type==="study-helper-clear-logs"){chrome.storage.local.set({studyHelperLogs:[]}).then(()=>sendResponse({ok:true}));return true;}
  if(msg?.type==="study-helper-capture-tab"){
    const windowId=sender?.tab?.windowId;
    chrome.tabs.captureVisibleTab(windowId,{format:"png"}).then(dataUrl=>sendResponse({ok:true,dataUrl})).catch(e=>{safeLog("capture_failed",{error:String(e?.message||e)});sendResponse({ok:false,error:String(e?.message||e)});});
    return true;
  }
  if(msg?.type==="study-helper-analyse"){
    ask(msg.mode,msg.activity).then(r=>sendResponse(r)).catch(e=>{safeLog("request_failed",{error:String(e?.message||e)});sendResponse({ok:false,error:String(e?.message||e)});});
    return true;
  }
});
