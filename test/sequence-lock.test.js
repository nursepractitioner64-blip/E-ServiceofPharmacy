const test = require('node:test');
const assert = require('node:assert/strict');
const { withSequenceLock } = require('../src/utils/running/sequence-lock');

test('same sequence key serializes concurrent operations', async () => {
  const events = [];
  const work = (name, delay) => withSequenceLock('test-key', async () => {
    events.push(`${name}:start`);
    await new Promise(resolve => setTimeout(resolve, delay));
    events.push(`${name}:end`);
  });
  await Promise.all([work('a', 15), work('b', 1), work('c', 1)]);
  assert.deepEqual(events, ['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
});

test('a rejected operation does not block later sequence operations', async () => {
  await assert.rejects(withSequenceLock('recover-key', async () => { throw new Error('expected'); }), /expected/);
  const value = await withSequenceLock('recover-key', async () => 42);
  assert.equal(value, 42);
});
