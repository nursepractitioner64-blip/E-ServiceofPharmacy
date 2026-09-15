
function render(d){
  ["totalItems","readyItems","missingItems","expireItems"].forEach((id,i)=>{const e=document.getElementById(id);if(e)e.textContent=[d.totalItems,d.readyItems,d.missingItems,d.expiringItems][i]||0});
  const host=document.querySelector("#systemSummaryV5"); if(!host)return;
  host.innerHTML=`<div class="d-flex justify-content-between align-items-center mb-3"><h5>Controlled Drug — Stock จริง</h5><span class="small text-muted">รับ ${d.totalIn||0} / จ่าย ${d.totalOut||0}</span></div><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>CODE</th><th>รายการ</th><th>คงเหลือ</th><th>REQ</th><th>สถานะ</th></tr></thead><tbody>${(d.balances||[]).map(x=>`<tr><td>${x.code}</td><td>${x.name}</td><td>${x.balance} ${x.unit||""}</td><td>${x.required}</td><td><span class="badge text-bg-${x.status==="READY"?"success":"danger"}">${x.status}</span></td></tr>`).join("")}</tbody></table></div>`;
}
export async function init(){console.log("💊 Controlled Drug Loaded");try{const r=await fetch(`/api/controlleddrug/summary?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();if(!j.success)throw Error(j.message);render(j.data||{})}catch(e){console.error(e)}}
export function destroy(){}
