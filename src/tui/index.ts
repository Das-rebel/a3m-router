#!/usr/bin/env node
/**
 * A3M Router TUI — Launch wrapper
 * 
 * Usage: npx a3m-router tui
 *        a3m-tui
 */

// Dynamic import for ESM/CJS compat
// eslint-disable-next-line @typescript-eslint/no-require-imports
import('../dist/tui/dashboard.js').catch(() => {
  // Fallback: try to require ts-node for dev mode
  try {
    // @ts-ignore - ts-node is only available in dev mode
    require('ts-node').register({ transpileOnly: true });
    // @ts-ignore - dev mode fallback
    require('./tui/dashboard');
  } catch {
    console.error('TUI requires build. Run: npm run build');
    console.error('   Then try: node dist/tui/dashboard.js');
    process.exit(1);
  }
});
