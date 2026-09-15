const { getSheets } = require("../../../config/google");

const { buildSystemDashboard } = require('./dashboard.builder');

function toNumber(value) {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function readSheet(sheetName, range = "A:Z") {
  const sheets = await getSheets();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!${range}`
  });
  return result.data.values || [];
}

async function getSummary() {
  const [movementRows, masterRows] = await Promise.all([
    readSheet("STOCK_MOVEMENT", "A:O"),
    readSheet("DRUG_MASTER", "A:Z").catch(() => [])
  ]);

  const movements = movementRows.slice(1);
  const master = masterRows.slice(1);
  const masterCodes = new Set(master.map(r => String(r[0] || "").trim()).filter(Boolean));

  const balanceByCode = new Map();
  const nameByCode = new Map();
  let totalIn = 0;
  let totalOut = 0;
  let movementCount = 0;

  for (const r of movements) {
    const type = String(r[1] || "").trim().toUpperCase();
    const code = String(r[4] || "").trim();
    const name = String(r[5] || "").trim();
    const qty = toNumber(r[6]);
    if (!code) continue;

    movementCount++;
    if (name) nameByCode.set(code, name);
    if (!balanceByCode.has(code)) balanceByCode.set(code, 0);

    if (type === "IN") {
      totalIn += qty;
      balanceByCode.set(code, balanceByCode.get(code) + qty);
    } else if (type === "OUT") {
      totalOut += qty;
      balanceByCode.set(code, balanceByCode.get(code) - qty);
    }
  }

  const balances = [...balanceByCode.entries()].map(([code, balance]) => ({
    code,
    name: nameByCode.get(code) || "",
    balance
  }));

  const lowStock = balances.filter(x => x.balance <= 0).length;

  const expiringLots = movements
    .map(r => ({
      code: String(r[4] || "").trim(),
      name: String(r[5] || "").trim(),
      lot: String(r[8] || "").trim(),
      exp: String(r[9] || "").trim(),
      qty: toNumber(r[6]),
      type: String(r[1] || "").trim().toUpperCase()
    }))
    .filter(x => x.code && x.exp && x.type === "IN")
    .map(x => ({ ...x, date: normalizeDate(x.exp) }))
    .filter(x => x.date)
    .sort((a, b) => a.date - b.date)
    .slice(0, 10)
    .map(x => ({ ...x, exp: x.date.toISOString().slice(0, 10) }));

  return {
    cards: {
      masterCount: masterCodes.size || balances.length,
      movementCount,
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      lowStock,
      negativeStock: balances.filter(x => x.balance < 0).length
    },
    balances: balances.sort((a, b) => a.code.localeCompare(b.code)),
    expiringLots
  };
}


async function getSystemDashboard() {
  const [emergencyMaster, emergencyMovements, controlledMaster, controlledReceive, controlledMovements] = await Promise.all([
    readSheet('INVENTORY_MASTER', 'A:D').catch(() => []),
    readSheet('INVENTORY_MOVEMENT', 'A:O').catch(() => []),
    readSheet('DRUG_MASTER', 'A:Z').catch(() => []),
    readSheet('DRUG_RECEIVE', 'A:Z').catch(() => []),
    readSheet('STOCK_MOVEMENT', 'A:O').catch(() => [])
  ]);

  const controlledMasterRows = controlledMaster.length > 1
    ? controlledMaster.slice(1)
    : controlledReceive.slice(1);

  return {
    emergency: buildSystemDashboard({ master: emergencyMaster.slice(1), movements: emergencyMovements.slice(1) }),
    controlled: buildSystemDashboard({ master: controlledMasterRows, movements: controlledMovements.slice(1) }),
    generatedAt: new Date().toISOString()
  };
}

module.exports = { getSummary, getSystemDashboard, buildSystemDashboard };
