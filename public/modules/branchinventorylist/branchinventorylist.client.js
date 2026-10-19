'use strict';
import * as Auth from '../../assets/js/auth.client.js';
let alive = true;
let currentRole = 'STAFF';
let currentItems = [];
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}
function showMessage(text, type='ok') { const el=$('bil-message'); if(!el)return; el.className=`bil-message ${type}`; el.textContent=text; }
function setLoading(message='กำลังโหลด...') { const body=$('bil-rows'); if(body)body.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:30px;color:#64748b">${esc(message)}</td></tr>`; }
function renderItems(data, missing=[]) {
  currentItems = Array.isArray(data) ? data : [];
  const body = $('bil-rows'); if(!body)return;
  if (!currentItems.length) { body.innerHTML='<tr><td colspan="5" style="text-align:center;padding:30px;color:#64748b">ไม่พบรายการใน INVENTORY_MASTER กรุณาตรวจสอบ Master List</td></tr>'; }
  else body.innerHTML = currentItems.map(item => {
    const mandatory = Boolean(item.mandatory);
    const enabled = mandatory || Boolean(item.enabled);
    const missingMaster = Boolean(item.missingFromMaster);
    return `<tr data-code="${esc(item.code)}" class="${missingMaster ? 'bil-missing-master' : ''}">
      <td class="bil-code">${esc(item.code)}</td><td class="bil-name">${esc(item.name)}</td><td>${esc(item.unit)}</td>
      <td><input class="bil-qty" type="number" min="0" step="1" value="${esc(item.required)}" data-required="${esc(item.code)}" aria-label="จำนวนขั้นต่ำ ${esc(item.code)}"></td>
      <td>${missingMaster ? '<span class="bil-lock" style="color:#b45309"><i class="fa-solid fa-triangle-exclamation me-1"></i>ต้องเพิ่มใน Master</span>' : mandatory ? '<span class="bil-lock"><i class="fa-solid fa-lock me-1"></i>บังคับทุกสาขา</span>' : `<label class="bil-switch"><input type="checkbox" data-enabled="${esc(item.code)}" ${enabled?'checked':''}><span>เพิ่มในสาขานี้</span></label>`}</td>
    </tr>`;
  }).join('');
  const miss = $('bil-missing');
  if (miss) { if(missing.length){miss.hidden=false;miss.textContent=`คำเตือน: INVENTORY_MASTER ยังขาดรายการบังคับ ${missing.join(', ')} ระบบแสดงรายการที่ขาดไว้ให้เห็นแล้ว แต่ต้องเพิ่มชื่อและหน่วยใน Master List ก่อนตรวจจริง` ; } else {miss.hidden=true;miss.textContent='';} }
  if ($('bil-count')) $('bil-count').textContent = `พบ ${currentItems.length} รายการ · บังคับ ${currentItems.filter(x=>x.mandatory).length} · รายการเสริม ${currentItems.filter(x=>!x.mandatory&&x.enabled).length}`;
  if ($('bil-save')) $('bil-save').disabled = !$('bil-branch')?.value;
}
async function loadBranches() {
  const select = $('bil-branch'); if(!select)return;
  const result = await api('/api/branch-inventory-list/branches');
  const branches = result.data || [];
  currentRole = String(result.role || Auth.getCurrentUser()?.role || 'STAFF').toUpperCase();
  const last = localStorage.getItem(`bil_last_branch:${Auth.getCurrentUser()?.userId || Auth.getCurrentUser()?.username || 'user'}`) || '';
  const adminButton = document.querySelector('.bil-admin-only');
  if (adminButton) adminButton.hidden = currentRole !== 'ADMIN';
  select.innerHTML = '<option value="">-- เลือกสาขาที่ได้รับมอบหมาย --</option>' + branches.map(b=>`<option value="${esc(b.branchId)}">${esc(b.name)} (${esc(b.branchId)})</option>`).join('');
  const preferred = result.currentBranchId || last;
  if (branches.length) select.value = branches.some(b=>b.branchId===preferred) ? preferred : branches[0].branchId;
  if (currentRole !== 'ADMIN' && branches.length === 1) select.disabled = true;
  else select.disabled = false;
  const help = $('bil-scope-help');
  if (help) help.textContent = currentRole === 'ADMIN' ? 'Admin สามารถตั้งค่า Inventory List ได้ทุกสาขา' : 'Staff สามารถตั้งค่าได้เฉพาะสาขาที่ Admin มอบหมายให้บัญชีนี้ หากต้องการสาขาเพิ่ม กรุณาติดต่อ Admin';
  if (select.value) await loadList();
  else { setLoading('ไม่พบสาขาที่เปิดใช้งาน'); if($('bil-save'))$('bil-save').disabled=true; }
}
async function loadList() {
  const branchId = $('bil-branch')?.value || '';
  if (!branchId) { setLoading('กรุณาเลือกสาขา'); if($('bil-save'))$('bil-save').disabled=true; return; }
  localStorage.setItem(`bil_last_branch:${Auth.getCurrentUser()?.userId || Auth.getCurrentUser()?.username || 'user'}`, branchId);
  setLoading(); if($('bil-save'))$('bil-save').disabled=true;
  try {
    const result = await api(`/api/branch-inventory-list?branchId=${encodeURIComponent(branchId)}`);
    if(!alive)return;
    renderItems(result.data || [], result.missingMandatory || []);
    showMessage(`โหลด Inventory List ของสาขา ${result.branch?.name || branchId} สำเร็จ`,'ok');
  } catch(error) { setLoading(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`); showMessage(error.message,'err'); }
}
async function save() {
  const branchId = $('bil-branch')?.value || '';
  if(!branchId)return showMessage('กรุณาเลือกสาขา','err');
  const items = currentItems.map(item => {
    const qtyInput = document.querySelector(`[data-required="${CSS.escape(item.code)}"]`);
    const enabledInput = document.querySelector(`[data-enabled="${CSS.escape(item.code)}"]`);
    return { code: item.code, required: qtyInput ? Number(qtyInput.value) : Number(item.required), enabled: item.mandatory ? true : Boolean(enabledInput?.checked) };
  });
  const invalid = items.find(item => !Number.isInteger(item.required) || item.required < 0);
  if(invalid)return showMessage(`จำนวน REQUIRED ของ ${invalid.code} ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`,'err');
  const button=$('bil-save'); const old=button?.innerHTML; if(button){button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin me-1"></i> กำลังบันทึก...';}
  try {
    const result=await api('/api/branch-inventory-list',{method:'PUT',body:JSON.stringify({branchId,items})});
    if(!alive)return;
    const missing = result.data?.missingMandatory || [];
    await loadList();
    showMessage(`${result.message || 'บันทึกสำเร็จ'} · บันทึก ${result.data?.saved || 0} รายการ · เปิดใช้งาน ${result.data?.enabled || 0} รายการ${missing.length ? ` · คำเตือน: Master ขาดรายการบังคับ ${missing.join(', ')}` : ''}`, missing.length ? 'err' : 'ok');
  } catch(error) { showMessage(error.message,'err'); }
  finally { if(button){button.disabled=false;button.innerHTML=old;} }
}
export async function init() {
  alive=true;
  $('bil-branch')?.addEventListener('change',loadList);
  $('bil-reload')?.addEventListener('click',loadList);
  $('bil-save')?.addEventListener('click',save);
  try { await loadBranches(); } catch(error) { setLoading(`โหลดสาขาไม่สำเร็จ: ${error.message}`); showMessage(error.message,'err'); }
}
export function destroy() { alive=false; }
