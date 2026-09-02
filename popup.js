const $=id=>document.getElementById(id);
const fields=["groqKey","groqModel","geminiKey","geminiModel","openrouterKey","openrouterModel"];
async function init(){
  const d=await chrome.storage.local.get(["selectedQuestion","history","rapidAutoAnalyse",...fields]);
  if(d.selectedQuestion)$("question").value=d.selectedQuestion;
  $("rapidAutoAnalyse").checked=!!d.rapidAutoAnalyse;
  const migrations={groqModel:{"llama-3.3-70b-versatile":"openai/gpt-oss-20b"},geminiModel:{"gemini-2.0-flash":"gemini-3.6-flash","gemini-2.0-flash-001":"gemini-3.6-flash","gemini-2.0-flash-lite":"gemini-3.1-flash-lite","gemini-2.0-flash-lite-001":"gemini-3.1-flash-lite"}};
  for(const f of fields){let value=d[f];if(migrations[f]?.[value]){value=migrations[f][value];await chrome.storage.local.set({[f]:value});}if(value)$(f).value=value;}
  renderHistory(d.history||[]);
  updateLogCount();
}
$("rapidAutoAnalyse").onchange=()=>chrome.storage.local.set({rapidAutoAnalyse:$("rapidAutoAnalyse").checked});
$("save").onclick=async()=>{const d={};fields.forEach(f=>d[f]=$(f).value.trim());await chrome.storage.local.set(d);$("status").textContent="Settings saved locally."};
async function ask(mode){const q=$("question").value.trim();if(!q){$("status").textContent="Add a question first.";return}$("status").textContent="Thinking…";$("result").hidden=true;try{const r=await chrome.runtime.sendMessage({type:"study-helper-analyse",mode,question:q});if(!r?.ok)throw new Error(r?.error||"Request failed");$("provider").textContent="Answered by "+r.provider;$("response").textContent=r.text;$("result").hidden=false;$("status").textContent="";renderHistory((await chrome.storage.local.get("history")).history||[]);updateLogCount()}catch(e){$("status").textContent="Error: "+e.message}}
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>ask(b.dataset.mode));
function renderHistory(items){$("history").innerHTML="";items.forEach(q=>{const b=document.createElement("button");b.textContent=q;b.onclick=()=>{$("question").value=q};$("history").appendChild(b)})}
async function updateLogCount(){try{const r=await chrome.runtime.sendMessage({type:"study-helper-get-logs"});$("logCount").textContent=(r?.logs?.length||0)+" events logged"}catch(e){$("logCount").textContent="Logging unavailable"}}
$("refreshLogs").onclick=updateLogCount;
$("clearLogs").onclick=async()=>{if(!confirm("Clear Study Helper diagnostic logs?"))return;await chrome.runtime.sendMessage({type:"study-helper-clear-logs"});updateLogCount()};
$("exportLogs").onclick=async()=>{const r=await chrome.runtime.sendMessage({type:"study-helper-get-logs"});const blob=new Blob([JSON.stringify(r?.logs||[],null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="study-helper-logs.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
init();
