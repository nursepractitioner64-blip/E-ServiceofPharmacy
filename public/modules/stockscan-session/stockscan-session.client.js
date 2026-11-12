const API = '/api/stockscan/session';
let scanner = null;
let currentSession = null;
let currentPreview = null;
let pending = [];
let saved = [];
let closed = false;

const $ = id => document.getElementById(id);
const clean = value => String(value ?? '').trim();

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false || data.ok === false) {
    const error = new Error(data.message || data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

export async function init() {
  pending = [];
  saved = [];
  closed = false;
  bindEvents();
  setStatus('กำลังเตรียม SESSION...');
  try {
    const data = await request(`${API}/new`);
    currentSession = data.data || data;
    $('ss-session-id').textContent = currentSession.session_id || data.session_id || '-';
    $('ss-branch').textContent = currentSession.branch_id || data.branch_id || '-';
    $('ss-user').textContent = currentSession.user?.full_name || data.user?.full_name || '-';
    await loadSavedItems();
    setStatus('พร้อมสแกน QR / Barcode');
    updateButtons();
  } catch (error) {
    setStatus(error.message);
    if (window.Swal) Swal.fire({ icon: 'error', title: 'เริ่ม SESSION ไม่สำเร็จ', text: error.message });
  }
}

function bindEvents() {
  $('ss-start-camera')?.addEventListener('click', startCamera);
  $('ss-stop-camera')?.addEventListener('click', stopCamera);
  $('ss-save-items')?.addEventListener('click', savePending);
  $('ss-close-session')?.addEventListener('click', closeSession);
}

function setStatus(message) {
  const el = $('ss-scan-status');
  if (el) el.textContent = message;
}

async function startCamera() {
  if (scanner) return;
  if (!window.Html5Qrcode) {
    setStatus('โหลดระบบสแกนไม่สำเร็จ กรุณารีโหลดหน้า');
    return;
  }
  try {
    scanner = new Html5Qrcode('ss-reader');
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: (width, height) => ({ width: Math.min(width, 280), height: Math.min(height, 280) }) },
      onScan
    );
    $('ss-start-camera').disabled = true;
    $('ss-stop-camera').disabled = false;
    setStatus('กล้องพร้อมใช้งาน — สแกน QR Code ของรายการ');
  } catch (error) {
    scanner = null;
    setStatus(error.message || 'ไม่สามารถเปิดกล้องได้');
    if (window.Swal) Swal.fire({ icon: 'error', title: 'เปิดกล้องไม่ได้', text: error.message || 'กรุณาอนุญาตการใช้กล้อง และเปิดผ่าน HTTPS' });
  }
}

async function stopCamera() {
  if (scanner) {
    try { await scanner.stop(); await scanner.clear(); } catch (error) { console.warn('Scanner stop:', error); }
    scanner = null;
  }
  if ($('ss-start-camera')) $('ss-start-camera').disabled = false;
  if ($('ss-stop-camera')) $('ss-stop-camera').disabled = true;
}

let scanBusy = false;
async function onScan(decodedText) {
  if (scanBusy || closed) return;
  scanBusy = true;
  try {
    const data = await request(`${API}/movement/${encodeURIComponent(decodedText)}`);
    const item = data.data;
    const movementId = clean(item?.movement_id);
    if (!movementId) throw new Error('QR นี้ไม่มี MOVEMENT_ID');
    const duplicate = saved.some(row => clean(row.movement_id) === movementId)
      || pending.some(row => clean(row.movement_id) === movementId)
      || clean(currentPreview?.movement_id) === movementId;
    if (duplicate) {
      setStatus(`ปฏิเสธรายการซ้ำ: ${movementId}`);
      if (window.Swal) Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'สแกนรายการนี้แล้ว', text: movementId, timer: 1800, showConfirmButton: false });
      return;
    }
    currentPreview = { ...item, qty: 1 };
    renderPreview();
    setStatus(`พบรายการ ${item.code || ''} — ตรวจสอบข้อมูลก่อนเพิ่มรายการ`);
  } catch (error) {
    setStatus(error.message);
    if (window.Swal) Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'ไม่สามารถนำเข้ารายการ', text: error.message, timer: 2200, showConfirmButton: false });
  } finally {
    setTimeout(() => { scanBusy = false; }, 850);
  }
}

function renderPreview() {
  const el = $('ss-preview');
  if (!currentPreview) {
    el.className = 'stockscan-preview empty';
    el.textContent = 'ยังไม่มีรายการใหม่ที่รอยืนยัน';
    return;
  }
  el.className = 'stockscan-preview';
  el.innerHTML = `
    <strong>${escapeHtml(currentPreview.code)} · ${escapeHtml(currentPreview.name)}</strong>
    <div class="ss-sub">MOVEMENT: ${escapeHtml(currentPreview.movement_id)} | LOT: ${escapeHtml(currentPreview.lot || '-')} | EXP: ${escapeHtml(currentPreview.exp || '-')}</div>
    <div class="stockscan-qty"><label for="ss-preview-qty">จำนวนที่ตรวจนับ</label><input id="ss-preview-qty" type="number" min="1" step="1" value="1"><button id="ss-add-preview" class="ss-btn ss-primary" type="button">เพิ่มรายการ</button><button id="ss-cancel-preview" class="ss-btn ss-light" type="button">ยกเลิก</button></div>`;
  $('ss-add-preview').addEventListener('click', () => {
    const qty = Number($('ss-preview-qty').value);
    if (!Number.isFinite(qty) || qty <= 0) return setStatus('จำนวนต้องมากกว่า 0');
    if (saved.some(row => row.movement_id === currentPreview.movement_id) || pending.some(row => row.movement_id === currentPreview.movement_id)) {
      currentPreview = null; renderPreview(); return setStatus('รายการนี้ถูกสแกนแล้ว ระบบไม่บันทึกซ้ำ');
    }
    pending.push({ movement_id: currentPreview.movement_id, code: currentPreview.code, name: currentPreview.name, qty });
    currentPreview = null;
    renderPreview(); renderPending(); updateButtons();
  });
  $('ss-cancel-preview').addEventListener('click', () => { currentPreview = null; renderPreview(); });
}

function renderPending() {
  const el = $('ss-pending-list');
  el.innerHTML = pending.map((item, index) => `
    <div class="stockscan-pending-row"><span><strong>${escapeHtml(item.code)}</strong> <small>${escapeHtml(item.name)}</small></span><span>${item.qty} <button type="button" data-remove-pending="${index}" aria-label="ลบรายการ">×</button></span></div>
  `).join('');
  el.querySelectorAll('[data-remove-pending]').forEach(button => button.addEventListener('click', () => {
    pending.splice(Number(button.dataset.removePending), 1); renderPending(); updateButtons();
  }));
}

function renderSaved() {
  const body = $('ss-saved-rows');
  if (!saved.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-cell">ยังไม่มีรายการที่บันทึก</td></tr>';
    return;
  }
  body.innerHTML = saved.map(row => `<tr>
    <td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.movement_id)}</td>
    <td>${escapeHtml(row.lot || '-')}</td><td>${escapeHtml(row.exp || '-')}</td><td>${Number(row.qty || 0)}</td>
  </tr>`).join('');
}

async function loadSavedItems() {
  const id = encodeURIComponent(currentSession.session_id);
  const data = await request(`${API}/${id}/items`);
  saved = Array.isArray(data.data) ? data.data : [];
  renderSaved();
}

async function savePending() {
  if (!pending.length || !currentSession || closed) return;
  const items = pending.map(item => ({ movement_id: item.movement_id, qty: item.qty }));
  $('ss-save-items').disabled = true;
  try {
    await request(`${API}/${encodeURIComponent(currentSession.session_id)}/count`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items })
    });
    pending = [];
    renderPending();
    await loadSavedItems();
    setStatus('บันทึกรายการสแกนเรียบร้อย');
    if (window.Swal) Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'นำรายการเข้าสู่ COUNT_SESSION แล้ว', timer: 1500, showConfirmButton: false });
  } catch (error) {
    setStatus(error.message);
    if (window.Swal) Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message });
  } finally { updateButtons(); }
}

async function closeSession() {
  if (!saved.length || pending.length || closed) {
    if (window.Swal) Swal.fire({ icon: 'warning', title: 'ยังปิด SESSION ไม่ได้', text: pending.length ? 'กรุณาบันทึกรายการที่รอยืนยันก่อน' : 'ยังไม่มีรายการที่บันทึกใน SESSION' });
    return;
  }
  const confirmed = window.Swal ? await Swal.fire({ icon: 'question', title: 'สรุปผลและปิด SESSION?', text: 'ระบบจะคำนวณ REQUIRED จาก INVENTORY_MASTER และสรุปแยกตามสาขา', showCancelButton: true, confirmButtonText: 'ยืนยันปิด SESSION', cancelButtonText: 'กลับไปตรวจสอบ' }) : { isConfirmed: window.confirm('ยืนยันปิด SESSION?') };
  if (!confirmed.isConfirmed) return;
  try {
    const data = await request(`${API}/${encodeURIComponent(currentSession.session_id)}/close`, { method: 'POST' });
    closed = true;
    renderResults(data.result || []);
    await stopCamera();
    setStatus('ปิด SESSION และบันทึก SESSION_RESULT สำเร็จ');
    updateButtons();
    if (window.Swal) Swal.fire({ icon: 'success', title: 'ปิด SESSION สำเร็จ', text: `บันทึกผล ${data.saved || 0} รายการ` });
  } catch (error) {
    if (window.Swal) Swal.fire({ icon: 'error', title: 'ปิด SESSION ไม่สำเร็จ', text: error.message });
    setStatus(error.message);
  }
}

function renderResults(rows) {
  $('ss-result-card').hidden = false;
  $('ss-result-rows').innerHTML = rows.map(row => {
    const diff = Number(row[4] || 0);
    const cls = diff < 0 ? 'stockscan-diff-minus' : diff > 0 ? 'stockscan-diff-plus' : 'stockscan-diff-zero';
    const status = diff < 0 ? 'ขาด' : diff > 0 ? 'เกิน' : 'ตรง';
    return `<tr><td>${escapeHtml(row[1])}</td><td>${Number(row[2] || 0)}</td><td>${Number(row[3] || 0)}</td><td class="${cls}">${diff > 0 ? '+' : ''}${diff}</td><td class="${cls}">${status}</td></tr>`;
  }).join('');
}

function updateButtons() {
  if ($('ss-save-items')) $('ss-save-items').disabled = !pending.length || closed;
  if ($('ss-close-session')) $('ss-close-session').disabled = !saved.length || pending.length > 0 || closed;
  if (closed) {
    $('ss-save-items').disabled = true;
    $('ss-close-session').disabled = true;
  }
}

export async function destroy() {
  await stopCamera();
  currentSession = null;
  currentPreview = null;
  pending = [];
  saved = [];
  closed = false;
}
