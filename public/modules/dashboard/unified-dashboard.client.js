export async function init() {
  const host=document.querySelector("[data-unified-dashboard]");
  if(!host) return;
  host.innerHTML='<div class="text-muted">กำลังโหลด Dashboard...</div>';
  try {
    const res=await fetch(`/api/dashboard/unified?t=${Date.now()}`,{cache:"no-store"});
    const json=await res.json();
    if(!res.ok || !json.success) throw new Error(json.message||`HTTP ${res.status}`);
    render(host,json.data||{});
  } catch(e) {
    console.error(e);
    host.innerHTML=`<div class="alert alert-danger">โหลด Dashboard ไม่สำเร็จ: ${e.message}</div>`;
  }
}
function render(host,d){
  const e=d.emergency||{}, c=d.controlledDrug||{}, a=d.alerts||{};
  const badge=(n,cls)=>`<span class="badge text-bg-${cls}">${n}</span>`;
  host.innerHTML=`
  <div class="container-fluid py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h3 class="mb-1">Pharmacy Safety Dashboard</h3><div class="text-muted small">Emergency + Controlled Drug</div></div>
      <button class="btn btn-outline-primary btn-sm" id="unifiedRefresh">↻ รีเฟรช</button>
    </div>
    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><small>Emergency ทั้งหมด</small><div class="display-6 fw-bold">${e.total||0}</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><small>Emergency ผ่าน</small><div class="display-6 fw-bold text-success">${e.ready||0}</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><small>ยังไม่ผ่าน</small><div class="display-6 fw-bold text-danger">${e.fail||0}</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><small>Controlled ติดลบ</small><div class="display-6 fw-bold text-danger">${c.negative||0}</div></div></div></div>
    </div>
    <div class="row g-3">
      <div class="col-lg-7"><div class="card"><div class="card-header fw-semibold">Emergency Status</div><div class="table-responsive">
        <table class="table table-hover align-middle mb-0"><thead><tr><th>CODE</th><th>รายการ</th><th>คงเหลือ</th><th>Required</th><th>สถานะ</th></tr></thead>
        <tbody>${(e.items||[]).map(x=>`<tr><td>${x.code}</td><td>${x.name||"-"}</td><td>${x.balance} ${x.unit||""}</td><td>${x.required}</td><td>${x.status==="PASS"?badge("PASS","success"):badge("FAIL","danger")}</td></tr>`).join("")||'<tr><td colspan="5" class="text-center text-muted">ไม่พบข้อมูล</td></tr>'}</tbody></table>
      </div></div></div>
      <div class="col-lg-5"><div class="card"><div class="card-header fw-semibold">รายการผิดปกติ</div><div class="card-body">
        <div class="mb-2">Emergency ไม่ผ่าน ${badge(a.emergencyFail?.length||0,(a.emergencyFail?.length||0)?"danger":"success")}</div>
        <div class="mb-2">Controlled Drug Stock ติดลบ ${badge(a.controlledNegative?.length||0,(a.controlledNegative?.length||0)?"danger":"success")}</div>
        <hr><div class="small text-muted">ตรวจล่าสุด: ${d.generatedAt?new Date(d.generatedAt).toLocaleString("th-TH"):"-"}</div>
      </div></div></div>
    </div>
  </div>`;
  document.querySelector("#unifiedRefresh")?.addEventListener("click",init);
}
