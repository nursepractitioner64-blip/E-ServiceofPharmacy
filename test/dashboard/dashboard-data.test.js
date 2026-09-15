const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSystemDashboard } = require('../../src/modules/dashboard/summarydrug/dashboard.builder');

test('builds Emergency dashboard from INVENTORY_MASTER + INVENTORY_MOVEMENT', () => {
  const data = buildSystemDashboard({
    master: [
      { CODE: 'E1', NAME: 'Emergency A', UNIT: 'ชิ้น', REQUIRED: '5' },
      { CODE: 'E2', NAME: 'Emergency B', UNIT: 'กล่อง', REQUIRED: '2' }
    ],
    movements: [
      { TYPE: 'IN', CODE: 'E1', NAME: 'Emergency A', QTY: '5', LOT: 'L1', EXP: '2026-10-01' },
      { TYPE: 'OUT', CODE: 'E1', NAME: 'Emergency A', QTY: '1', LOT: 'L1', EXP: '2026-10-01' },
      { TYPE: 'IN', CODE: 'E2', NAME: 'Emergency B', QTY: '1', LOT: 'L2', EXP: '2027-01-01' }
    ],
    now: new Date('2026-09-16T00:00:00Z')
  });
  assert.equal(data.totalItems, 2);
  assert.equal(data.readyItems, 0);
  assert.equal(data.missingItems, 2);
  assert.equal(data.balance, 5);
  assert.equal(data.lowStock, 0);
  assert.equal(data.expiringItems, 1);
  assert.equal(data.balances.find(x => x.code === 'E1').balance, 4);
});

test('builds Controlled Drug dashboard from DRUG_MASTER + STOCK_MOVEMENT', () => {
  const data = buildSystemDashboard({
    master: [
      { CODE: 'C1', NAME: 'Controlled A', UNIT: 'เม็ด' },
      { CODE: 'C2', NAME: 'Controlled B', UNIT: 'ขวด' }
    ],
    movements: [
      { TYPE: 'IN', CODE: 'C1', NAME: 'Controlled A', QTY: '10', LOT: 'CL1', EXP: '2028-01-01' },
      { TYPE: 'OUT', CODE: 'C1', NAME: 'Controlled A', QTY: '3', LOT: 'CL1', EXP: '2028-01-01' },
      { TYPE: 'IN', CODE: 'C2', NAME: 'Controlled B', QTY: '2', LOT: 'CL2', EXP: '2026-11-01' }
    ],
    now: new Date('2026-09-16T00:00:00Z')
  });
  assert.equal(data.totalItems, 2);
  assert.equal(data.balance, 9);
  assert.equal(data.totalIn, 12);
  assert.equal(data.totalOut, 3);
  assert.equal(data.movementCount, 3);
  assert.equal(data.expiringItems, 1);
  assert.equal(data.balances.find(x => x.code === 'C1').balance, 7);
});

test('dashboard includes actionable alert counts and recent activity', () => {
  const data = buildSystemDashboard({
    master: [
      { CODE: 'E1', NAME: 'Emergency A', UNIT: 'ชิ้น', REQUIRED: '5' },
      { CODE: 'E2', NAME: 'Emergency B', UNIT: 'กล่อง', REQUIRED: '10' }
    ],
    movements: [
      { TYPE: 'IN', CODE: 'E1', NAME: 'Emergency A', QTY: '5', LOT: 'L1', EXP: '2026-10-01', DATE: '2026-09-15' },
      { TYPE: 'OUT', CODE: 'E1', NAME: 'Emergency A', QTY: '6', LOT: 'L1', EXP: '2026-10-01', DATE: '2026-09-16T12:00:00Z' },
      { TYPE: 'IN', CODE: 'E2', NAME: 'Emergency B', QTY: '2', LOT: 'L2', EXP: '2026-09-20', DATE: '2026-09-16T08:00:00Z' }
    ],
    now: new Date('2026-09-16T00:00:00Z')
  });
  assert.equal(data.alerts.missingItems, 2);
  assert.equal(data.alerts.negativeStock, 1);
  assert.equal(data.alerts.expiringLots, 2);
  assert.equal(data.recentMovements.length, 3);
  assert.equal(data.recentMovements[0].type, 'OUT');
});

test('controlled dashboard can build its item list from received-drug rows when DRUG_MASTER is empty', () => {
  const { buildSystemDashboard } = require('../../src/modules/dashboard/summarydrug/dashboard.builder');
  const data = buildSystemDashboard({
    master: [],
    movements: [
      { TYPE: 'IN', CODE: 'C9', NAME: 'Controlled Fallback', QTY: '5', UNIT: 'เม็ด', LOT: 'L9', EXP: '2028-01-01' }
    ],
    now: new Date('2026-09-16T00:00:00Z')
  });
  assert.equal(data.totalItems, 1);
  assert.equal(data.balances[0].code, 'C9');
  assert.equal(data.balances[0].balance, 5);
});
