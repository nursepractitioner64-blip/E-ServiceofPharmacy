
async function saveCheck(code){
  const user=prompt("ผู้ตรวจสอบ", "system") || "system";
  const remark=prompt("หมายเหตุ (ถ้ามี)", "") || "";
  const r=await fetch("/api/emergencycheck/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,user,remark})});
  const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||"บันทึกไม่สำเร็จ");
  alert(`${j.data.name} : ${j.data.checkStatus==="PASS"?"ผ่าน":"ไม่ผ่าน"}`); load();
}
function render(d){
  ["totalItems","readyItems","missingItems","expireItems"].forEach((id,i)=>{const e=document.getElementById(id);if(e)e.textContent=[d.totalItems,d.readyItems,d.missingItems,d.expiringItems][i]||0});
  const host=document.querySelector("#systemSummaryV5"); if(!host)return;
  host.innerHTML=`<div class="d-flex justify-content-between align-items-center mb-3"><h5>Emergency Check — ตรวจสอบจริง</h5><span class="small text-muted">${d.readinessPercent||0}% พร้อมใช้งาน</span></div><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>CODE</th><th>รายการ</th><th>คงเหลือ</th><th>REQ</th><th>สถานะ</th><th>ตรวจ</th></tr></thead><tbody>${(d.balances||[]).map(x=>`<tr><td>${x.code}</td><td>${x.name}</td><td>${x.balance} ${x.unit||""}</td><td>${x.required}</td><td><span class="badge text-bg-${x.status==="READY"?"success":"danger"}">${x.status}</span></td><td><button class="btn btn-sm btn-outline-primary js-emergency-check" data-code="${x.code}">ตรวจสอบ</button></td></tr>`).join("")}</tbody></table></div>`;
  host.querySelectorAll(".js-emergency-check").forEach(b=>b.onclick=()=>saveCheck(b.dataset.code));
}
async function load(){const r=await fetch(`/api/emergencycheck/summary?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();if(!j.success)throw Error(j.message);render(j.data||{});}
export async function init(){console.log("🚨 Emergency Check Loaded");try{await load()}catch(e){console.error(e)}}
export function destroy(){document.querySelectorAll(".js-emergency-check").forEach(b=>b.onclick=null);}
