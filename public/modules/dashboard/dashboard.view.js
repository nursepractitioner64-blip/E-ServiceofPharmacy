function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}

function moneyNumber(value) {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

function renderSummary(data) {
  const cards = data.cards || {};
  const target = document.getElementById("summaryCards");
  if (!target) return;

  const items = [
    ["💊", "รายการยา", cards.masterCount || 0],
    ["📥", "รับเข้า", moneyNumber(cards.totalIn)],
    ["📤", "จ่ายออก", moneyNumber(cards.totalOut)],
    ["📦", "คงเหลือ", moneyNumber(cards.balance)],
    ["⚠️", "Stock ต่ำ/หมด", cards.lowStock || 0],
    ["🧾", "รายการเคลื่อนไหว", cards.movementCount || 0]
  ];

  target.innerHTML = items.map(([icon, label, value]) => `
    <div class="summary-card">
      <div class="summary-card-icon">${icon}</div>
      <div>
        <div class="summary-card-label">${esc(label)}</div>
        <div class="summary-card-value">${esc(value)}</div>
      </div>
    </div>
  `).join("");
}

function renderExpiring(data) {
  const rows = data.expiringLots || [];
  const host = document.getElementById("dashboardExpiring");
  if (!host) return;

  host.innerHTML = rows.length ? rows.map(x => `
    <tr>
      <td>${esc(x.code)}</td>
      <td>${esc(x.name)}</td>
      <td>${esc(x.lot)}</td>
      <td>${esc(x.exp)}</td>
      <td class="text-end">${esc(moneyNumber(x.qty))}</td>
    </tr>
  `).join("") : `<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
}

async function loadStock() {
  const target = document.getElementById("summaryCards");
  if (target) target.innerHTML = `<div class="loading-card">กำลังโหลดข้อมูล...</div>`;

  try {
    const res = await fetch("/api/dashboard/summary", { headers: { Accept: "application/json" } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);

    renderSummary(json.data);
    renderExpiring(json.data);
    console.log("✅ Dashboard loaded", json.data);
  } catch (err) {
    console.error("Dashboard load error:", err);
    if (target) {
      target.innerHTML = `<div class="loading-card error">❌ โหลด Dashboard ไม่สำเร็จ: ${esc(err.message)}</div>`;
    }
  }
}

export async function init() {
  await loadStock();
}

window.loadStock = loadStock;
