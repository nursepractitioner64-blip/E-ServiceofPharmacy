'use strict';

console.log('🚨 Emergency Checklist Module Loaded');

const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

let state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  rows: [],
  changed: new Map(),
  loading: false,
  saving: false
};

const $ = id => document.getElementById(id);

function esc(value) {
  return String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function unwrap(json) {
  if (Array.isArray(json)) return json;
  return json?.data || json?.rows || [];
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {'Content-Type':'application/json', ...(options.headers || {})}
  });
  let json = {};
  try { json = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(json.message || json.error || `HTTP ${response.status}`);
  return json;
}

function setupFilters() {
  const month = $('monthSelect');
  const year = $('yearSelect');
  if (!month || !year) return;

  month.innerHTML = MONTHS_TH.map((name, i) => `<option value="${i+1}">${name}</option>`).join('');
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 2; y <= current + 1; y++) years.push(`<option value="${y}">${y}</option>`);
  year.innerHTML = years.join('');
  month.value = String(state.month);
  year.value = String(state.year);

  month.onchange = () => {
    state.month = Number(month.value);
    state.changed.clear();
    loadChecklist();
  };
  year.onchange = () => {
    state.year = Number(year.value);
    state.changed.clear();
    loadChecklist();
  };
}

function buildHeader() {
  const header = $('dailyHeaderRow') || document.querySelector('#dailyTable thead tr');
  if (!header) return;
  const days = daysInMonth(state.year, state.month);
  header.innerHTML = `
    <th class="fixed-code">CODE</th>
    <th class="fixed-name">NAME</th>
    <th class="fixed-unit">UNIT</th>
    <th class="fixed-req">REQ</th>
    ${Array.from({length: days}, (_, i) => `<th class="day-head">${i+1}</th>`).join('')}
  `;
}

function cellKey(code, day) {
  return `${code}|${state.year}-${String(state.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function cellValue(row, day) {
  const key = cellKey(row.code, day);
  if (state.changed.has(key)) return state.changed.get(key);
  return row.days?.[day] || null;
}

function renderRows() {
  const tbody = $('tbody');
  if (!tbody) return;
  buildHeader();

  const days = daysInMonth(state.year, state.month);
  if (!state.rows.length) {
    tbody.innerHTML = `<tr><td colspan="${4 + days}" class="empty-cell">ไม่พบรายการ Emergency</td></tr>`;
    updateSummary();
    return;
  }

  tbody.innerHTML = state.rows.map(row => {
    const dayCells = [];
    for (let day = 1; day <= days; day++) {
      const value = cellValue(row, day);
      const actual = value?.actual ?? value?.ACTUAL ?? '';
      const status = String(value?.status ?? value?.STATUS ?? '').toUpperCase();
      const cls = actual === '' ? '' : (status === 'PASS' || Number(actual) >= Number(row.req) ? 'cell-pass' : 'cell-warn');
      dayCells.push(`
        <td class="day-cell ${cls}" data-code="${esc(row.code)}" data-day="${day}">
          <input class="daily-input" type="number" min="0" step="1"
            inputmode="numeric" aria-label="${esc(row.code)} วันที่ ${day}"
            value="${actual === '' ? '' : esc(actual)}">
        </td>`);
    }
    return `<tr>
      <td class="fixed-code">${esc(row.code)}</td>
      <td class="fixed-name text-start">${esc(row.name)}</td>
      <td class="fixed-unit">${esc(row.unit)}</td>
      <td class="fixed-req">${esc(row.req)}</td>
      ${dayCells.join('')}
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.daily-input').forEach(input => {
    input.addEventListener('input', onCellInput);
    input.addEventListener('change', onCellInput);
  });
  updateSummary();
}

function onCellInput(event) {
  const input = event.currentTarget;
  const td = input.closest('.day-cell');
  if (!td) return;
  const code = td.dataset.code;
  const day = Number(td.dataset.day);
  const row = state.rows.find(r => r.code === code);
  if (!row) return;

  const actual = input.value === '' ? '' : Math.max(0, Number(input.value));
  const key = cellKey(code, day);
  state.changed.set(key, { code, day, name: row.name, unit: row.unit, req: row.req, actual, status: actual === '' ? '' : (actual >= row.req ? 'PASS' : 'FAIL') });

  td.classList.toggle('cell-pass', actual !== '' && actual >= row.req);
  td.classList.toggle('cell-warn', actual !== '' && actual < row.req);
  if (actual === '') td.classList.remove('cell-pass','cell-warn');
  updateSummary();
}

async function loadChecklist() {
  if (state.loading) return;
  state.loading = true;
  const tbody = $('tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="35" class="empty-cell">กำลังโหลดข้อมูล...</td></tr>`;
  try {
    const json = await api(`/api/dailycheck?month=${state.month}&year=${state.year}`);
    state.rows = unwrap(json);
    state.changed.clear();
    renderRows();
    const summary = json.summary || {};
    if ($('systemSummaryText')) $('systemSummaryText').textContent = `ตรวจแล้ว ${summary.checkedCells || 0} ช่อง จาก ${summary.totalCells || 0} ช่อง • รายการ ${state.rows.length} รายการ`;
  } catch (error) {
    console.error('❌ DAILY CHECK LOAD:', error);
    if (tbody) tbody.innerHTML = `<tr><td colspan="35" class="empty-cell error-cell">โหลดข้อมูลไม่สำเร็จ: ${esc(error.message)}</td></tr>`;
  } finally {
    state.loading = false;
  }
}

function getUser() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('currentUser') || '';
    if (!raw) return '';
    const user = JSON.parse(raw);
    return user.user || user.username || user.USER || user.name || user.displayName || '';
  } catch (_) { return ''; }
}

async function saveChecklist() {
  if (state.saving) return;
  const cells = [...state.changed.values()].filter(x => x.actual !== '');
  if (!cells.length) {
    window.Swal?.fire?.({icon:'info', title:'ยังไม่มีรายการตรวจ', text:'กรุณากรอกจำนวนอย่างน้อย 1 ช่อง'}) || alert('กรุณากรอกจำนวนอย่างน้อย 1 ช่อง');
    return;
  }

  state.saving = true;
  const button = $('saveChecklistBtn');
  const old = button?.innerHTML;
  if (button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...'; }

  try {
    const json = await api('/api/dailycheck', {
      method:'POST',
      body:JSON.stringify({ year:state.year, month:state.month, user:getUser(), cells })
    });
    state.changed.clear();
    await loadChecklist();
    const message = `บันทึก ${json.saved || cells.length} รายการแล้ว`;
    if (window.Swal?.fire) await Swal.fire({icon:'success', title:'บันทึกสำเร็จ', text:message, timer:1400, showConfirmButton:false});
    else alert(message);
  } catch (error) {
    console.error('❌ DAILY CHECK SAVE:', error);
    if (window.Swal?.fire) await Swal.fire({icon:'error', title:'บันทึกไม่สำเร็จ', text:error.message});
    else alert(`บันทึกไม่สำเร็จ: ${error.message}`);
  } finally {
    state.saving = false;
    if (button) { button.disabled = false; button.innerHTML = old; }
  }
}

function updateSummary() {
  const total = state.rows.length;
  let checked = 0, ready = 0, missing = 0;
  state.rows.forEach(row => {
    const today = row.days?.[new Date().getDate()];
    const actual = state.changed.get(cellKey(row.code, new Date().getDate()))?.actual ?? today?.actual ?? '';
    if (actual !== '') checked++;
    if (actual !== '' && Number(actual) >= Number(row.req)) ready++;
    if (actual !== '' && Number(actual) < Number(row.req)) missing++;
  });
  if ($('totalItems')) $('totalItems').textContent = total;
  if ($('readyItems')) $('readyItems').textContent = ready;
  if ($('missingItems')) $('missingItems').textContent = missing;
}

function bindNavigation() {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      if (typeof window.navigate === 'function') window.navigate(route);
      else if (typeof window.showModule === 'function') window.showModule(route);
    });
  });
}

export async function init() {
  console.log('🔥 EMERGENCY CHECK INIT V5');
  setupFilters();
  bindNavigation();
  $('saveChecklistBtn')?.addEventListener('click', saveChecklist);
  $('scanQrBtn')?.addEventListener('click', () => {
    if (typeof window.navigate === 'function') window.navigate('dailycheck');
    else alert('Scan QR ใช้ผ่านเมนู Daily Check');
  });
  await loadChecklist();
  console.log('✅ EMERGENCY CHECK READY V5');
}
