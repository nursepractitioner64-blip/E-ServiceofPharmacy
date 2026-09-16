<<<<<<< HEAD
=======
/*********************************************************
FILE:
modules/emergencycheck/emergencycheck.client.js
*********************************************************/

export async function init() {

console.log("🚨 Emergency Checklist Module Loaded");

bindEvents();

await loadChecklist();
>>>>>>> 4f05e1a (Fix)

async function saveCheck(code){
  const user=prompt("ผู้ตรวจสอบ", "system") || "system";
  const remark=prompt("หมายเหตุ (ถ้ามี)", "") || "";
  const r=await fetch("/api/emergencycheck/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,user,remark})});
  const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.message||"บันทึกไม่สำเร็จ");
  alert(`${j.data.name} : ${j.data.checkStatus==="PASS"?"ผ่าน":"ไม่ผ่าน"}`); load();
}
<<<<<<< HEAD
function render(d){
  ["totalItems","readyItems","missingItems","expireItems"].forEach((id,i)=>{const e=document.getElementById(id);if(e)e.textContent=[d.totalItems,d.readyItems,d.missingItems,d.expiringItems][i]||0});
  const host=document.querySelector("#systemSummaryV5"); if(!host)return;
  host.innerHTML=`<div class="d-flex justify-content-between align-items-center mb-3"><h5>Emergency Check — ตรวจสอบจริง</h5><span class="small text-muted">${d.readinessPercent||0}% พร้อมใช้งาน</span></div><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>CODE</th><th>รายการ</th><th>คงเหลือ</th><th>REQ</th><th>สถานะ</th><th>ตรวจ</th></tr></thead><tbody>${(d.balances||[]).map(x=>`<tr><td>${x.code}</td><td>${x.name}</td><td>${x.balance} ${x.unit||""}</td><td>${x.required}</td><td><span class="badge text-bg-${x.status==="READY"?"success":"danger"}">${x.status}</span></td><td><button class="btn btn-sm btn-outline-primary js-emergency-check" data-code="${x.code}">ตรวจสอบ</button></td></tr>`).join("")}</tbody></table></div>`;
  host.querySelectorAll(".js-emergency-check").forEach(b=>b.onclick=()=>saveCheck(b.dataset.code));
}
async function load(){const r=await fetch(`/api/emergencycheck/summary?t=${Date.now()}`,{cache:"no-store"});const j=await r.json();if(!j.success)throw Error(j.message);render(j.data||{});}
export async function init(){console.log("🚨 Emergency Check Loaded");try{await load()}catch(e){console.error(e)}}
export function destroy(){document.querySelectorAll(".js-emergency-check").forEach(b=>b.onclick=null);}
=======

/*********************************************************
BIND EVENTS
*********************************************************/

function bindEvents() {

/* =====================================================
SCAN QR
===================================================== */

const scanBtn =
document.querySelector("#scanQrBtn");

scanBtn?.addEventListener("click", () => {


console.log("📷 OPEN QR SCANNER");

alert("เปิดระบบสแกน QR");


});

/* =====================================================
SAVE
===================================================== */

const saveBtn =
document.querySelector("#saveChecklistBtn");

saveBtn?.addEventListener("click", async () => {


try {

  console.log("💾 SAVE CHECKLIST");

  saveBtn.disabled = true;

  saveBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    กำลังบันทึก...
  `;

  // TODO:
  // const result = await saveChecklist();

  await fakeDelay(1000);

  alert("บันทึกข้อมูลสำเร็จ");

} catch (err) {

  console.error(
    "❌ SAVE CHECKLIST ERROR:",
    err
  );

  alert("เกิดข้อผิดพลาด");

} finally {

  saveBtn.disabled = false;

  saveBtn.innerHTML = `
    <i class="fa-solid fa-check"></i>
    บันทึก
  `;

}


});

/* =====================================================
MENU
===================================================== */

const menuButtons =
document.querySelectorAll(
".ems-check-menu-btn"
);

menuButtons.forEach(btn => {


btn.addEventListener("click", async (e) => {

  /*
   * ป้องกัน app.js click handler
   * ไม่ให้จับ event ซ้ำ
   */
  e.preventDefault();
  e.stopPropagation();


  const page =
    btn.dataset.page;


  console.log(
    "📂 OPEN PAGE:",
    page
  );


  /* =================================================
     ACTIVE MENU
  ================================================= */

  menuButtons.forEach(b => {

    b.classList.remove("active");

  });

  btn.classList.add("active");


  /* =================================================
     ROUTE MAP
  ================================================= */

  const map = {

    inventory:
      "inventory-master",

    receive:
      "receive-stock",

    inventorydispense:
      "inventorydispense",

    check:
      "emergency-checklist",

    report:
      "dashboard",

    dailycheck:
      "dailycheck"

  };


  const route =
    map[page];


  console.log(
    "🧭 ROUTE:",
    page,
    "→",
    route
  );


  /* =================================================
     VALIDATE ROUTE
  ================================================= */

  if (!route) {

    console.error(
      "❌ ROUTE NOT FOUND FOR PAGE:",
      page
    );

    return;

  }


  /* =================================================
     CHECK NAVIGATOR
  ================================================= */

  if (
    typeof window.navigate !== "function"
  ) {

    console.error(
      "❌ window.navigate is not available"
    );

    return;

  }


  /* =================================================
     NAVIGATE
  ================================================= */

  console.log(
    "🚀 NAVIGATE:",
    route
  );


  /*
   * เรียก navigate เพียงครั้งเดียว
   *
   * ไม่ใช้ setTimeout
   * ไม่เรียก loadView โดยตรง
   */
  try {

    await window.navigate(route);

  } catch (err) {

    console.error(
      "❌ NAVIGATION ERROR:",
      err
    );

  }

});


});

}

/*********************************************************
LOAD CHECKLIST
*********************************************************/

async function loadChecklist() {

try {


console.log(
  "📦 LOAD EMERGENCY CHECKLIST"
);


// TODO:
// const res =
//   await fetch("/api/emergency-checklist");


await fakeDelay(500);


updateSummary({

  total: 124,

  ready: 118,

  missing: 4,

  expire: 2

});


} catch (err) {


console.error(
  "❌ LOAD CHECKLIST ERROR:",
  err
);


}

}

/*********************************************************
UPDATE SUMMARY
*********************************************************/

function updateSummary(data) {

const total =
document.querySelector(
"#totalItems"
);

const ready =
document.querySelector(
"#readyItems"
);

const missing =
document.querySelector(
"#missingItems"
);

const expire =
document.querySelector(
"#expireItems"
);

if (total) {


total.textContent =
  data.total || 0;


}

if (ready) {


ready.textContent =
  data.ready || 0;


}

if (missing) {


missing.textContent =
  data.missing || 0;


}

if (expire) {


expire.textContent =
  data.expire || 0;


}

}

/*********************************************************
UTIL
*********************************************************/

function fakeDelay(ms) {

return new Promise(resolve => {


setTimeout(
  resolve,
  ms
);


});

}
>>>>>>> 4f05e1a (Fix)
