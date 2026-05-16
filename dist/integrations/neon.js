class NeonIntegration {
  constructor(connectionString) { this.connectionString = connectionString; }
  async query(sql) { return { action: 'query', sql: sql.slice(0, 50) }; }
  async branch(branchName) { return { action: 'branch', name: branchName }; }
}
module.exports = { NeonIntegration };
