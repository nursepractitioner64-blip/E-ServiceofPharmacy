/* Serialize running-number generation inside one Node.js process. */
const queues = new Map();

function withSequenceLock(key, work) {
  const lockKey = String(key || 'default');
  const previous = queues.get(lockKey) || Promise.resolve();
  const current = previous.catch(() => {}).then(work);
  queues.set(lockKey, current);
  return current.finally(() => {
    if (queues.get(lockKey) === current) queues.delete(lockKey);
  });
}

module.exports = { withSequenceLock };
