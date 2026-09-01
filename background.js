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
    hint:"Respond with exactly one concrete hint that helps solve the question. Do not leave the response blank. Do not reveal the final answer unless the question itself cannot be solved without it.",
    explain:"Explain how to solve it in short numbered steps. Be concrete and use the supplied options. Do not leave the response blank.",
    answer:"Give the best answer directly and explicitly. Start with 'Answer:'. For multi-select, list every option to select. For ordering, give the exact order. Then give one short reason. Do not leave the response blank."
  };
  const lines=[rules[mode]||rules.answer,"Activity type: "+a.type,"Question: "+a.question];
  if(a.instruction)lines.push("Instruction: "+a.instruction);
  if(a.options.length)lines.push("Options:\n"+a.options.map((x,i)=>(i+1)+". "+x).join("\n"));
  lines.push("You must return useful text even if some activity details are imperfect.");
  return lines.join("\n");
}
async function callOpenAI(p,key,model,prompt,maxTokens){
  const r=await fetch(p.url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({
    model,
    messages:[
      {role:"system",content:"You are an accurate, concise UK secondary-school study tutor. Always return plain text. Never return a blank response."},
      {role:"user",content:prompt}
    ],
    temperature:.1,
    max_tokens:maxTokens
  })});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error?.message||"Request failed");

  const choice=d.choices?.[0]||{};
  const text=choice.message?.content||choice.text||"";
  const cleaned=clean(Array.isArray(text)?text.map(x=>typeof x==="string"?x:(x?.text||"")).join(""):text);
  if(cleaned)return cleaned;

  const reason=choice.finish_reason||d.error?.message||"unknown";
  throw new Error("Provider returned no text (finish reason: "+reason+")");
}
async function callGemini(key,model,prompt,maxTokens){
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key);
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    contents:[{role:"user",parts:[{text:"You are an accurate, concise UK secondary-school study tutor. Always return plain text and never leave the response blank.\n\n"+prompt}]}],
    generationConfig:{temperature:.2,maxOutputTokens:maxTokens}
  })});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error?.message||"Request failed");

  const candidate=d.candidates?.[0];
  const text=candidate?.content?.parts?.map(x=>x.text||"").join("")||"";
  const cleaned=clean(text);
  if(cleaned)return cleaned;

  throw new Error("Provider returned no text (finish reason: "+(candidate?.finishReason||"unknown")+")");
}
async function ask(mode,input){
  const settings=await chrome.storage.local.get(fields),activity=normaliseActivity(input),prompt=promptFor(mode,activity),errors=[];
  if(!activity.question)return {ok:false,error:"No question text was detected."};

  const maxTokens=mode==="hint"?180:mode==="answer"?280:220;

  for(const p of providers){
    const key=settings[p.key],model=settings[p.model];
    if(!key||!model)continue;

    try{
      const call=(text,budget)=>p.type==="gemini"
        ?callGemini(key,model,text,budget)
        :callOpenAI(p,key,model,text,budget);

      try{
        const text=await call(prompt,maxTokens);
        if(clean(text))return saveResult(activity,text,p.id);
      }catch(firstError){
        // Retry once only. This avoids burning through quota on repeated blank responses.
        const fallbackPrompt="Give a concise, useful answer in plain text. Do not return blank.\nQuestion: "+activity.question+
          (activity.instruction?"\nInstruction: "+activity.instruction:"")+
          (activity.options.length?"\nOptions:\n"+activity.options.map((x,i)=>(i+1)+". "+x).join("\n"):"");
        try{
          const text=await call(fallbackPrompt,Math.max(maxTokens,300));
          if(clean(text))return saveResult(activity,text,p.id);
        }catch(secondError){
          errors.push(p.id+": "+secondError.message);
          continue;
        }
        errors.push(p.id+": Empty response");
        continue;
      }
      errors.push(p.id+": Empty response");
    }catch(e){
      errors.push(p.id+": "+e.message);
    }
  }
  return {ok:false,error:errors.length?errors.join(" | "):"No AI provider is configured."};
}

async function saveResult(activity,text,provider){
  const historyText=[activity.question,...activity.options].join(" | ").slice(0,1000);
  const old=(await chrome.storage.local.get("history")).history||[];
  const next=[historyText,...old.filter(x=>x!==historyText)].slice(0,12);
  await chrome.storage.local.set({history:next});
  return {ok:true,text:clean(text),provider};
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message.type==="study-helper-analyse"){ask(message.mode||"answer",message.activity??message.question).then(sendResponse);return true;}
});