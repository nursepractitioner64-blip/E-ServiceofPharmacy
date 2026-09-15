function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function num(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

let dashboardData = null;
let selectedSystem = 'emergency';

function systemTitle(system) {
  return system === 'emergency'
    ? { icon: '🚑', title: 'Emergency Check', subtitle: 'Emergency Stock Readiness Dashboard' }
    : { icon: '💊', title: 'Controlled Drug', subtitle: 'Controlled Drug Stock Dashboard' };
}

function render(data) {
  const d = data[selectedSystem] || {};
  const meta = systemTitle(selectedSystem);
  const header = document.getElementById('dashboardSystemTitle');
  const subtitle = document.getElementById('dashboardSystemSubtitle');
  if (header) header.innerHTML = `${meta.icon} ${meta.title}`;
  if (subtitle) subtitle.textContent = meta.subtitle;

  const cards = [
    ['📦', 'รายการทั้งหมด', num(d.totalItems)],
    ['✅', 'พร้อมใช้งาน', num(d.readyItems)],
    ['⚠️', 'ไม่ครบ / Stock ต่ำ', num(d.missingItems)],
    ['⏰', 'ใกล้หมดอายุ', num(d.expiringItems)],
    ['📥', 'รับเข้า', num(d.totalIn)],
    ['📤', 'จ่ายออก', num(d.totalOut)],
    ['📊', 'คงเหลือ', num(d.balance)],
    ['🧾', 'รายการเคลื่อนไหว', num(d.movementCount)]
  ];
  const host = document.getElementById('summaryCards');
  if (host) host.innerHTML = cards.map(([icon, label, value]) => `
    <div class="summary-card">
      <div class="summary-card-icon">${icon}</div>
      <div><div class="summary-card-label">${esc(label)}</div><div class="summary-card-value">${esc(value)}</div></div>
    </div>`).join('');

  const alertsHost = document.getElementById('dashboardAlerts');
  if (alertsHost) {
    const alerts = d.alerts || {};
    const alertCards = [
      ['⚠️', 'รายการไม่ครบ', alerts.missingItems || 0, 'warning'],
      ['⛔', 'Stock ติดลบ', alerts.negativeStock || 0, 'danger'],
      ['📉', 'Stock ต่ำ/หมด', alerts.lowStock || 0, 'info'],
      ['⏰', 'Lot ใกล้หมดอายุ', alerts.expiringLots || 0, 'warning'],
      ['🛑', 'Lot หมดอายุ', alerts.expiredLots || 0, 'danger']
    ];
    alertsHost.innerHTML = alertCards.map(([icon, label, value, tone]) => `
      <div class="dashboard-alert ${tone}">
        <span class="dashboard-alert-icon">${icon}</span>
        <div><div class="dashboard-alert-label">${esc(label)}</div><strong>${num(value)}</strong></div>
      </div>`).join('');
  }

  const balanceHost = document.getElementById('dashboardBalances');
  const balances = d.balances || [];
  if (balanceHost) balanceHost.innerHTML = balances.length ? balances.map(x => `
    <tr>
      <td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(x.unit)}</td>
      <td class="text-end">${num(x.required)}</td><td class="text-end">${num(x.balance)}</td>
      <td><span class="status-badge ${x.status === 'READY' ? 'ready' : 'low'}">${x.status === 'READY' ? 'พร้อม' : 'ไม่ครบ'}</span></td>
    </tr>`).join('') : `<tr><td colspan="6" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;

  const recentHost = document.getElementById('dashboardRecent');
  const recent = d.recentMovements || [];
  if (recentHost) recentHost.innerHTML = recent.length ? recent.map(x => `
    <tr>
      <td>${esc(x.date || '-')}</td>
      <td><span class="movement-badge ${x.type === 'IN' ? 'in' : 'out'}">${esc(x.type)}</span></td>
      <td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(x.lot || '-')}</td>
      <td class="text-end">${num(x.qty)}</td>
    </tr>`).join('') : `<tr><td colspan="6" class="text-center text-muted">ยังไม่มีการเคลื่อนไหว</td></tr>`;

  const expHost = document.getElementById('dashboardExpiring');
  const expiring = d.expiringLots || [];
  if (expHost) expHost.innerHTML = expiring.length ? expiring.map(x => `
    <tr><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(x.lot)}</td><td>${esc(x.exp)}</td>
    <td class="text-end">${num(x.qty)}</td><td class="text-end">${num(x.daysRemaining)} วัน</td></tr>`).join('')
    : `<tr><td colspan="6" class="text-center text-muted">ไม่มีรายการใกล้หมดอายุใน 90 วัน</td></tr>`;

  document.querySelectorAll('[data-dashboard-system]').forEach(btn => btn.classList.toggle('active', btn.dataset.dashboardSystem === selectedSystem));
}

function renderV9SafetyPanel(data) {
  let host = document.getElementById('dashboardSafetyPanel');
  if (!host) {
    const alerts = document.getElementById('dashboardAlerts');
    if (!alerts || !alerts.parentElement) return;
    host = document.createElement('div');
    host.id = 'dashboardSafetyPanel';
    host.className = 'dashboard-table-card';
    alerts.parentElement.insertBefore(host, alerts.nextSibling);
  }

  const d=data||{};
  const e=d.emergency||{};
  const c=d.controlledDrug||{};
  const ef=e.failed||0;
  const neg=c.negative||0;

  host.innerHTML=`
    <div class="table-header"><h4>🛡️ Safety Status — Emergency + Controlled Drug</h4></div>
    <div class="summary-row" style="padding:16px">
      <div class="summary-card">
        <div class="summary-card-icon">🔎</div>
        <div><div class="summary-card-label">Emergency ตรวจแล้ว</div>
        <div class="summary-card-value">${num(e.checked||0)}</div></div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon">✅</div>
        <div><div class="summary-card-label">Emergency ผ่านล่าสุด</div>
        <div class="summary-card-value">${num(e.passed||0)}</div></div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon">⚠️</div>
        <div><div class="summary-card-label">Emergency ไม่ผ่าน</div>
        <div class="summary-card-value">${num(ef)}</div></div>
      </div>
      <div class="summary-card">
        <div class="summary-card-icon">💊</div>
        <div><div class="summary-card-label">Controlled Stock ติดลบ</div>
        <div class="summary-card-value">${num(neg)}</div></div>
      </div>
    </div>
    <div class="px-3 pb-3">
      ${ef ? `<div class="alert alert-danger mb-2">พบ Emergency ที่ผลตรวจล่าสุดไม่ผ่าน ${num(ef)} รายการ</div>` : `<div class="alert alert-success mb-2">Emergency ผลตรวจล่าสุดไม่มีรายการไม่ผ่าน</div>`}
      ${neg ? `<div class="alert alert-danger mb-0">พบ Controlled Drug ที่ Stock ติดลบ ${num(neg)} Lot</div>` : `<div class="alert alert-success mb-0">Controlled Drug ไม่มี Stock ติดลบ</div>`}
    </div>`;
}

async function loadDashboard() {
  const host = document.getElementById('summaryCards');
  if (host) host.innerHTML = '<div class="loading-card">กำลังโหลดข้อมูลจริงจาก Google Sheets...</div>';

  try {
    const [systemRes, unifiedRes] = await Promise.all([
      fetch(`/api/dashboard/system?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }),
      fetch(`/api/dashboard/unified?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }).catch(() => null)
    ]);

    const systemJson = await systemRes.json().catch(() => ({}));
    if (!systemRes.ok || !systemJson.success) {
      throw new Error(systemJson.message || `HTTP ${systemRes.status}`);
    }

    dashboardData = systemJson.data || {};

    // V9: enrich the existing dashboard with the unified safety status.
    if (unifiedRes && unifiedRes.ok) {
      const unifiedJson = await unifiedRes.json().catch(() => ({}));
      if (unifiedJson.success) {
        dashboardData.__unified = unifiedJson.data || {};
        const ue = dashboardData.__unified.emergency || {};
        const uc = dashboardData.__unified.controlledDrug || {};

        // Keep the existing dashboard schema intact; only override values
        // that are specifically available from the unified endpoint.
        if (dashboardData.emergency) {
          dashboardData.emergency.checkedItems = ue.checked || 0;
          dashboardData.emergency.checkPassed = ue.passed || 0;
          dashboardData.emergency.checkFailed = ue.failed || 0;
        }
        if (dashboardData.controlled) {
          dashboardData.controlled.negativeStock = uc.negative || 0;
          dashboardData.controlled.lotCount = uc.lots || 0;
        }
      }
    }

    render(dashboardData);
    renderV9SafetyPanel(dashboardData.__unified);
    console.log('✅ System Dashboard V9 loaded', dashboardData);
  } catch (err) {
    console.error('❌ System Dashboard error:', err);
    if (host) host.innerHTML = `<div class="loading-card">โหลด Dashboard ไม่สำเร็จ: ${esc(err.message)}</div>`;
  }
}

function bind() {
  document.querySelectorAll('[data-dashboard-system]').forEach(btn => btn.addEventListener('click', () => {
    selectedSystem = btn.dataset.dashboardSystem;
    if (dashboardData) render(dashboardData);
  }));
  document.getElementById('dashboardRefreshBtn')?.addEventListener('click', loadDashboard);
}

export async function init() {
  bind();
  await loadDashboard();
}

export function destroy() {
  dashboardData = null;
}

window.loadStock = loadDashboard;
