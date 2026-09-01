const providers=[
  {id:"Groq",key:"groqKey",model:"groqModel",type:"openai",url:"https://api.groq.com/openai/v1/chat/completions"},
  {id:"Gemini",key:"geminiKey",model:"geminiModel",type:"gemini"},
  {id:"OpenRouter",key:"openrouterKey",model:"openrouterModel",type:"openai",url:"https://openrouter.ai/api/v1/chat/completions"}
];
const fields=["groqKey","groqModel","geminiKey","geminiModel","openrouterKey","openrouterModel"];
const clean=s=>(s||"").replace(/\s+/g," ").trim();

chrome.runtime.onInstalled.addListener(()=>chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({id:"study-helper-selection",title:"Ask Study Helper about this",contexts:["selection"]})));
chrome.contextMenus.onClicked.addListener(info=>{if(info.menuItemId==="study-helper-selection"&&info.selectionText)chrome.storage.local.set({selectedQuestion:info.selectionText});});

function normaliseActivity(input){
  if(typeof input==="string")return {type:"manual",question:clean(input).slice(0,900),options:[],instruction:""};
  return {
    type:clean(input?.type||"unknown").slice(0,40),
    question:clean(input?.question).slice(0,700),
    options:(input?.options||[]).map(x=>clean(x).slice(0,220)).filter(Boolean).slice(0,10),
    instruction:clean(input?.instruction).slice(0,240)
  };
}
function promptFor(mode,input){
  const a=normaliseActivity(input);
  const rules={
    hint:"Give one useful hint only. Do not give the final answer. Max 45 words.",
    explain:"Explain how to solve it in short numbered steps. Max 100 words.",
    answer:"Give the answer first. For multi-select, clearly list every option that should be selected. For ordering, list the exact order. Then give one brief reason. Max 70 words."
  };
  const lines=[rules[mode],"Activity type: "+a.type,"Question: "+a.question];
  if(a.instruction)lines.push("Instruction: "+a.instruction);
  if(a.options.length)lines.push("Options:\n"+a.options.map((x,i)=>(i+1)+". "+x).join("\n"));
  return lines.join("\n");
}
async function callOpenAI(p,key,model,prompt,maxTokens){
  const r=await fetch(p.url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:"You are an accurate, concise UK secondary-school study tutor. Use only the supplied activity data. Do not invent missing options."},{role:"user",content:prompt}],temperature:.1,max_tokens:maxTokens})});
  const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Request failed");return d.choices?.[0]?.message?.content;
}
async function callGemini(key,model,prompt,maxTokens){
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key);
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"You are an accurate, concise UK secondary-school study tutor.\n"+prompt}]}],generationConfig:{temperature:.1,maxOutputTokens:maxTokens}})});
  const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Request failed");return d.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("");
}
async function ask(mode,input){
  const settings=await chrome.storage.local.get(fields),activity=normaliseActivity(input),prompt=promptFor(mode,activity),errors=[];
  if(!activity.question)return {ok:false,error:"No question text was detected."};
  const maxTokens=mode==="hint"?80:mode==="answer"?110:150;
  for(const p of providers){
    const key=settings[p.key],model=settings[p.model];if(!key||!model)continue;
    try{
      const text=p.type==="gemini"?await callGemini(key,model,prompt,maxTokens):await callOpenAI(p,key,model,prompt,maxTokens);
      if(!text)throw new Error("Empty response");
      const historyText=[activity.question,...activity.options].join(" | ").slice(0,1000);
      const old=(await chrome.storage.local.get("history")).history||[],next=[historyText,...old.filter(x=>x!==historyText)].slice(0,12);
      await chrome.storage.local.set({history:next});return {ok:true,text,provider:p.id};
    }catch(e){errors.push(p.id+": "+e.message);}
  }
  return {ok:false,error:errors.length?errors.join(" | "):"No AI provider is configured."};
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message.type==="study-helper-analyse"){ask(message.mode||"answer",message.activity??message.question).then(sendResponse);return true;}
});