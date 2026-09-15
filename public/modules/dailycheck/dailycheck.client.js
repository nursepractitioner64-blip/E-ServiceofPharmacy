let currentData = [];

async function loadData() {
  const month = document.getElementById("monthSelect")?.value || (new Date().getMonth()+1);
  const year = document.getElementById("yearSelect")?.value || new Date().getFullYear();
  const res = await fetch(`/api/dailycheck?month=${month}&year=${year}&t=${Date.now()}`,{cache:"no-store"});
  const json = await res.json();
  if (!json.success && !json.ok) throw new Error(json.message || "โหลด Daily Check ไม่สำเร็จ");

  currentData = json.data || [];
  const tbody=document.getElementById("tbody");
  if(!tbody) return;
  tbody.innerHTML="";

  currentData.forEach(item=>{
    const required=Number(item.REQUIRED||0);
    let row=`<tr>
      <td>${item.CODE||""}</td>
      <td>${item.NAME||""}</td>
      <td>${item.UNIT||""}</td>
      <td>${required}</td>`;

    for(let day=1;day<=31;day++){
      const value=item[day];
      let cls="";
      if(value!=="" && value!=null){
        const actual=Number(value);
        cls=actual>=required ? (actual===required?"bg-success":"bg-warning") : "bg-danger";
      }
      row+=`<td class="${cls}" title="${item.CHECK_STATUS||""}">${value??""}</td>`;
    }
    row+=`<td><span class="badge ${item.CHECK_STATUS==="PASS"?"text-bg-success":item.CHECK_STATUS==="FAIL"?"text-bg-danger":"text-bg-secondary"}">${item.CHECK_STATUS||"ยังไม่ตรวจ"}</span></td>`;
    row+=`<td><button class="btn btn-sm btn-primary dc-check" data-code="${item.CODE}">ตรวจ</button></td></tr>`;
    tbody.insertAdjacentHTML("beforeend",row);
  });

  renderDailySummary(json.summary||{});
}

function renderDailySummary(s){
  let host=document.getElementById("dailyCheckSummary");
  if(!host){
    host=document.createElement("div");
    host.id="dailyCheckSummary";
    host.className="mb-3";
    const table=document.querySelector(".table-container");
    table?.parentNode?.insertBefore(host,table);
  }
  host.innerHTML=`
    <div class="d-flex flex-wrap gap-2">
      <span class="badge text-bg-secondary">ทั้งหมด ${s.total||0}</span>
      <span class="badge text-bg-success">PASS ${s.pass||0}</span>
      <span class="badge text-bg-danger">FAIL ${s.fail||0}</span>
      <span class="badge text-bg-primary">ตรวจแล้ว ${s.checked||0}</span>
    </div>`;
}

async function saveCheck(code){
  const item=currentData.find(x=>x.CODE===code);
  if(!item) return;
  const balance=prompt(`จำนวนที่ตรวจนับจริงของ ${item.NAME}`, String(item[item._day] ?? item.REQUIRED ?? 0));
  if(balance===null) return;
  const res=await fetch("/api/dailycheck/check",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({code,balance,user:"system"})
  });
  const json=await res.json();
  if(!json.success) throw new Error(json.message||"บันทึกไม่สำเร็จ");
  await loadData();
}

export async function init(){
  console.log("✅ dailycheck V7 init");
  const monthSelect=document.getElementById("monthSelect");
  const yearSelect=document.getElementById("yearSelect");
  await loadData();
  monthSelect?.addEventListener("change",loadData);
  yearSelect?.addEventListener("change",loadData);
  document.addEventListener("click",async e=>{
    const btn=e.target.closest?.(".dc-check");
    if(!btn) return;
    try{ await saveCheck(btn.dataset.code); }
    catch(err){ alert(err.message); }
  });
}

export function destroy(){}
