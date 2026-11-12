
const API = "/api/estockscan";
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

let scanner = null;
let scannerStarted = false;
let scanLocked = false;
let lastScanText = "";
let sessionId = "";
let branchId = "";
let userName = "";
let currentItem = null;
let items = [];
let seenIds = new Set();

const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

async function api(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    credentials: "same-origin",
    ...options,
    headers: { ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  const text = String(value).trim();
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${String(m[2]).padStart(2,"0")}/${String(m[3]).padStart(2,"0")}/${m[1]}`;
  return text;
}

async function createSession() {
  const data = await api("/session/new");
  sessionId = data.session_id;
  branchId = data.branch_id;
  userName = data.user?.full_name || data.user?.username || "-";
  $("sessionId").textContent = sessionId;
  $("branchName").textContent = branchId;
  $("userName").textContent = userName;
  renderInfo();
}

function renderInfo() {
  $("totalItems").textContent = String(items.length);
}

function renderPreview() {
  const host = $("preview");
  if (!currentItem) {
    host.innerHTML = '<div class="estockscan-session-empty">สแกน QR เพื่อเริ่มต้น</div>';
    return;
  }
  host.innerHTML = `
    <div class="estockscan-session-preview-card">
      <div class="estockscan-session-code">${esc(currentItem.code)}</div>
      <div class="estockscan-session-name">${esc(currentItem.name)}</div>
      <div class="estockscan-session-meta">LOT: ${esc(currentItem.lot || "-")} · EXP: ${esc(formatDate(currentItem.exp))}</div>
      <div class="estockscan-session-qty">
        <button type="button" id="previewMinus">−</button>
        <input id="previewQty" type="number" min="1" step="1" value="${Number(currentItem.qty || 1)}">
        <button type="button" id="previewPlus">+</button>
      </div>
      <button type="button" id="confirmItem" class="estockscan-session-confirm">ยืนยันรายการ</button>
      <button type="button" id="cancelPreview" class="estockscan-session-cancel">ยกเลิก</button>
    </div>`;
  $("previewMinus").onclick = () => {
    const input = $("previewQty"); input.value = Math.max(1, Number(input.value || 1) - 1);
  };
  $("previewPlus").onclick = () => {
    const input = $("previewQty"); input.value = Math.max(1, Number(input.value || 1) + 1);
  };
  $("confirmItem").onclick = confirmItem;
  $("cancelPreview").onclick = () => { currentItem = null; renderPreview(); };
}

function renderList() {
  const host = $("list");
  if (!items.length) {
    host.innerHTML = '<div class="estockscan-session-empty">ยังไม่มีรายการที่สแกน</div>';
    renderInfo();
    return;
  }
  host.innerHTML = items.map((item, index) => `
    <article class="estockscan-session-item">
      <div class="estockscan-session-item-main">
        <strong>${esc(item.code)}</strong>
        <span>${esc(item.name)}</span>
        <small>${esc(item.lot || "-")} | ${esc(formatDate(item.exp))}</small>
      </div>
      <div class="estockscan-session-item-qty">
        <button type="button" data-minus="${index}">−</button>
        <b>${Number(item.qty)}</b>
        <button type="button" data-plus="${index}">+</button>
      </div>
    </article>`).join("");
  host.querySelectorAll("[data-minus]").forEach(btn => btn.onclick = () => {
    const i = Number(btn.dataset.minus); items[i].qty = Math.max(1, items[i].qty - 1); renderList();
  });
  host.querySelectorAll("[data-plus]").forEach(btn => btn.onclick = () => {
    const i = Number(btn.dataset.plus); items[i].qty += 1; renderList();
  });
  renderInfo();
}

function confirmItem() {
  if (!currentItem) return;
  const qty = Number($("previewQty")?.value || 1);
  if (!Number.isInteger(qty) || qty < 1) {
    return Swal.fire({ icon: "warning", title: "จำนวนไม่ถูกต้อง", text: "กรุณาระบุจำนวนตั้งแต่ 1 ขึ้นไป" });
  }
  currentItem.qty = qty;
  items.push({ ...currentItem, session_id: sessionId, branch_id: branchId });
  seenIds.add(String(currentItem.movement_id).toUpperCase());
  currentItem = null;
  renderPreview();
  renderList();
  Swal.fire({ toast: true, position: "top", timer: 900, showConfirmButton: false, icon: "success", title: "เพิ่มรายการแล้ว" });
}

async function handleScan(decodedText) {
  if (scanLocked || decodedText === lastScanText) return;
  if (currentItem) {
    Swal.fire({ toast: true, position: "top", timer: 1200, showConfirmButton: false, icon: "info", title: "กรุณายืนยันรายการที่อ่านอยู่ก่อน" });
    return;
  }
  scanLocked = true;
  lastScanText = decodedText;
  try {
    const url = `/movement/${encodeURIComponent(decodedText)}?session_id=${encodeURIComponent(sessionId)}`;
    const result = await api(url);
    const item = result.data;
    const id = String(item.movement_id || "").toUpperCase();
    if (seenIds.has(id) || (currentItem && String(currentItem.movement_id).toUpperCase() === id)) {
      throw Object.assign(new Error("Sticker นี้ถูกสแกนใน SESSION นี้แล้ว ระบบไม่อนุญาตให้เพิ่มซ้ำ"), { code: "DUPLICATE_SCAN" });
    }
    beep.play().catch(() => {});
    currentItem = { ...item, qty: 1 };
    renderPreview();
  } catch (error) {
    if (error.code === "DUPLICATE_SCAN" || error.status === 409) {
      Swal.fire({ icon: "warning", title: "สแกนซ้ำ", text: error.message });
    } else {
      Swal.fire({ icon: "error", title: "อ่าน Sticker ไม่สำเร็จ", text: error.message });
    }
  } finally {
    setTimeout(() => { scanLocked = false; lastScanText = ""; }, 900);
  }
}

async function startScanner() {
  if (scannerStarted) return;
  if (!window.Html5Qrcode) throw new Error("ไม่พบไลบรารี QR Scanner");
  scanner = new Html5Qrcode("reader");
  await scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, 320), height: Math.min(h, 320) }) },
    handleScan
  );
  scannerStarted = true;
}

async function stopScanner() {
  if (!scanner) return;
  try {
    if (scannerStarted) await scanner.stop();
    await scanner.clear();
  } catch (error) {
    console.warn("SESSION scanner cleanup:", error);
  } finally {
    scanner = null;
    scannerStarted = false;
    scanLocked = false;
    lastScanText = "";
  }
}

async function completeSession() {
  if (!items.length) return Swal.fire({ icon: "warning", title: "ไม่มีรายการ", text: "กรุณาสแกน Sticker ก่อนบันทึก" });
  const confirm = await Swal.fire({
    icon: "question", title: "ยืนยันการบันทึก SESSION?",
    text: `จำนวน ${items.length} รายการ · สาขา ${branchId}`,
    showCancelButton: true, confirmButtonText: "บันทึกและสรุปผล", cancelButtonText: "กลับไปตรวจสอบ"
  });
  if (!confirm.isConfirmed) return;
  try {
    $("btnSendAll").disabled = true;
    await stopScanner();
    Swal.fire({ title: "กำลังบันทึก...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const result = await api("/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, items })
    });
    const pass = (result.result || []).filter(x => Number(x.diff) >= 0).length;
    const fail = (result.result || []).length - pass;
    await Swal.fire({
      icon: "success", title: "บันทึก SESSION สำเร็จ",
      html: `สาขา <b>${esc(branchId)}</b><br>บันทึกรายการใหม่ ${result.saved ?? 0} รายการ<br>ผ่าน ${pass} รายการ · ไม่ผ่าน ${fail} รายการ`,
      confirmButtonText: "เริ่ม SESSION ใหม่"
    });
    items = []; seenIds = new Set(); currentItem = null;
    await createSession();
    renderPreview(); renderList();
    await startScanner();
  } catch (error) {
    console.error("SESSION COMPLETE:", error);
    Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: error.message });
    if (!scannerStarted) {
      try { await startScanner(); } catch (cameraError) { console.error("SESSION CAMERA RESTART:", cameraError); }
    }
  } finally {
    $("btnSendAll").disabled = false;
  }
}

function resetSession() {
  if (!items.length && !currentItem) return;
  Swal.fire({
    icon: "warning", title: "เริ่มรอบใหม่?",
    text: "รายการที่ยังไม่บันทึกในหน้าจอนี้จะถูกล้าง",
    showCancelButton: true, confirmButtonText: "เริ่มใหม่", cancelButtonText: "ยกเลิก"
  }).then(result => {
    if (!result.isConfirmed) return;
    items = []; seenIds = new Set(); currentItem = null;
    renderPreview(); renderList();
  });
}

export async function init() {
  $("btnSendAll").onclick = completeSession;
  $("btnClear").onclick = resetSession;
  try {
    await createSession();
    renderPreview();
    renderList();
    await startScanner();
  } catch (error) {
    console.error("SESSION INIT:", error);
    Swal.fire({ icon: "error", title: "เปิด SESSION ไม่สำเร็จ", text: error.message });
  }
}

export async function destroy() {
  await stopScanner();
}
