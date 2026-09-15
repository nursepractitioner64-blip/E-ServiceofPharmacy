function toNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeMaster(rows) {
  return (rows || []).map(r => ({
    code: String(r.CODE ?? r.code ?? r[0] ?? '').trim(),
    name: String(r.NAME ?? r.name ?? r[1] ?? '').trim(),
    unit: String(r.UNIT ?? r.unit ?? r[2] ?? '').trim(),
    required: toNumber(r.REQUIRED ?? r.required ?? r[3])
  })).filter(x => x.code);
}

function normalizeMovement(rows) {
  return (rows || []).map(r => ({
    type: String(r.TYPE ?? r.type ?? r[1] ?? '').trim().toUpperCase(),
    code: String(r.CODE ?? r.code ?? r[4] ?? '').trim(),
    name: String(r.NAME ?? r.name ?? r[5] ?? '').trim(),
    unit: String(r.UNIT ?? r.unit ?? r[7] ?? '').trim(),
    qty: toNumber(r.QTY ?? r.qty ?? r[6]),
    lot: String(r.LOT ?? r.lot ?? r[8] ?? '').trim(),
    exp: String(r.EXP ?? r.exp ?? r[9] ?? '').trim(),
    date: String(r.DATE ?? r.date ?? r[3] ?? '').trim()
  })).filter(x => x.code);
}

function buildSystemDashboard({ master = [], movements = [], now = new Date(), expiryDays = 90 } = {}) {
  const items = normalizeMaster(master);
  const moves = normalizeMovement(movements);
  const movementItems = moves.map(x => ({ code: x.code, name: x.name, unit: x.unit, required: 0 }));
  const sourceItems = items.length ? items : movementItems.filter((item, index, arr) => arr.findIndex(x => x.code === item.code) === index);
  const balanceByCode = new Map(sourceItems.map(x => [x.code, 0]));
  const nameByCode = new Map(sourceItems.map(x => [x.code, x.name]));
  const unitByCode = new Map(sourceItems.map(x => [x.code, x.unit]));

  let totalIn = 0;
  let totalOut = 0;
  let movementCount = 0;

  for (const move of moves) {
    if (!balanceByCode.has(move.code)) balanceByCode.set(move.code, 0);
    if (move.name) nameByCode.set(move.code, move.name);
    movementCount++;
    if (move.type === 'IN') {
      totalIn += move.qty;
      balanceByCode.set(move.code, balanceByCode.get(move.code) + move.qty);
    } else if (move.type === 'OUT') {
      totalOut += move.qty;
      balanceByCode.set(move.code, balanceByCode.get(move.code) - move.qty);
    }
  }

  const balances = sourceItems.map(item => ({
    code: item.code,
    name: item.name || nameByCode.get(item.code) || '',
    unit: item.unit || unitByCode.get(item.code) || '',
    required: item.required,
    balance: balanceByCode.get(item.code) || 0,
    status: (balanceByCode.get(item.code) || 0) >= item.required ? 'READY' : 'LOW'
  }));

  const readyItems = balances.filter(x => x.balance >= x.required).length;
  const missingItems = balances.filter(x => x.balance < x.required).length;
  const lowStock = balances.filter(x => x.balance <= 0).length;
  const negativeStock = balances.filter(x => x.balance < 0).length;

  const cutoff = new Date(now.getTime() + expiryDays * 86400000);
  const expiringLots = moves
    .filter(x => x.type === 'IN' && x.lot && x.exp)
    .map(x => ({ ...x, expDate: parseDate(x.exp) }))
    .filter(x => x.expDate && x.expDate >= now && x.expDate <= cutoff)
    .sort((a, b) => a.expDate - b.expDate)
    .slice(0, 20)
    .map(x => ({
      code: x.code,
      name: x.name || nameByCode.get(x.code) || '',
      lot: x.lot,
      exp: x.expDate.toISOString().slice(0, 10),
      qty: x.qty,
      daysRemaining: Math.ceil((x.expDate - now) / 86400000)
    }));

  const recentMovements = moves
    .map((move, index) => ({
      ...move,
      _index: index,
      movementDate: parseDate(move.date)
    }))
    .sort((a, b) => {
      const at = a.movementDate ? a.movementDate.getTime() : 0;
      const bt = b.movementDate ? b.movementDate.getTime() : 0;
      return bt - at || b._index - a._index;
    })
    .slice(0, 10)
    .map(({ _index, movementDate, ...move }) => ({
      type: move.type,
      code: move.code,
      name: move.name || nameByCode.get(move.code) || '',
      qty: move.qty,
      lot: move.lot,
      exp: move.exp,
      date: move.date
    }));

  const expiredLots = moves
    .filter(x => x.type === 'IN' && x.lot && x.exp)
    .map(x => ({ ...x, expDate: parseDate(x.exp) }))
    .filter(x => x.expDate && x.expDate < now);

  const readinessPercent = sourceItems.length
    ? Math.round((readyItems / sourceItems.length) * 100)
    : 100;

  return {
    totalItems: sourceItems.length,
    readyItems,
    missingItems,
    expiringItems: expiringLots.length,
    expiredItems: expiredLots.length,
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
    movementCount,
    lowStock,
    negativeStock,
    readinessPercent,
    alerts: {
      missingItems,
      lowStock,
      negativeStock,
      expiringLots: expiringLots.length,
      expiredLots: expiredLots.length
    },
    balances: balances.sort((a, b) => a.code.localeCompare(b.code)),
    expiringLots,
    recentMovements
  };
}

module.exports = { buildSystemDashboard, normalizeMaster, normalizeMovement };
