const API = "/api/equipment";
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
let currentUser = null;
let currentBranchId = "";
let currentBranchName = "";
let masters = [];
let assets = [];
let activeDevice = null;
let scanner = null;
let scannerStarted = false;
let scanLocked = false;
let selectedChecklistMaster = "";
let reportCache = null;
let isEditingMaster = false;

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: { "Accept":"application/json", ...(options.body ? {"Content-Type":"application/json"} : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function setMessage(id, message, type = "error") {
  const el = $(id);
  if (!el) return;
  el.textContent = message || "";
  el.className = `eq-inline-error ${type === "success" ? "is-success" : ""}`;
}

function showTab(name) {
  document.querySelectorAll("[data-eq-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.eqTab === name));
  document.querySelectorAll("[data-eq-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.eqPanel === name));
  if (name === "assets") loadAssets();
  if (name === "master" && currentUser?.role === "ADMIN") loadMasters();
  if (name === "report") loadReport();
  if (name !== "scan") stopScanner();
}

async function loadContext() {
  const [me, branches] = await Promise.all([
    fetch("/api/auth/me", {credentials:"same-origin",cache:"no-store"}).then(r=>r.json()),
    fetch("/api/branches/selection", {credentials:"same-origin",cache:"no-store"}).then(r=>r.json())
  ]);
  if (!me.ok || !branches.ok) throw new Error("ไม่สามารถตรวจสอบ Session หรือสิทธิ์สาขาได้ กรุณาเข้าสู่ระบบใหม่");
  currentUser = me.user || {};
  currentBranchId = branches.currentBranchId || "";
  const branch = (branches.data || []).find(x => String(x.branchId) === String(currentBranchId));
  currentBranchName = branch?.name || (currentBranchId === "ALL" ? "ทุกสาขา" : "");
  $("eqCurrentBranch").textContent = currentBranchName ? `${currentBranchName} (${currentBranchId})` : "กรุณาเลือกสาขาปฏิบัติงาน";
  document.querySelectorAll(".eq-admin-only").forEach(el => { el.hidden = currentUser.role !== "ADMIN"; });
  if (!currentBranchId || currentBranchId === "ALL") {
    $("eqScanMessage").textContent = "กรุณาเลือกสาขาปฏิบัติงานก่อนใช้งาน Equipment";
    $("eqStartScanner").disabled = true;
  }
}

async function loadMasters() {
  try {
    const result = await api("/master");
    masters = result.data || [];
    renderMasterList();
    fillMasterSelect();
  } catch (error) {
    setMessage("eqMasterMessage", error.message);
  }
}

function fillMasterSelect() {
  const select = $("eqAssetMaster");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = `<option value="">เลือกประเภทอุปกรณ์</option>` + masters.filter(m=>m.status==="ACTIVE").map(m=>`<option value="${esc(m.masterCode)}">${esc(m.masterCode)} — ${esc(m.equipmentName)}</option>`).join("");
  if (previous) select.value = previous;
}

function renderMasterList() {
  const body = $("eqMastersBody");
  if (!body) return;
  if (!masters.length) {
    body.innerHTML = `<tr><td colspan="5" class="eq-empty">ยังไม่มี Equipment Master</td></tr>`;
    return;
  }
  body.innerHTML = masters.map(m=>`<tr>
    <td><strong>${esc(m.masterCode)}</strong></td><td>${esc(m.equipmentName)}</td>
    <td>${esc(cycleLabel(m))}</td><td>${m.status==="ACTIVE"?"ใช้งาน":"ปิดใช้งาน"}</td>
    <td><button class="eq-btn eq-btn-light eq-btn-sm" data-edit-master="${esc(m.masterCode)}">แก้ไข</button>
    <button class="eq-btn eq-btn-light eq-btn-sm" data-edit-checklist="${esc(m.masterCode)}">Checklist</button></td>
  </tr>`).join("");
}

function cycleLabel(m) {
  const map = {DAILY:"ทุกวัน",WEEKLY:"ทุกสัปดาห์",MONTHLY:"ทุกเดือน",CUSTOM:`ทุก ${m.cycleInterval} ${m.cycleUnit==="WEEK"?"สัปดาห์":m.cycleUnit==="MONTH"?"เดือน":"วัน"}`};
  return map[m.inspectionCycle] || m.inspectionCycle;
}

function resetMasterForm() {
  $("eqMasterForm").reset();
  $("eqMasterCode").disabled = false;
  $("eqMasterInterval").value = 1;
  $("eqSaveMaster").innerHTML = `<i class="fa-solid fa-plus"></i> เพิ่ม Master`;
  isEditingMaster = false;
  setMessage("eqMasterMessage","");
}

async function saveMaster(event) {
  event.preventDefault();
  const code = $("eqMasterCode").value.trim().toUpperCase();
  const body = {
    masterCode:code,equipmentName:$("eqMasterName").value.trim(),category:$("eqMasterCategory").value.trim(),
    description:$("eqMasterDescription").value.trim(),inspectionCycle:$("eqMasterCycle").value,
    cycleInterval:Number($("eqMasterInterval").value || 1),cycleUnit:$("eqMasterCycleUnit").value
  };
  try {
    if (isEditingMaster) await api(`/master/${encodeURIComponent(code)}`,{method:"PUT",body:JSON.stringify(body)});
    else await api("/master",{method:"POST",body:JSON.stringify(body)});
    setMessage("eqMasterMessage",isEditingMaster?"แก้ไข Master สำเร็จ":"เพิ่ม Master สำเร็จ","success");
    resetMasterForm();
    await loadMasters();
  } catch (error) { setMessage("eqMasterMessage",error.message); }
}

function editMaster(code) {
  const m = masters.find(x=>x.masterCode===code);
  if (!m) return;
  $("eqMasterCode").value=m.masterCode;$("eqMasterCode").disabled=true;
  $("eqMasterName").value=m.equipmentName;$("eqMasterCategory").value=m.category;
  $("eqMasterDescription").value=m.description;$("eqMasterCycle").value=m.inspectionCycle;
  $("eqMasterInterval").value=m.cycleInterval;$("eqMasterCycleUnit").value=m.cycleUnit;
  $("eqSaveMaster").innerHTML=`<i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข`;
  isEditingMaster=true;
  $("eqMasterForm").scrollIntoView({behavior:"smooth",block:"start"});
}

function addChecklistRow(item = {}) {
  const container = $("eqChecklistItems");
  const row = document.createElement("div");
  row.className = "eq-checklist-editor-row";
  row.innerHTML = `
    <div class="eq-form-grid">
      <div class="eq-form-field eq-field-wide"><label>รายการตรวจสอบ *</label><input class="eq-ci-label" maxlength="250" value="${esc(item.itemLabel||"")}" placeholder="เช่น สายไฟและปลั๊กสมบูรณ์"></div>
      <div class="eq-form-field"><label>รูปแบบคำตอบ</label><select class="eq-ci-type">
        ${["PASS_FAIL","YES_NO","NUMBER","SELECT","TEXT","PHOTO"].map(t=>`<option value="${t}" ${item.inputType===t?"selected":""}>${({PASS_FAIL:"ผ่าน / ไม่ผ่าน",YES_NO:"ใช่ / ไม่ใช่",NUMBER:"ตัวเลข",SELECT:"เลือกตัวเลือก",TEXT:"ข้อความ",PHOTO:"ลิงก์รูปภาพ"}[t])}</option>`).join("")}
      </select></div>
      <div class="eq-form-field"><label>ตัวเลือก (คั่นด้วย , สำหรับ SELECT)</label><input class="eq-ci-options" value="${esc((item.options||[]).join(","))}" placeholder="ปกติ,ชำรุด,ไม่พบ"></div>
      <div class="eq-form-field"><label>ค่าต่ำสุด (NUMBER)</label><input class="eq-ci-min" type="number" step="any" value="${esc(item.passCondition?.min??"")}"></div>
      <div class="eq-form-field"><label>ค่าสูงสุด (NUMBER)</label><input class="eq-ci-max" type="number" step="any" value="${esc(item.passCondition?.max??"")}"></div>
      <div class="eq-form-field"><label>ค่าที่ถือว่าผ่าน (SELECT, คั่นด้วย ,)</label><input class="eq-ci-pass" value="${esc((item.passCondition?.passValues||[]).join(","))}" placeholder="ปกติ,พร้อมใช้งาน"></div>
      <div class="eq-form-field eq-check-options">
        <label><input type="checkbox" class="eq-ci-required" ${item.required===false?"":"checked"}> บังคับตอบ</label>
        <label><input type="checkbox" class="eq-ci-affects" ${item.affectsResult===false?"":"checked"}> ใช้ตัดสินผลผ่าน/ไม่ผ่าน</label>
      </div>
    </div>
    <button type="button" class="eq-btn eq-btn-light eq-btn-sm eq-remove-checklist"><i class="fa-solid fa-trash"></i> ลบรายการนี้</button>`;
  row.querySelector(".eq-remove-checklist").addEventListener("click",()=>row.remove());
  container.appendChild(row);
}

async function editChecklist(code) {
  try {
    const result = await api(`/master/${encodeURIComponent(code)}/checklist`);
    selectedChecklistMaster=code;
    $("eqChecklistTitle").textContent=`Checklist Master: ${code} (เวอร์ชันปัจจุบัน ${result.data.version})`;
    $("eqChecklistItems").innerHTML="";
    (result.data.items||[]).forEach(item=>addChecklistRow(item));
    if (!(result.data.items||[]).length) addChecklistRow();
    $("eqChecklistEditor").hidden=false;
    $("eqChecklistEditor").scrollIntoView({behavior:"smooth",block:"start"});
  } catch(error) { setMessage("eqChecklistMessage",error.message); }
}

function collectChecklist() {
  return [...$("eqChecklistItems").querySelectorAll(".eq-checklist-editor-row")].map(row=>{
    const type=row.querySelector(".eq-ci-type").value;
    const options=row.querySelector(".eq-ci-options").value.split(",").map(x=>x.trim()).filter(Boolean);
    const passValues=row.querySelector(".eq-ci-pass").value.split(",").map(x=>x.trim()).filter(Boolean);
    const min=row.querySelector(".eq-ci-min").value;
    const max=row.querySelector(".eq-ci-max").value;
    const passCondition={};
    if(min!=="")passCondition.min=Number(min);
    if(max!=="")passCondition.max=Number(max);
    if(passValues.length)passCondition.passValues=passValues;
    return {
      itemLabel:row.querySelector(".eq-ci-label").value.trim(),inputType:type,options,passCondition,
      required:row.querySelector(".eq-ci-required").checked,affectsResult:row.querySelector(".eq-ci-affects").checked
    };
  });
}

async function saveChecklist() {
  try {
    const items=collectChecklist();
    const result=await api(`/master/${encodeURIComponent(selectedChecklistMaster)}/checklist`,{method:"PUT",body:JSON.stringify({items})});
    setMessage("eqChecklistMessage",`บันทึก Checklist เวอร์ชัน ${result.data.version} สำเร็จ`,"success");
    await editChecklist(selectedChecklistMaster);
  } catch(error){setMessage("eqChecklistMessage",error.message);}
}

async function loadAssets() {
  if (!currentBranchId || currentBranchId === "ALL") {
    $("eqAssetsBody").innerHTML=`<tr><td colspan="7" class="eq-empty">กรุณาเลือกสาขาปฏิบัติงานก่อน</td></tr>`;
    return;
  }
  try {
    const result=await api("/branch-assets");
    assets=result.data||[];
    renderAssets();
    fillMasterSelect();
  } catch(error) { setMessage("eqAssetMessage",error.message); }
}

function renderAssets() {
  const body=$("eqAssetsBody");
  if(!body)return;
  if(!assets.length){body.innerHTML=`<tr><td colspan="7" class="eq-empty">ยังไม่มีอุปกรณ์ในสาขานี้</td></tr>`;return;}
  body.innerHTML=assets.map(a=>`<tr>
    <td><strong>${esc(a.masterCode)}</strong></td><td>${esc(a.master?.equipmentName||"")}</td><td>${esc(a.assetCode)}</td>
    <td>${esc([a.brand,a.model].filter(Boolean).join(" / ")||"-")}</td><td>${esc(a.serialNumber||"-")}</td><td>${esc(a.location||"-")}</td>
    <td><button type="button" class="eq-btn eq-btn-light eq-btn-sm" data-show-qr="${esc(a.equipmentId)}"><i class="fa-solid fa-qrcode"></i> QR</button>
    <button type="button" class="eq-btn eq-btn-light eq-btn-sm" data-edit-asset="${esc(a.equipmentId)}">แก้ไข</button></td>
  </tr>`).join("");
}

function resetAssetForm() {
  $("eqAssetForm").reset();$("eqAssetId").value="";$("eqSaveAsset").innerHTML=`<i class="fa-solid fa-plus"></i> ลงทะเบียนอุปกรณ์`;setMessage("eqAssetMessage","");
}
async function saveAsset(event) {
  event.preventDefault();
  const id=$("eqAssetId").value;
  const body={
    masterCode:$("eqAssetMaster").value,assetCode:$("eqAssetCode").value.trim(),brand:$("eqBrand").value.trim(),
    model:$("eqModel").value.trim(),serialNumber:$("eqSerial").value.trim(),location:$("eqLocation").value.trim(),
    installDate:$("eqInstallDate").value,photoUrl:$("eqPhotoUrl").value.trim()
  };
  try {
    if(id) await api(`/branch-assets/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify(body)});
    else await api("/branch-assets",{method:"POST",body:JSON.stringify(body)});
    setMessage("eqAssetMessage",id?"แก้ไขข้อมูลอุปกรณ์สำเร็จ":"ลงทะเบียนอุปกรณ์และสร้าง QR สำเร็จ","success");
    resetAssetForm();await loadAssets();
  } catch(error){setMessage("eqAssetMessage",error.message);}
}
function editAsset(id) {
  const a=assets.find(x=>x.equipmentId===id);if(!a)return;
  $("eqAssetId").value=a.equipmentId;$("eqAssetMaster").value=a.masterCode;$("eqAssetCode").value=a.assetCode;
  $("eqBrand").value=a.brand;$("eqModel").value=a.model;$("eqSerial").value=a.serialNumber;
  $("eqLocation").value=a.location;$("eqInstallDate").value=a.installDate;$("eqPhotoUrl").value=a.photoUrl;
  $("eqSaveAsset").innerHTML=`<i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข`;
  $("eqAssetForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function openModal(title, html) {
  $("eqModalTitle").textContent=title;$("eqModalBody").innerHTML=html;$("eqModal").hidden=false;document.body.style.overflow="hidden";
}
function closeModal() {$("eqModal").hidden=true;document.body.style.overflow="";}
function showQr(id) {
  const a=assets.find(x=>x.equipmentId===id);if(!a)return;
  openModal("QR Code ประจำเครื่อง",`<div class="eq-qr-print"><div class="eq-qr-box" id="eqQrCanvas"></div><div class="eq-qr-meta"><h4>${esc(a.master?.equipmentName||a.masterCode)}</h4><p>CODE: ${esc(a.masterCode)}</p><p>รหัสเครื่อง: ${esc(a.assetCode)}</p><p>ยี่ห้อ / รุ่น: ${esc([a.brand,a.model].filter(Boolean).join(" / ")||"-")}</p><p>Serial: ${esc(a.serialNumber||"-")}</p><p>สาขา: ${esc(currentBranchName)}</p><p class="eq-qr-value">${esc(a.qrValue)}</p></div></div><div class="eq-form-actions"><button class="eq-btn eq-btn-primary" id="eqPrintQr" type="button"><i class="fa-solid fa-print"></i> พิมพ์ QR</button></div>`);
  const box=$("eqQrCanvas");
  if(window.QRCode) new window.QRCode(box,{text:a.qrValue,width:144,height:144,colorDark:"#123b36",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.M});
  else box.textContent="ไม่พบ QRCode Library กรุณาตรวจสอบการโหลด qrcode.min.js";
  $("eqPrintQr")?.addEventListener("click",()=>window.print());
}

function renderChecklistForm(device) {
  activeDevice=device;
  $("eqDeviceName").textContent=device.master.equipmentName;
  $("eqDeviceCode").textContent=device.master.masterCode;
  $("eqDeviceMeta").textContent=[device.assetCode,device.brand,device.model,device.serialNumber,device.location].filter(Boolean).join(" · ");
  $("eqChecklistFields").innerHTML=device.checklist.items.map((item,index)=>{
    let input="";
    const required=item.required?"required":"";
    if(item.inputType==="PASS_FAIL") input=`<select data-answer ${required}><option value="">เลือกผลตรวจ</option><option value="PASS">ผ่าน</option><option value="FAIL">ไม่ผ่าน</option></select>`;
    else if(item.inputType==="YES_NO") input=`<select data-answer ${required}><option value="">เลือกคำตอบ</option><option value="YES">ใช่</option><option value="NO">ไม่ใช่</option></select>`;
    else if(item.inputType==="NUMBER") input=`<input data-answer type="number" step="any" ${required} placeholder="ระบุตัวเลข">`;
    else if(item.inputType==="SELECT") input=`<select data-answer ${required}><option value="">เลือกคำตอบ</option>${(item.options||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select>`;
    else if(item.inputType==="PHOTO") input=`<input data-answer type="url" placeholder="วางลิงก์รูปภาพ">`;
    else input=`<input data-answer type="text" ${required} maxlength="1000" placeholder="กรอกคำตอบ">`;
    return `<div class="eq-check-item" data-check-item="${esc(item.checklistItemId)}" data-index="${index}">
      <label>${index+1}. ${esc(item.itemLabel)} ${item.required?'<span style="color:#dc2626">*</span>':''}</label>
      ${input}
      <input data-answer-remark type="text" maxlength="500" placeholder="หมายเหตุ (ถ้ามี)" style="margin-top:7px">
      ${item.inputType==="PHOTO"?'<small>ใช้ URL รูปภาพที่เข้าถึงได้</small>':""}
    </div>`;
  }).join("");
  $("eqInspectionRemark").value="";
  $("eqCheckCard").hidden=false;$("eqResultCard").hidden=true;
  $("eqCheckCard").scrollIntoView({behavior:"smooth",block:"start"});
}

async function stopScanner() {
  if(!scanner)return;
  try {if(scannerStarted)await scanner.stop();await scanner.clear();}
  catch(error){console.warn("Equipment scanner cleanup:",error);}
  finally {scanner=null;scannerStarted=false;scanLocked=false;}
  const reader=$("eqReader");
  if(reader)reader.innerHTML=`<div class="eq-reader-placeholder"><i class="fa-solid fa-camera"></i><strong>หยุดกล้องแล้ว</strong><span>กดเปิดกล้องเพื่อสแกนอีกครั้ง</span></div>`;
  if($("eqStartScanner"))$("eqStartScanner").disabled=false;
  if($("eqStopScanner"))$("eqStopScanner").disabled=true;
}
async function startScanner() {
  if(scannerStarted)return;
  if(!currentBranchId||currentBranchId==="ALL")throw new Error("กรุณาเลือกสาขาปฏิบัติงานก่อน");
  if(!window.Html5Qrcode)throw new Error("ไม่พบไลบรารี html5-qrcode");
  $("eqReader").innerHTML="";
  scanner=new Html5Qrcode("eqReader");
  await scanner.start({facingMode:"environment"},{fps:10,qrbox:(w,h)=>({width:Math.min(w,280),height:Math.min(h,280)})},handleScan);
  scannerStarted=true;$("eqStartScanner").disabled=true;$("eqStopScanner").disabled=false;
  setMessage("eqScanMessage","กำลังสแกน QR...");
}
async function handleScan(decodedText) {
  if(scanLocked)return;
  scanLocked=true;
  try {
    await stopScanner();
    setMessage("eqScanMessage","กำลังตรวจสอบ QR...");
    const result=await api("/scan/resolve",{method:"POST",body:JSON.stringify({qrValue:decodedText})});
    $("eqScanMessage").textContent="";
    $("eqResultCard").hidden=true;
    renderChecklistForm(result.data);
  } catch(error) {
    setMessage("eqScanMessage",error.message);
    scanLocked=false;
  }
}
async function saveInspection(event) {
  event.preventDefault();
  if(!activeDevice)return;
  const answers=[...$("eqChecklistFields").querySelectorAll("[data-check-item]")].map(row=>{
    const item=activeDevice.checklist.items[Number(row.dataset.index)];
    const value=row.querySelector("[data-answer]")?.value ?? "";
    const remark=row.querySelector("[data-answer-remark]")?.value ?? "";
    return {checklistItemId:item.checklistItemId,value,remark,photoUrl:item.inputType==="PHOTO"?value:""};
  });
  const button=$("eqSaveInspection");button.disabled=true;
  try {
    const result=await api("/inspections",{method:"POST",body:JSON.stringify({equipmentId:activeDevice.equipmentId,answers,remark:$("eqInspectionRemark").value})});
    const d=result.data;
    $("eqCheckCard").hidden=true;$("eqResultCard").hidden=false;
    const pass=d.status==="PASS";
    $("eqResultMark").textContent=pass?"✓":"✕";$("eqResultMark").classList.toggle("fail",!pass);
    $("eqResultTitle").textContent=pass?"ตรวจสอบผ่าน":"ตรวจสอบไม่ผ่าน";
    $("eqResultText").textContent=`${d.assetCode} · ${d.inspectionDate} ${d.inspectionTime} · ผู้ตรวจ ${d.inspector}`;
    $("eqResultCard").scrollIntoView({behavior:"smooth",block:"center"});
  } catch(error) {
    setMessage("eqScanMessage",error.message);
  } finally {button.disabled=false;}
}

function initReportFilters() {
  const now=new Date();
  $("eqReportMonth").innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?"selected":""}>${["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][i]}</option>`).join("");
  $("eqReportYear").innerHTML=Array.from({length:6},(_,i)=>{const y=now.getFullYear()-2+i;return `<option value="${y}" ${y===now.getFullYear()?"selected":""}>${y+543}</option>`}).join("");
}
async function loadReport() {
  if (!currentBranchId || currentBranchId === "ALL") {
    $("eqReportBody").innerHTML=`<tr><td colspan="33" class="eq-empty">กรุณาเลือกสาขาปฏิบัติงานก่อน</td></tr>`;
    return;
  }
  const month=Number($("eqReportMonth")?.value || new Date().getMonth()+1);
  const year=Number($("eqReportYear")?.value || new Date().getFullYear());
  $("eqReportBody").innerHTML=`<tr><td colspan="33" class="eq-empty">กำลังโหลดรายงาน...</td></tr>`;
  try {
    reportCache=await api(`/reports/monthly?month=${month}&year=${year}`);
    renderReport();
  } catch(error) {$("eqReportBody").innerHTML=`<tr><td colspan="33" class="eq-empty">${esc(error.message)}</td></tr>`;}
}
function renderReport() {
  if(!reportCache)return;
  const head=$("eqReportHead"),body=$("eqReportBody");
  head.innerHTML=`<tr><th>CODE</th><th>NAME</th>${Array.from({length:31},(_,i)=>`<th>${i+1}</th>`).join("")}</tr>`;
  if(!reportCache.data.length) {
    body.innerHTML=`<tr><td colspan="33" class="eq-empty">สาขานี้ยังไม่มีอุปกรณ์ที่ลงทะเบียน</td></tr>`;
    return;
  }
  body.innerHTML=reportCache.data.map(row=>`<tr>
    <td><strong>${esc(row.code)}</strong></td><td>${esc(row.name)}</td>
    ${Array.from({length:31},(_,i)=>{
      const day=i+1,cell=row.days[day];
      if(!cell||cell.status==="NA")return "<td></td>";
      if(cell.status==="NONE")return `<td><button class="eq-day-button" title="ยังไม่ได้ตรวจ" data-day-detail="${esc(row.code)}" data-day="${day}"></button></td>`;
      const symbol=cell.status==="PASS"?"✓":cell.status==="FAIL"?"✕":"◐";
      const klass=cell.status==="PASS"?"pass":cell.status==="FAIL"?"fail":"partial";
      const title=cell.status==="PASS"?"ผ่านทุกเครื่อง":cell.status==="FAIL"?`มีเครื่องไม่ผ่าน ${cell.failCount} เครื่อง`: `ตรวจแล้ว ${cell.inspectedCount}/${cell.assetCount} เครื่อง`;
      return `<td><button class="eq-day-button ${klass}" title="${title}" data-day-detail="${esc(row.code)}" data-day="${day}">${symbol}${cell.alert?'<span class="eq-day-alert">7d</span>':""}</button></td>`;
    }).join("")}
  </tr>`).join("");
  body.insertAdjacentHTML("beforeend",`<tr class="eq-recorder-row"><td colspan="2">ผู้ตรวจ/ผู้บันทึก</td>${Array.from({length:31},(_,i)=>{
    const day=i+1,names=reportCache.recorders?.[day]||[];
    return `<td>${names.length?`<button class="eq-recorder-button" title="${esc(names.join(", "))}" data-recorder-day="${day}"><i class="fa-solid fa-user"></i></button>`:"—"}</td>`;
  }).join("")}</tr>`);
}

async function showDayDetails(code, day) {
  const date=`${reportCache.year}-${String(reportCache.month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  try {
    const result=await api(`/reports/day-details?masterCode=${encodeURIComponent(code)}&date=${date}`);
    const rows=result.data||[];
    const html=`<p class="eq-modal-subtitle">${esc(code)} · ${esc(date)} · ${rows.length} เครื่อง</p>
      <div class="eq-table-wrap"><table class="eq-table"><thead><tr><th>รหัสเครื่อง</th><th>ยี่ห้อ / รุ่น</th><th>Serial Number</th><th>ผลตรวจ</th><th>เวลา / ผู้ตรวจ</th><th>รายละเอียด</th></tr></thead><tbody>
      ${rows.map(a=>`<tr><td>${esc(a.assetCode)}</td><td>${esc([a.brand,a.model].filter(Boolean).join(" / ")||"-")}</td><td>${esc(a.serialNumber||"-")}</td>
      <td>${statusBadge(a.status)}</td><td>${a.inspectionId?`${esc(a.inspectionTime)}<br>${esc(a.inspectorName)}`:"-"}</td>
      <td>${a.inspectionId?`<button class="eq-btn eq-btn-light eq-btn-sm" data-open-inspection="${esc(a.inspectionId)}">ดู Checklist</button>`:"-"}</td></tr>`).join("")}
      </tbody></table></div>`;
    openModal(`ผลตรวจรายเครื่อง · วันที่ ${day}`,html);
  } catch(error){openModal("ไม่สามารถโหลดรายละเอียด",`<p>${esc(error.message)}</p>`);}
}
function statusBadge(status) {
  const map={PASS:["ผ่าน","pass"],FAIL:["ไม่ผ่าน","fail"],NONE:["ยังไม่ได้ตรวจ","none"],NA:["ไม่ใช้ตัดสินผล","none"]};
  const item=map[status]||["ไม่ทราบสถานะ","none"];
  return `<span class="eq-status ${item[1]}">${item[0]}</span>`;
}
async function showInspection(id) {
  try {
    const result=await api(`/inspections/${encodeURIComponent(id)}`);
    const d=result.data;
    const items=d.items.map((item,i)=>`<tr><td>${i+1}. ${esc(item.label)}</td><td>${esc(item.answer||"-")}</td><td>${statusBadge(item.result)}</td><td>${esc(item.remark||"-")}</td></tr>`).join("");
    openModal("รายละเอียด Checklist",`<div class="eq-modal-info">
      <div><small>Master CODE</small><strong>${esc(d.masterCode)}</strong></div><div><small>รหัสเครื่อง</small><strong>${esc(d.equipmentId)}</strong></div>
      <div><small>วันที่ / เวลา</small><strong>${esc(d.date)} ${esc(d.time)}</strong></div><div><small>ผู้ตรวจ</small><strong>${esc(d.inspectorName)}</strong></div>
      <div><small>ผลรวม</small><strong>${statusBadge(d.status)}</strong></div><div><small>หมายเหตุ</small><strong>${esc(d.remark||"-")}</strong></div>
      </div><div class="eq-table-wrap"><table class="eq-check-detail"><thead><tr><th>รายการตรวจ</th><th>คำตอบ</th><th>ผล</th><th>หมายเหตุ</th></tr></thead><tbody>${items}</tbody></table></div>`);
  } catch(error){openModal("ไม่สามารถโหลดรายละเอียด",`<p>${esc(error.message)}</p>`);}
}
function showRecorders(day) {
  const names=reportCache?.recorders?.[day]||[];
  const date=`${reportCache.year}-${String(reportCache.month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  openModal("ผู้ตรวจ/ผู้บันทึก",`<p>วันที่ ${esc(date)}</p><ul>${names.map(n=>`<li>${esc(n)}</li>`).join("")||"<li>ไม่มีข้อมูลผู้ตรวจ</li>"}</ul>`);
}

function bindEvents() {
  document.querySelectorAll("[data-eq-tab]").forEach(btn=>btn.addEventListener("click",()=>showTab(btn.dataset.eqTab)));
  $("eqMasterForm").addEventListener("submit",saveMaster);
  $("eqResetMaster").addEventListener("click",resetMasterForm);
  $("eqReloadMasters").addEventListener("click",loadMasters);
  $("eqAddChecklistItem").addEventListener("click",()=>addChecklistRow());
  $("eqSaveChecklist").addEventListener("click",saveChecklist);
  $("eqAssetForm").addEventListener("submit",saveAsset);
  $("eqResetAsset").addEventListener("click",resetAssetForm);
  $("eqReloadAssets").addEventListener("click",loadAssets);
  $("eqInspectionForm").addEventListener("submit",saveInspection);
  $("eqStartScanner").addEventListener("click",()=>startScanner().catch(e=>setMessage("eqScanMessage",e.message)));
  $("eqStopScanner").addEventListener("click",stopScanner);
  $("eqCancelInspection").addEventListener("click",async()=>{activeDevice=null;$("eqCheckCard").hidden=true;await startScanner().catch(e=>setMessage("eqScanMessage",e.message));});
  $("eqScanNext").addEventListener("click",async()=>{$("eqResultCard").hidden=true;activeDevice=null;await startScanner().catch(e=>setMessage("eqScanMessage",e.message));});
  $("eqLoadReport").addEventListener("click",loadReport);
  document.addEventListener("click",handleDelegatedClick);
}
async function handleDelegatedClick(event) {
  const target=event.target.closest("[data-edit-master],[data-edit-checklist],[data-edit-asset],[data-show-qr],[data-day-detail],[data-recorder-day],[data-open-inspection],[data-eq-close]");
  if(!target)return;
  if(target.hasAttribute("data-eq-close")){closeModal();return;}
  if(target.dataset.editMaster){editMaster(target.dataset.editMaster);return;}
  if(target.dataset.editChecklist){await editChecklist(target.dataset.editChecklist);return;}
  if(target.dataset.editAsset){editAsset(target.dataset.editAsset);return;}
  if(target.dataset.showQr){showQr(target.dataset.showQr);return;}
  if(target.dataset.dayDetail){await showDayDetails(target.dataset.dayDetail,Number(target.dataset.day));return;}
  if(target.dataset.recorderDay){showRecorders(Number(target.dataset.recorderDay));return;}
  if(target.dataset.openInspection){await showInspection(target.dataset.openInspection);return;}
}

export async function init() {
  bindEvents();
  initReportFilters();
  try {
    await loadContext();
    await loadMasters();
    if (currentBranchId && currentBranchId !== "ALL") {
      await loadAssets();
      await loadReport();
    } else {
      $("eqAssetsBody").innerHTML=`<tr><td colspan="7" class="eq-empty">กรุณาเลือกสาขาปฏิบัติงานก่อน</td></tr>`;
      $("eqReportBody").innerHTML=`<tr><td colspan="33" class="eq-empty">กรุณาเลือกสาขาปฏิบัติงานก่อน</td></tr>`;
    }
    if(currentUser?.role!=="ADMIN") {
      const masterTab=document.querySelector('[data-eq-tab="master"]');
      if(masterTab)masterTab.hidden=true;
    }
  } catch(error) {
    setMessage("eqScanMessage",error.message);
    console.error("EQUIPMENT INIT ERROR:",error);
  }
}
export async function destroy() {
  document.removeEventListener("click",handleDelegatedClick);
  await stopScanner();
}
