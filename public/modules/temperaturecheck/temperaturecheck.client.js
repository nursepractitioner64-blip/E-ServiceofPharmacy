
const API = "/api/temperature-check/records";
const TYPES = {
  freezer: { label: "อุณหภูมิตู้เย็น ช่องแช่แข็ง (°C)", min: -25, max: -15, unit: "°C", range: "-15 ถึง -25 °C" },
  fridge: { label: "อุณหภูมิตู้เย็น ช่องธรรมดา (°C)", min: 2, max: 8, unit: "°C", range: "2–8 °C" },
  room: { label: "อุณหภูมิห้อง (°C)", min: -Infinity, max: 30, unit: "°C", range: "ไม่เกิน 30 °C" },
  humidity: { label: "ความชื้นสัมพัทธ์ (%)", min: -Infinity, max: 70, unit: "%", range: "ไม่เกิน 70%" }
};
const $ = (id) => document.getElementById(id);
let records = [];
let allowedBranches = [];

export async function init() {
  const today = new Date();
  if ($("tcDate")) $("tcDate").value = localDate(today);
  if ($("tcMonth")) $("tcMonth").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  bindEvents();
  updateUnit();
  await loadAllowedBranches();
  await loadReport();
}

function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function bindEvents() {
  document.querySelectorAll("[data-tc-tab]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tc-tab]").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll("[data-tc-pane]").forEach(p => p.hidden = p.dataset.tcPane !== btn.dataset.tcTab);
  }));
  $("tcType")?.addEventListener("change", updateUnit);
  $("temperatureForm")?.addEventListener("submit", saveForm);
  $("tcReload")?.addEventListener("click", loadReport);
  $("tcMonth")?.addEventListener("change", loadReport);
  $("tcPrint")?.addEventListener("click", () => window.print());
  $("tcBranchLabel")?.addEventListener("change", changeBranch);
}

async function loadAllowedBranches() {
  const select = $("tcBranchLabel");
  if (!select) return;
  select.innerHTML = '<option value="">กำลังโหลดสาขา...</option>';
  try {
    const response = await fetch("/api/branches/selection", { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "โหลดสาขาไม่สำเร็จ");
    allowedBranches = Array.isArray(result.data) ? result.data : [];
    if (!allowedBranches.length) { select.innerHTML = '<option value="">ไม่พบสาขาที่ได้รับอนุญาต</option>'; select.disabled = true; return; }
    select.disabled = false;
    const remembered = localStorage.getItem(`temperatureCheckBranch:${getUserKey()}`) || result.currentBranchId || allowedBranches[0].branchId;
    select.innerHTML = allowedBranches.map(b => `<option value="${esc(b.branchId)}">${esc(b.name)}</option>`).join("");
    select.value = allowedBranches.some(b => b.branchId === remembered) ? remembered : allowedBranches[0].branchId;
    if (select.value !== result.currentBranchId) await setBranch(select.value, false);
  } catch (error) {
    select.innerHTML = '<option value="">โหลดสาขาไม่สำเร็จ</option>'; select.disabled = true;
    showMessage("tcReportMessage", error.message || "โหลดสาขาไม่สำเร็จ", true);
  }
}
function getUserKey() { return window.Auth?.getCurrentUser?.()?.userId || window.Auth?.getCurrentUser?.()?.username || "user"; }
async function setBranch(branchId, notify=true) {
  const response = await fetch("/api/branches/selection", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({branchId}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.message || "ไม่มีสิทธิ์เลือกสาขานี้");
  localStorage.setItem(`temperatureCheckBranch:${getUserKey()}`, branchId);
  if (notify) await loadReport();
}
async function changeBranch() {
  const select = $("tcBranchLabel");
  if (!select?.value || !allowedBranches.some(b => b.branchId === select.value)) return;
  select.disabled = true;
  try { await setBranch(select.value, true); }
  catch (error) { showMessage("tcReportMessage", error.message || "เปลี่ยนสาขาไม่สำเร็จ", true); await loadAllowedBranches(); }
  finally { select.disabled = false; }
}

function updateUnit() {
  const type = $("tcType")?.value || "fridge";
  if ($("tcUnit")) $("tcUnit").textContent = TYPES[type]?.unit || "°C";
}
async function saveForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.type = String(data.type || "");
  data.value = Number(data.value);
  data.source = "FORM";
  if (!Number.isFinite(data.value)) return showMessage("tcFormMessage", "กรุณากรอกค่าที่วัดได้เป็นตัวเลข", true);
  try {
    const btn = $("tcSaveBtn"); btn.disabled = true; btn.textContent = "กำลังบันทึก...";
    const response = await fetch(API, { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
    showMessage("tcFormMessage", `บันทึกข้อมูลสำเร็จ${result.data?.status === "OUT_OF_RANGE" ? " — ค่าที่บันทึกเกินเกณฑ์ โปรดแจ้งผู้รับผิดชอบ" : ""}`);
    form.reset();
    $("tcDate").value = localDate(new Date());
    updateUnit();
    await loadReport();
  } catch (error) {
    showMessage("tcFormMessage", error.message || "บันทึกข้อมูลไม่สำเร็จ", true);
  } finally {
    const btn = $("tcSaveBtn"); if (btn) { btn.disabled = false; btn.textContent = "บันทึกข้อมูล"; }
  }
}
async function loadReport() {
  const month = $("tcMonth")?.value;
  if (!month) return;
  $("tcReport").innerHTML = '<div class="tc-empty">กำลังโหลดรายงาน...</div>';
  try {
    const response = await fetch(`${API}?month=${encodeURIComponent(month)}`, {credentials:"same-origin"});
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
    records = result.data || [];
    renderReport();
    showMessage("tcReportMessage", `โหลดข้อมูล ${records.length} รายการเรียบร้อย`);
  } catch (error) {
    $("tcReport").innerHTML = '<div class="tc-empty tc-error">ไม่สามารถโหลดรายงานได้</div>';
    showMessage("tcReportMessage", error.message || "โหลดรายงานไม่สำเร็จ", true);
  }
}
function isInRange(type, value) {
  const t = TYPES[type]; return !!t && Number.isFinite(Number(value)) && Number(value) >= t.min && Number(value) <= t.max;
}
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function normalizeDate(value) {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Sheets formatted date: M/D/YYYY or MM/DD/YYYY.
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(Number(m[1])).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
  return raw.slice(0, 10);
}
function normalizeTime(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  const match = raw.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) return raw;
  let hour = Number(match[1]);
  const minute = match[2];
  const ampm = match[3];
  if (ampm === "AM" && hour === 12) hour = 0;
  if (ampm === "PM" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}
function renderReport() {
  const month = $("tcMonth")?.value || "";
  const [year, mm] = month.split("-").map(Number);
  if (!year || !mm) return;
  const days = new Date(year, mm, 0).getDate();
  const branchSelect = $("tcBranchLabel");
  const branch = branchSelect?.selectedOptions?.[0]?.textContent?.trim() || "................................";
  const lookup = new Map();
  records.forEach(r => lookup.set(`${normalizeDate(r.DATE)}|${normalizeTime(r.TIME)}|${String(r.TYPE).trim().toLowerCase()}`, r));
  const sections = ["freezer","fridge","room","humidity"];
  let html = `<div class="tc-print-title"><b>แบบบันทึกการควบคุมอุณหภูมิและความชื้น</b><span>สาขา ${esc(branch)} &nbsp; ประจำเดือน ${String(mm).padStart(2,"0")}/${year}</span></div>`;
  sections.forEach(type => {
    const t = TYPES[type];
    html += `<section class="tc-chart-section"><div class="tc-chart-title"><strong>${esc(t.label)}</strong><span>เกณฑ์: ${esc(t.range)} · บันทึกวันละ 2 ครั้ง 09:00 และ 16:00 น.</span></div>`;
    html += `<div class="tc-table-scroll"><table class="tc-month-table"><thead><tr><th class="tc-row-label">วันที่</th>`;
    for (let d=1; d<=days; d++) html += `<th colspan="2">${d}</th>`;
    html += `</tr><tr><th class="tc-row-label">เวลา</th>`;
    for (let d=1; d<=days; d++) html += `<th>9</th><th>16</th>`;
    html += `</tr></thead><tbody><tr><th class="tc-row-label">ค่าที่วัดได้</th>`;
    for (let d=1; d<=days; d++) {
      const date = `${year}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      ["09:00","16:00"].forEach(time => {
        const r = lookup.get(`${date}|${time}|${type}`);
        const val = r ? Number(r.VALUE) : null;
        const ok = r && isInRange(type, val);
        html += `<td class="${r ? (ok ? "tc-cell-ok" : "tc-cell-alert") : "tc-cell-empty"}" title="${r ? `แหล่งข้อมูล: ${esc(r.SOURCE)}${r.REMARK ? ` | ${esc(r.REMARK)}` : ""}` : "ยังไม่มีข้อมูล"}">${r ? esc(val) : ""}${r && !ok ? '<small>แจ้ง</small>' : ""}</td>`;
      });
    }
    html += `</tr><tr class="tc-recorder-row"><th class="tc-row-label">ตรวจ/ผู้บันทึก</th>`;
    for (let d=1; d<=days; d++) {
      const date = `${year}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dayRecords = records.filter(r => normalizeDate(r.DATE) === date);
      const recorderRecord = dayRecords.find(r => String(r.USER || r.RECORDER || r.RECORDED_BY || r.USER_NAME || "").trim());
      const recorder = recorderRecord ? String(recorderRecord.USER || recorderRecord.RECORDER || recorderRecord.RECORDED_BY || recorderRecord.USER_NAME).trim() : "";
      html += `<td colspan="2" class="tc-recorder-cell" title="${recorder ? `ผู้บันทึก: ${esc(recorder)}` : "ยังไม่มีข้อมูลผู้บันทึก"}">${recorder ? `<button type="button" class="tc-recorder-button" data-recorder="${esc(recorder)}" data-recorder-date="${date}" aria-label="ดูผู้บันทึกวันที่ ${d}">👤 <span>${esc(recorder)}</span></button>` : '<span class="tc-recorder-empty">—</span>'}</td>`;
    }
    html += `</tr></tbody></table></div>`;
    html += buildGraph(type, year, mm, days, lookup);
    html += `</section>`;
  });
  $("tcReport").innerHTML = html;
  $("tcReport").querySelectorAll(".tc-recorder-button").forEach(button => {
    button.addEventListener("click", () => {
      const date = button.dataset.recorderDate || "";
      const name = button.dataset.recorder || "";
      window.alert(`วันที่: ${date}\nผู้ตรวจ/ผู้บันทึก: ${name}`);
    });
  });
}

function buildGraph(type, year, month, days, lookup) {
  const ranges = {
    freezer: {min:-26,max:-14,ticks:[-26,-25,-24,-23,-22,-21,-20,-19,-18,-17,-16,-15,-14], limits:[-25,-15]},
    fridge: {min:-2,max:10,ticks:[-2,-1,0,1,2,3,4,5,6,7,8,9,10], limits:[2,8]},
    room: {min:19,max:31,ticks:[20,21,22,23,24,25,26,27,28,29,30], limits:[null,30]},
    humidity: {min:0,max:100,ticks:[0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100], limits:[null,70]}
  }[type];
  const W=1200,H=250,L=48,R=12,T=12,B=27,plotW=W-L-R,plotH=H-T-B;
  const x=i=>L+(i/(days*2-1))*plotW, y=v=>T+((ranges.max-v)/(ranges.max-ranges.min))*plotH;
  let svg=`<div class="tc-graph"><div class="tc-graph-heading">กราฟแสดงการควบคุม${type==='humidity'?'ความชื้นสัมพัทธ์':'อุณหภูมิ'} <small>จุดสีน้ำเงิน 09:00 น. · จุดสีแดง 16:00 น. · เส้นประแสดงเกณฑ์ควบคุม</small></div><svg class="tc-month-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟรายเดือน ${type}">`;
  ranges.ticks.forEach(v=>{svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#d8e0e3" stroke-width="1"/><text x="${L-7}" y="${y(v)+3}" text-anchor="end" font-size="9" fill="#43565d">${v}</text>`;});
  for(let d=1;d<=days;d++){const xx=x((d-1)*2);svg+=`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${H-B}" stroke="#aab8bd" stroke-width=".8"/><text x="${xx}" y="${H-9}" text-anchor="middle" font-size="8" fill="#43565d">${d}</text>`;}
  (ranges.limits||[]).filter(v=>v!==null).forEach(v=>{svg+=`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#dc2626" stroke-width="2" stroke-dasharray="7 4"/><text x="${W-R-4}" y="${y(v)-3}" text-anchor="end" font-size="9" fill="#b91c1c">เกณฑ์ ${v}</text>`;});
  // เก็บข้อมูลแยกตามรอบเวลา เพื่อไม่ให้เส้น 09:00 เชื่อมกับ 16:00
  const timeSeries = {
    "09:00": [],
    "16:00": []
  };
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    ["09:00", "16:00"].forEach((time, j) => {
      const r = lookup.get(`${date}|${time}|${type}`);
      if (r && String(r.VALUE ?? "").trim() !== "" && Number.isFinite(Number(r.VALUE))) {
        timeSeries[time].push({ day: d, i: (d - 1) * 2 + j, v: Number(r.VALUE), time });
      } else {
        timeSeries[time].push(null);
      }
    });
  }
  const seriesColors = { "09:00": "#2563eb", "16:00": "#dc2626" };
  Object.entries(timeSeries).forEach(([time, points]) => {
    let segment = [];
    const flush = () => {
      if (segment.length > 1) {
        svg += `<polyline points="${segment.map(p => `${x(p.i)},${y(p.v)}`).join(" ")}" fill="none" stroke="${seriesColors[time]}" stroke-width="2" stroke-linejoin="round"/>`;
      }
      segment = [];
    };
    points.forEach(p => {
      if (!p) { flush(); return; }
      segment.push(p);
    });
    flush();
    points.forEach(p => {
      if (!p) return;
      svg += `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="3.2" fill="${seriesColors[time]}" stroke="#fff" stroke-width="1"><title>วันที่ ${p.day} เวลา ${time} ค่า ${p.v}</title></circle>`;
    });
  });
  svg+=`</svg><div class="tc-graph-axis-note">วันที่ในเดือน · จุดสีน้ำเงิน = 09:00 น. · จุดสีแดง = 16:00 น.</div></div>`; return svg;
}

function showMessage(id, text, error=false) {
  const el = $(id); if (!el) return;
  el.textContent = text; el.classList.toggle("is-error", !!error); el.classList.add("is-visible");
}
