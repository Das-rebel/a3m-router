#!/usr/bin/env node
/**
 * A3M Router — Terminal ASCII Art Banner
 *
 * Printed on CLI startup to reinforce A3M branding.
 * Usage:
 *   node scripts/banner.js
 *   // or import './banner' in CLI entry point
 */

const A3M_BANNER = `
╔══════════════════════════════════════════════════════════╗
║                     ╔═╗╔═╗╔╗╔╔═╗                        ║
║                     ╠═╣║ ║║║║║ ║                        ║
║                     ╩ ╩╚═╝╝╚╝╚═╝                        ║
║                                                          ║
║            Parallel Multi-LLM Execution Engine           ║
║                                                          ║
║  47+ Providers  ·  Ensemble Voting  ·  62% Cost Savings  ║
║                                                          ║
║  ${'\x1b[2m'}https://github.com/Das-rebel/a3m-router${'\x1b[0m'}${' '.repeat(19)}║
╚══════════════════════════════════════════════════════════╝
`;

module.exports = A3M_BANNER;

if (require.main === module) {
  process.stdout.write(A3M_BANNER);
}
