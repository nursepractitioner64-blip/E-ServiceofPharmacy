const runningService = require("./running.service");

async function nextRunning(config) {
  return runningService.generate(config);
}

module.exports = { nextRunning };
