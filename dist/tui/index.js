#!/usr/bin/env node
"use strict";
/**
 * A3M Router TUI — Launch wrapper
 *
 * Usage: npx a3m-router tui
 *        a3m-tui
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
// Dynamic import for ESM/CJS compat
Promise.resolve().then(() => __importStar(require('../dist/tui/dashboard.js'))).catch(() => {
    // Fallback: try to require ts-node for dev mode
    try {
        require('ts-node').register({ transpileOnly: true });
        require('./tui/dashboard');
    }
    catch {
        console.error('❌ TUI requires build. Run: npm run build');
        console.error('   Then try: node dist/tui/dashboard.js');
        process.exit(1);
    }
});
//# sourceMappingURL=index.js.map