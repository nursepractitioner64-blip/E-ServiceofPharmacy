const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractAnnualSequence,
  maxAnnualSequence,
  formatAnnualNumber,
  nextAnnualNumberFromValues
} = require('../src/utils/running/annual-number-format');

test('formats every identifier as PREFIXYYYYMM-XXXXX', () => {
  assert.equal(formatAnnualNumber('RCIN', 63, new Date('2026-09-15T12:00:00Z')), 'RCIN202609-00063');
  assert.equal(formatAnnualNumber('RCOUT', 64, new Date('2026-09-15T12:00:00Z')), 'RCOUT202609-00064');
  assert.equal(formatAnnualNumber('MOV', 65, new Date('2026-09-15T12:00:00Z')), 'MOV202609-00065');
});

test('continues the sequence across months in the same year', () => {
  const values = ['RCIN202609-00063', 'RCIN202608-00062', 'RCIN2026-00060'];
  assert.equal(nextAnnualNumberFromValues(values, 'RCIN', new Date('2026-10-15T12:00:00Z')), 'RCIN202610-00064');
});

test('resets sequence when year changes', () => {
  const values = ['RCIN202609-00063', 'RCIN202610-00064'];
  assert.equal(nextAnnualNumberFromValues(values, 'RCIN', new Date('2027-01-15T12:00:00Z')), 'RCIN202701-00001');
});

test('reads legacy prefix-year format to prevent duplicate sequence during current year', () => {
  assert.equal(extractAnnualSequence('RCIN2026-00063', 'RCIN', '2026'), 63);
  assert.equal(extractAnnualSequence('RCIN-202609-00063', 'RCIN', '2026'), 63);
});

test('supports modules whose legacy format had a hyphen after prefix', () => {
  assert.equal(extractAnnualSequence('EC-2026-00009', 'EC', '2026'), 9);
  assert.equal(extractAnnualSequence('CONTAINER-202609-00014', 'CONTAINER', '2026'), 14);
});

test('does not count previous-year sequence', () => {
  assert.equal(maxAnnualSequence(['RCIN202509-99999', 'RCIN202609-00007'], 'RCIN', '2026'), 7);
});
