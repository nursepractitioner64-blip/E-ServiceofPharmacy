'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCountItems,
  buildSessionResult,
  assertHeaders,
  REQUIRED_COUNT_HEADERS,
  REQUIRED_RESULT_HEADERS
} = require('../src/modules/stockscan-session/session.logic');

test('COUNT_SESSION schema accepts the agreed 8 fields and ignores legacy CART_ID', () => {
  assert.doesNotThrow(() => assertHeaders(
    [...REQUIRED_COUNT_HEADERS, 'CART_ID'],
    REQUIRED_COUNT_HEADERS,
    'COUNT_SESSION'
  ));
});

test('SESSION_RESULT schema remains exactly the agreed 6 required fields', () => {
  assert.doesNotThrow(() => assertHeaders(
    REQUIRED_RESULT_HEADERS,
    REQUIRED_RESULT_HEADERS,
    'SESSION_RESULT'
  ));
});

test('duplicate MOVEMENT_ID in one submitted batch is blocked', () => {
  assert.throws(() => validateCountItems([
    { movement_id: 'MV001', qty: 1 },
    { movement_id: 'MV001', qty: 1 }
  ]), /ซ้ำ/);
});

test('SESSION result is calculated per branch and code using INVENTORY_MASTER.REQUIRED', () => {
  const rows = buildSessionResult({
    sessionId: 'SS001',
    branchId: '41616',
    masterRows: [
      { CODE: 'MED001', REQUIRED: '10' },
      { CODE: 'MED002', REQUIRED: '5' }
    ],
    countRows: [
      { SESSION_ID: 'SS001', BRANCH_ID: '41616', CODE: 'MED001', QTY: '4' },
      { SESSION_ID: 'SS001', BRANCH_ID: '41616', CODE: 'MED001', QTY: '3' },
      { SESSION_ID: 'SS001', BRANCH_ID: '99999', CODE: 'MED001', QTY: '100' },
      { SESSION_ID: 'OTHER', BRANCH_ID: '41616', CODE: 'MED002', QTY: '100' }
    ]
  });
  assert.deepEqual(rows, [
    ['SS001', 'MED001', 10, 7, -3, '41616'],
    ['SS001', 'MED002', 5, 0, -5, '41616']
  ]);
});
