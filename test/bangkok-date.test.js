const test = require('node:test');
const assert = require('node:assert/strict');
const { getBangkokDateParts } = require('../src/utils/running/bangkok-date');

test('running-number calendar follows Asia/Bangkok at the year boundary', () => {
  const parts = getBangkokDateParts(new Date('2026-12-31T18:00:00.000Z'));
  assert.equal(parts.yyyy, '2027');
  assert.equal(parts.dateKey, '20270101');
});

test('running-number calendar returns the Gregorian year, month, and day', () => {
  const parts = getBangkokDateParts(new Date('2026-05-10T03:00:00.000Z'));
  assert.deepEqual(parts, { yyyy: '2026', mm: '05', dd: '10', year: 2026, month: 5, day: 10, dateKey: '20260510' });
});
