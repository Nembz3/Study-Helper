const providers=[
  {id:"Groq",key:"groqKey",model:"groqModel",type:"openai",url:"https://api.groq.com/openai/v1/chat/completions"},
  {id:"Gemini",key:"geminiKey",model:"geminiModel",type:"gemini"},
  {id:"OpenRouter",key:"openrouterKey",model:"openrouterModel",type:"openai",url:"https://openrouter.ai/api/v1/chat/completions"}
];
const fields=["groqKey","groqModel","geminiKey","geminiModel","openrouterKey","openrouterModel"];

chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({
    id:"study-helper-selection",title:"Ask Study Helper about this",contexts:["selection"]
  }));
});
chrome.contextMenus.onClicked.addListener(info=>{
  if(info.menuItemId==="study-helper-selection"&&info.selectionText) chrome.storage.local.set({selectedQuestion:info.selectionText});
});

function promptFor(mode,q){
  const map={
    hint:"Give a useful hint only. Do not give the final answer yet unless explicitly asked.",
    explain:"Teach how to solve this step by step. Be clear and concise for a UK secondary-school student.",
    answer:"Give the most likely correct answer. If options are supplied, state the exact option text. Then give a very short reason."
  };
  return map[mode]+"\n\nQuestion and context:\n"+q;
}
async function callOpenAI(p,key,model,prompt){
  const r=await fetch(p.url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:"You are an accurate educational tutor. Never claim certainty when the question context is incomplete."},{role:"user",content:prompt}],temperature:.2})});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error?.message||"Request failed");
  return d.choices?.[0]?.message?.content;
}
async function callGemini(key,model,prompt){
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key);
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"You are an accurate educational tutor. Never claim certainty when the question context is incomplete.\n\n"+prompt}]}],generationConfig:{temperature:.2}})});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error?.message||"Request failed");
  return d.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("");
}
async function ask(mode,question){
  const settings=await chrome.storage.local.get(fields);
  const prompt=promptFor(mode,question);
  const errors=[];
  for(const p of providers){
    const key=settings[p.key],model=settings[p.model];
    if(!key||!model) continue;
    try{
      const text=p.type==="gemini"?await callGemini(key,model,prompt):await callOpenAI(p,key,model,prompt);
      if(!text) throw new Error("Empty response");
      const old=(await chrome.storage.local.get("history")).history||[];
      const next=[question,...old.filter(x=>x!==question)].slice(0,12);
      await chrome.storage.local.set({history:next});
      return {ok:true,text,provider:p.id};
    }catch(e){errors.push(p.id+": "+e.message)}
  }
  return {ok:false,error:errors.length?errors.join(" | "):"No AI provider is configured."};
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message.type==="study-helper-analyse"){
    ask(message.mode||"answer",message.question).then(sendResponse);
    return true;
  }
});