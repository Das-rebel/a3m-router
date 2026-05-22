const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendExperimentRecord(record) {
  const evalDir = path.resolve(__dirname, '..');
  const experimentsPath = path.join(evalDir, 'experiments.jsonl');
  ensureDir(path.dirname(experimentsPath));

  const payload = {
    timestamp_utc: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || null,
    ...record
  };

  fs.appendFileSync(experimentsPath, JSON.stringify(payload) + '\n', 'utf8');
}

module.exports = {
  appendExperimentRecord
};
