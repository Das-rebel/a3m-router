"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logChange = logChange;
exports.getPendingReviews = getPendingReviews;
exports.formatPendingReviews = formatPendingReviews;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const HOME = process.env.HOME || '/tmp';
const LOG_DIR = path.join(HOME, '.a3m-router');
const LOG_FILE = path.join(LOG_DIR, 'change-log.ndjson');
function logChange(summary, reviewWindowDays = 7) {
    try {
        if (!fs.existsSync(LOG_DIR))
            fs.mkdirSync(LOG_DIR, { recursive: true });
        const id = `chg_${Date.now()}`;
        const now = new Date();
        const reviewAfter = new Date(now.getTime() + reviewWindowDays * 24 * 60 * 60 * 1000);
        const entry = { id, timestamp: now.toISOString(), summary, reviewAfter: reviewAfter.toISOString(), reviewWindow: `${reviewWindowDays}d`, reviewed: false };
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
        return id;
    }
    catch {
        return '';
    }
}
function getPendingReviews() {
    const reviews = [];
    try {
        if (!fs.existsSync(LOG_FILE))
            return reviews;
        const now = new Date();
        for (const line of fs.readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean)) {
            try {
                const entry = JSON.parse(line);
                if (entry.reviewed)
                    continue;
                const reviewDate = new Date(entry.reviewAfter);
                const days = Math.floor((now.getTime() - reviewDate.getTime()) / (24 * 60 * 60 * 1000));
                reviews.push({ change: entry, status: days < 0 ? 'pending' : days < 3 ? 'ready' : 'overdue' });
            }
            catch { }
        }
    }
    catch { }
    return reviews;
}
function formatPendingReviews() {
    const reviews = getPendingReviews();
    if (reviews.length === 0)
        return '  ✅ No changes pending review.';
    let out = '';
    for (const r of reviews) {
        const icon = r.status === 'overdue' ? '🔴' : r.status === 'ready' ? '🟡' : '🟢';
        const days = Math.floor((Date.now() - new Date(r.change.reviewAfter).getTime()) / 86400000);
        out += `  ${icon} ${r.change.id} — ${r.change.summary}\n     Created: ${r.change.timestamp.slice(0, 10)} | Due: ${r.change.reviewAfter.slice(0, 10)} (${Math.abs(days)}d)\n`;
    }
    return out;
}
//# sourceMappingURL=changeWatch.js.map